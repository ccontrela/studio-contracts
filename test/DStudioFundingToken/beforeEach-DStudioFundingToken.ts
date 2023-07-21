import { ethers } from "hardhat";

beforeEach(async function () {
  const ctx = this.test?.ctx;
  if (!ctx) return;

  this.standardERC20Contract = await ctx.standardERC20Factory.deploy();

  this.masslessTreasuryContract = await ctx.masslessTreasuryFactory.deploy();

  // string memory name_,
  // string memory symbol_,
  // address erc20Token_,
  // uint256 tokenPrice_,
  // uint256 returnBasisPoints_,
  // address masslessTreasury_

  this.dStudioFundingTokenContract =
    await ctx.dStudioFundingTokenFactory.deploy(
      "DStudioFundingToken",
      "DST",
      this.standardERC20Contract.address,
      "100000000", // fixed point 8 (1:1)
      "1000", // fixed point 2 (10%)
      this.masslessTreasuryContract.address
      // ethers.utils.parseEther("1000000") // 1 Million
    );

  await this.masslessTreasuryContract.addFundingContract(
    this.dStudioFundingTokenContract.address
  );
});
