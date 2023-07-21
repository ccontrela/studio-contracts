import { ethers } from "hardhat";

beforeEach(async function () {
  const ctx = this.test?.ctx;
  if (!ctx) return;

  this.dsTokenContract = await ctx.dsTokenFactory.deploy(
    "DSToken",
    "DST",
    ethers.utils.parseEther("1000000") // 1 Million
  );
});
