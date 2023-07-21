// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@massless.io/smart-contract-library/funding/ERC20Fund.sol";
import "@massless.io/smart-contract-library/funding/extension/ERC20PreferredReturn.sol";
import "@massless.io/smart-contract-library/funding/extension/ERC20Carry.sol";
import "./treasury/IMasslessTreasury.sol";

contract DStudioFundingToken is
    ERC20,
    ERC20Fund,
    ERC20PreferredReturn,
    ERC20Carry
{
    address internal _masslessTreasury;

    constructor(
        string memory name_,
        string memory symbol_,
        address erc20Token_,
        uint256 tokenPrice_,
        uint256 returnBasisPoints_,
        address masslessTreasury_
    )
        ERC20(name_, symbol_)
        ERC20Fund(erc20Token_, tokenPrice_)
        ERC20PreferredReturn(returnBasisPoints_)
    {
        _masslessTreasury = masslessTreasury_;
    }

    modifier hasAllowance(uint256 amount_) override {
        if (
            amount_ >
            ERC20(_erc20Token).allowance(msg.sender, _masslessTreasury)
        ) revert InsufficientAllowance();

        _;
    }

    /**
     * Investor
     */
    function fund(uint256 amount_)
        external
        virtual
        override
        hasAllowance(amount_)
    {
        uint256 tokenAmount = (amount_ * 10**8) / _tokenPrice;
        _fund(tokenAmount);

        IMasslessTreasury(_masslessTreasury).erc20Receive(
            _erc20Token,
            msg.sender,
            amount_
        );
    }

    function refund() external virtual override {
        uint256 tokenAmount = _refund();
        uint256 amount = (tokenAmount * _tokenPrice) / 10**8;

        IMasslessTreasury(_masslessTreasury).erc20Transfer(
            _erc20Token,
            msg.sender,
            amount
        );
    }

    /**
     * Issuer
     */

    function withdraw() external override onlyAdmin {
        uint256 totalFund = IMasslessTreasury(_masslessTreasury)
            .fundingContractBalance(address(this));

        _withdraw(totalFund);

        IMasslessTreasury(_masslessTreasury).erc20Transfer(
            _erc20Token,
            msg.sender,
            totalFund
        );
    }

    // Withdraw Preferred Return
    function withdrawPref(bytes32[] calldata merkleProof_, uint256 tokenAmount_)
        public
        virtual
        override
        isFundingStatus(FundingStatus.recoupment)
    {
        uint256 erc20Amount = (tokenAmount_ * _tokenPrice) / 10**8;
        uint256 returnAmount = (erc20Amount * _returnBasisPoints) / 10000;
        uint256 totalERC20Amount = erc20Amount + returnAmount;

        _withdraw(_merkleRoot, merkleProof_, tokenAmount_, totalERC20Amount);

        IMasslessTreasury(_masslessTreasury).erc20Transfer(
            _erc20Token,
            msg.sender,
            totalERC20Amount
        );
    }

    // Deposit Preferred Return
    function depositPref(bytes32 merkleRoot_, bytes32[] calldata merkleProof_)
        public
        virtual
        override
        onlyAdmin
        isFundingStatus(FundingStatus.withdrawn)
    {
        _merkleRoot = merkleRoot_;

        uint256 erc20amount = (totalSupply() * _tokenPrice) / 10**8;
        uint256 returnAmount = (erc20amount * _returnBasisPoints) / 10000;
        uint256 totalERC20Amount = erc20amount + returnAmount;

        _deposit(_merkleRoot, merkleProof_, totalERC20Amount);

        _status = FundingStatus.recoupment;

        IMasslessTreasury(_masslessTreasury).erc20Receive(
            _erc20Token,
            msg.sender,
            totalERC20Amount
        );
    }

    function withdrawCarry(
        bytes32 merkleRoot_,
        bytes32[] calldata merkleProof_,
        uint256 tokenAmount_
    )
        public
        virtual
        override
        notPreferredReturn(merkleRoot_)
        isFundingStatus(FundingStatus.recoupment)
    {
        uint256 erc20Amount = (tokenAmount_ * _deposited(merkleRoot_)) /
            totalSupply();

        if (erc20Amount == 0) revert NotEnoughTokensToWithdraw();

        _withdraw(merkleRoot_, merkleProof_, tokenAmount_, erc20Amount);

        IMasslessTreasury(_masslessTreasury).erc20Transfer(
            _erc20Token,
            msg.sender,
            erc20Amount
        );
    }

    function depositCarry(
        bytes32 merkleRoot_,
        bytes32[] calldata merkleProof_,
        uint256 erc20Amount_
    )
        public
        virtual
        override
        onlyAdmin
        isFundingStatus(FundingStatus.withdrawn)
    {
        _deposit(merkleRoot_, merkleProof_, erc20Amount_);

        _status = FundingStatus.recoupment;

        IMasslessTreasury(_masslessTreasury).erc20Receive(
            _erc20Token,
            msg.sender,
            erc20Amount_
        );
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC20Carry, ERC20Fund, ERC20PreferredReturn)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
