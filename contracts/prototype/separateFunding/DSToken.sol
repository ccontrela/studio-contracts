// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

error CapIsZero();
error CapExceeded();

error ProofFailed();

error NotMinter();

contract DSToken is ERC20, AccessControl {
    uint256 public immutable cap;
    bytes32 public merkleRoot;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 cap_
    ) ERC20(name_, symbol_) {
        if (cap_ == 0) revert CapIsZero();
        cap = cap_;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // Mint
    function mint(address account, uint256 amount)
        public
        onlyRole(MINTER_ROLE)
    {
        _mint(account, amount);
    }

    function claim(
        bytes32[] calldata merkleProof_,
        address account,
        uint256 amount
    ) public {
        bool proofVerified = MerkleProof.verify(
            merkleProof_,
            merkleRoot,
            keccak256(abi.encodePacked(account, amount))
        );

        if (!proofVerified) revert ProofFailed();

        _mint(account, amount);
    }

    // Admin
    function setMerkleRoot(bytes32 merkleRoot_)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        merkleRoot = merkleRoot_;
    }

    // Overrides
    function _mint(address account, uint256 amount) internal override {
        if (totalSupply() + amount > cap) revert CapExceeded();
        super._mint(account, amount);
    }
}
