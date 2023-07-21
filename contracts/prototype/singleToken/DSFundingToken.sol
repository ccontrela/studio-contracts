// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "hardhat/console.sol";

error CapIsZero();
error CapExceeded();

error GoalIsZero();
error GoalExceeded();
error GoalUnreached();
error GoalReached();

error FundingClosed();
error FundingActive();

error PriceTooLow();

error ProofFailed();

error NotAdmin();
error NotMinter();

error FundTransferFailed();

error RevenueWithdrawn(uint256);

contract DSFundingToken is ERC20, AccessControl {
    // Constants
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public constant PLATFORM_FEE = 250; // 2.50%

    // Immutables
    uint256 public immutable tokenCap;
    uint256 public immutable fundingGoal;

    // Cast & Crew allowance
    bytes32 public reserveSnapshop;
    uint256 private _reserveAmount;
    uint256 private _reserveClaimed;

    // Withdrawal Address
    address public withdrawalAddress;
    address public platformAddress;

    // Token Price
    uint256 public tokenPrice;

    // Investor => Amount
    mapping(address => uint256) private _investments;

    // Revenue Round

    struct RevenueData {
        bytes32 snapshot;
        uint256 rate;
        // Account => withdrawn
        mapping(address => bool) withdrawn;
    }

    uint256 private _revenueRound;
    // RevenueRound => MerkleRoot
    mapping(uint256 => RevenueData) private _revenueRoundData;

    // Funding status
    enum FundingStatus {
        OPEN,
        COMPLETE,
        FAILED
    }

    FundingStatus public fundingStatus = FundingStatus.OPEN;

    // Events
    event TokenPriceChange(uint256 weiAmount);
    event FundingComplete();
    event FundingFailed();
    event RevenueRoundAdded(uint256 round, uint256 revenue);
    event RevenueRoundWithdrawn(
        address account,
        uint256 round,
        uint256 revenue
    );

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 tokenPrice_,
        uint256 tokenCap_,
        uint256 fundingGoal_
    ) ERC20(name_, symbol_) {
        if (tokenCap_ == 0) revert CapIsZero();
        if (fundingGoal_ == 0) revert GoalIsZero();

        if (tokenPrice_ < (fundingGoal_ / tokenCap_) * (10**decimals()))
            revert PriceTooLow();

        tokenCap = tokenCap_;
        fundingGoal = fundingGoal_;
        tokenPrice = tokenPrice_;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    receive() external payable whenOpen {
        _addFunds(msg.sender, msg.value);
    }

    modifier isAdmin(address msgSender_) {
        bool hasAdminRole = hasRole(DEFAULT_ADMIN_ROLE, msgSender_);
        if (!hasAdminRole) revert NotAdmin();

        _;
    }

    modifier whenFunded() {
        bool isFunded = address(this).balance >= fundingGoal;
        if (!isFunded) revert GoalUnreached();

        _;
    }

    modifier whenOpen() {
        bool isFunded = address(this).balance > fundingGoal;
        if (isFunded || fundingStatus == FundingStatus.COMPLETE)
            revert GoalReached();
        if (fundingStatus != FundingStatus.OPEN) revert FundingClosed();

        _;
    }

    modifier whenComplete() {
        if (fundingStatus != FundingStatus.COMPLETE) revert GoalUnreached();

        _;
    }

    modifier whenFailed() {
        if (fundingStatus != FundingStatus.FAILED) revert FundingActive();

        _;
    }

    // Mint
    function mint(address account, uint256 amount)
        public
        onlyRole(MINTER_ROLE)
    {
        _mint(account, amount);
    }

    // Claim
    function claimReserve(
        bytes32[] calldata claimProof_,
        address account,
        uint256 amount
    ) public {
        bool proofVerified = MerkleProof.verify(
            claimProof_,
            reserveSnapshop,
            keccak256(abi.encodePacked(account, amount))
        );

        if (!proofVerified) revert ProofFailed();

        _reserveClaimed += amount;

        _mint(account, amount);
    }

    function setReserve(bytes32 reserveSnapshot_, uint256 reserveAmount_)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        reserveSnapshop = reserveSnapshot_;
        _reserveAmount = reserveAmount_;
    }

    // Funding
    function addFunds() external payable whenOpen {
        _addFunds(msg.sender, msg.value);
    }

    function removeFunds(address investor_)
        external
        payable
        whenOpen
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _removeFunds(investor_, msg.value);
    }

    function releaseFunds() public onlyRole(DEFAULT_ADMIN_ROLE) whenFunded {
        uint256 platformAmount = (address(this).balance * PLATFORM_FEE) / 10000;
        uint256 amount = address(this).balance - platformAmount;

        (bool platformSuccess, ) = platformAddress.call{value: platformAmount}(
            ""
        );
        if (!platformSuccess) revert FundTransferFailed();

        (bool success, ) = withdrawalAddress.call{value: amount}("");
        if (!success) revert FundTransferFailed();

        fundingStatus = FundingStatus.COMPLETE;

        emit FundingComplete();
    }

    function killFunding() public onlyRole(DEFAULT_ADMIN_ROLE) whenOpen {
        fundingStatus = FundingStatus.FAILED;
        emit FundingFailed();
    }

    function withdrawInvestment() public whenFailed {
        _removeFunds(msg.sender, investmentOf(msg.sender));
    }

    function investmentOf(address investor_) public view returns (uint256) {
        return _investments[investor_];
    }

    function _addFunds(address investor_, uint256 amount_) internal {
        _investments[investor_] += amount_;

        uint256 tokenAmount = (amount_ / tokenPrice) * (10**decimals());

        if (
            totalSupply() + tokenAmount >
            tokenCap - (_reserveAmount - _reserveClaimed)
        ) revert CapExceeded();
        _mint(investor_, tokenAmount);
    }

    function _removeFunds(address investor_, uint256 amount_) internal {
        _investments[investor_] -= amount_;

        (bool success, ) = payable(investor_).call{value: amount_}("");
        if (!success) revert FundTransferFailed();

        _burn(investor_, balanceOf(investor_));
    }

    // Share
    function addRevenueShare(
        bytes32 revenueSnapshot_,
        bytes32[] calldata revenueProof_
    ) public payable whenComplete onlyRole(DEFAULT_ADMIN_ROLE) {
        bool proofVerified = MerkleProof.verify(
            revenueProof_,
            revenueSnapshot_,
            keccak256(abi.encodePacked(address(0), msg.value))
        );

        if (!proofVerified) revert ProofFailed();

        _revenueRound++;

        _revenueRoundData[_revenueRound].snapshot = revenueSnapshot_;
        _revenueRoundData[_revenueRound].rate = msg.value / totalSupply();

        emit RevenueRoundAdded(_revenueRound, msg.value);
    }

    function withdrawRevenueShare(
        uint256 revenueRound_,
        bytes32[] calldata revenueProof_,
        uint256 revenueShare_
    ) public whenComplete {
        bytes32 revenueSnapshop = _revenueRoundData[revenueRound_].snapshot;
        uint256 revenueRate = _revenueRoundData[revenueRound_].rate;

        bool proofVerified = MerkleProof.verify(
            revenueProof_,
            revenueSnapshop,
            keccak256(abi.encodePacked(msg.sender, revenueShare_))
        );

        if (!proofVerified) revert ProofFailed();

        if (_revenueRoundData[_revenueRound].withdrawn[msg.sender])
            revert RevenueWithdrawn(revenueRound_);

        _revenueRoundData[_revenueRound].withdrawn[msg.sender] = true;

        uint256 ethShare = revenueShare_ / revenueRate;

        (bool success, ) = payable(msg.sender).call{value: ethShare}("");
        if (!success) revert FundTransferFailed();

        emit RevenueRoundWithdrawn(msg.sender, _revenueRound, ethShare);
    }

    function revenueData(uint256 revenueRound_)
        public
        view
        returns (bytes32 snapshot, uint256 rate)
    {
        return (
            _revenueRoundData[revenueRound_].snapshot,
            _revenueRoundData[revenueRound_].rate
        );
    }

    // Admin
    function setTokenPrice(uint256 newTokenPrice_)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (tokenPrice < (fundingGoal / tokenCap) * (10**decimals()))
            revert PriceTooLow();

        tokenPrice = newTokenPrice_;

        emit TokenPriceChange(newTokenPrice_);
    }

    // Overrides
    function _mint(address account, uint256 amount) internal override {
        if (totalSupply() + amount > tokenCap) revert CapExceeded();
        super._mint(account, amount);
    }
}
