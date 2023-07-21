import { ethers } from "hardhat";

beforeEach(async function () {
  const ctx = this.test?.ctx;
  if (!ctx) return;

  this.dsFundingTokenContract = await ctx.dsFundingTokenFactory.deploy(
    "DSFundingToken",
    "DSFT",
    ethers.utils.parseEther("0.1"), // Price per Token
    ethers.utils.parseEther("1000000"), // 1 Million Tokens Limit
    ethers.utils.parseEther("1850") // $3 Million in Ether
  );
});
