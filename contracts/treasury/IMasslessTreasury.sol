// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IMasslessTreasury {
    /**
     * @notice An authorized `msg.sender` can add a funding contract to the list of allowed contracts to call transfer functions.
     * @dev Throw if called by an unauthorized user.
     * @param contract_ address The address of the contract to add.
     */
    function addFundingContract(address contract_) external;

    /**
     * @notice An authorized `msg.sender` can remove a funding contract from the list of allowed contracts.
     * @dev Throw if called by an unauthorized user.
     * @param contract_ address The address of the contract to remove.
     */
    function removeFundingContract(address contract_) external;

    /**
     * @notice Returns a funding contract's balance.
     * @param contract_ address The address of the funding contract contract
     * @return uint256 The balance of the funding contract.
     */
    function fundingContractBalance(address contract_)
        external
        view
        returns (uint256);

    /**
     * @notice Transfer the specified amount from the Massless Treasury to a user and update the funding contracts (`msg.sender`) balance.
     * @dev Throw if `msg.sender` is no on the list of authorized contracts.
     * @param erc20Contract_ address The address of the erc20 contract
     * @param to_ address The address of the recipient of the transfer
     * @param amount_ address The amount of tokens to transfer
     */
    function erc20Transfer(
        address erc20Contract_,
        address to_,
        uint256 amount_
    ) external;

    /**
     * @notice Transfer the specified amount to the Massless Treasury and update the funding contracts (`msg.sender`) balance.
     * @dev Throw if `msg.sender` is no on the list of authorized contracts.
     * @param erc20Contract_ address The address of the erc20 contract
     * @param from_ address The address of the sender who will send amount_ of erc20 to the treasury contract
     * @param amount_ address The amount of tokens to transfer
     */
    function erc20Receive(
        address erc20Contract_,
        address from_,
        uint256 amount_
    ) external;
}
