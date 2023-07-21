import { ethers } from "hardhat";

export function encodeClaim(account: string, amount: string) {
  return ethers.utils.solidityKeccak256(
    ["address", "uint256"],
    [account, ethers.utils.parseEther(amount)]
  );
}
