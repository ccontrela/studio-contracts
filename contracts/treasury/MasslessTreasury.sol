// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@massless.io/smart-contract-library/admin/AdminPermission.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./IMasslessTreasury.sol";

error ERC20TransferFailed();
error ERC20ReceiveFailed();
error NotRegisteredFundingContract();

contract MasslessTreasury is IMasslessTreasury, AdminPermission {
    mapping(address => bool) private _contractRegistration;
    mapping(address => uint256) private _contractBalance;

    constructor() AdminPermission(_msgSender()) {}

    modifier isRegisteredFundingContract(address contract_) {
        if (!_contractRegistration[contract_]) {
            revert NotRegisteredFundingContract();
        }
        _;
    }

    function addFundingContract(address contract_) external override onlyAdmin {
        _contractRegistration[contract_] = true;
    }

    function removeFundingContract(address contract_)
        external
        override
        onlyAdmin
    {
        _contractRegistration[contract_] = false;
        // TODO: not sure if we should return the left ERC20 tokens to the funding contract
    }

    function fundingContractBalance(address contract_)
        external
        view
        returns (uint256)
    {
        return _contractBalance[contract_];
    }

    function erc20Transfer(
        address erc20Contract_,
        address to_,
        uint256 amount_
    ) public override isRegisteredFundingContract(_msgSender()) {
        _contractBalance[msg.sender] -= amount_;

        if (!IERC20(erc20Contract_).transfer(to_, amount_)) {
            revert ERC20TransferFailed();
        }
    }

    function erc20Receive(
        address erc20Contract_,
        address from_,
        uint256 amount_
    ) external override isRegisteredFundingContract(_msgSender()) {
        _contractBalance[_msgSender()] += amount_;

        if (
            !IERC20(erc20Contract_).transferFrom(from_, address(this), amount_)
        ) {
            revert ERC20ReceiveFailed();
        }
    }
}
