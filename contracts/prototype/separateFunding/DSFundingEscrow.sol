// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/AccessControl.sol";

error NotAdmin();
error FundingGoalReached();
error FundingGoalNotReached();
error TransferFailed();

contract DSFunding is AccessControl {
    // Contract => Investor => Amount
    mapping(address => mapping(address => uint256)) private _fundingPerInvestor;

    // Contract => Total Funded
    mapping(address => uint256) private _fundingTotal;

    // Contract => Funding Goal
    mapping(address => uint256) private _fundingGoal;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier isAdmin(address msgSender_, address contract_) {
        IAccessControl fundingContract = IAccessControl(contract_);
        bool hasAdminRole = fundingContract.hasRole(
            DEFAULT_ADMIN_ROLE,
            msgSender_
        );
        if (!hasAdminRole) revert NotAdmin();

        _;
    }

    modifier whenFunded(address contract_) {
        bool isFunded = _fundingTotal[contract_] < _fundingGoal[contract_];
        if (!isFunded) revert FundingGoalNotReached();

        _;
    }

    modifier whenNotFunded(address contract_, uint256 amount) {
        bool isFunded = _fundingTotal[contract_] + amount <
            _fundingGoal[contract_];
        if (isFunded) revert FundingGoalReached();

        _;
    }

    function registerEscrow(address contract_, uint256 fundingGoal_)
        public
        payable
        isAdmin(msg.sender, contract_)
    {
        _fundingGoal[contract_] = fundingGoal_;
    }

    function releaseFunds(address contract_)
        public
        isAdmin(msg.sender, contract_)
        whenFunded(contract_)
    {
        uint256 amount = _fundingTotal[contract_];
        _fundingTotal[contract_] = 0;

        (bool success, ) = contract_.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    function addFunds(address contract_)
        public
        payable
        whenNotFunded(contract_, msg.value)
    {
        _addFunds(contract_, msg.sender, msg.value);
    }

    function _addFunds(
        address contract_,
        address investor_,
        uint256 amount_
    ) internal {
        _fundingPerInvestor[contract_][investor_] += amount_;
        _fundingTotal[contract_] += amount_;
    }

    function _removeFunds(
        address contract_,
        address investor_,
        uint256 amount_
    ) internal {
        _fundingPerInvestor[contract_][investor_] -= amount_;
        _fundingTotal[contract_] -= amount_;
    }
}
