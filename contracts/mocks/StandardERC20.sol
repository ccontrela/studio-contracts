// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract StandardERC20 is ERC20 {
    constructor() ERC20("StandardERC20", "ERC20") {}

    function mint(uint256 amount) public {
        _mint(msg.sender, amount);
    }
}
