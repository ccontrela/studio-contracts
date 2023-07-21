import { expect } from "chai";
import { ethers } from "hardhat";

export default function suite() {
  let ctx: Mocha.Context;
  before(async function () {
    const context = this.test?.ctx;
    if (context) ctx = context;
  });

  it("should mint tokens from MINTER role", async () => {
    const minterRole = await ctx.dsTokenContract.MINTER_ROLE();
    await ctx.dsTokenContract.grantRole(minterRole, ctx.user1.address);

    await expect(
      ctx.dsTokenContract
        .connect(ctx.user1)
        .mint(ctx.user1.address, ethers.utils.parseEther("1"))
    ).to.emit(ctx.dsTokenContract, "Transfer");
  });

  it("should fail to mint tokens", async () => {
    await expect(
      ctx.dsTokenContract
        .connect(ctx.user1)
        .mint(ctx.user1.address, ethers.utils.parseEther("1"))
    ).to.be.revertedWith("missing role");
  });
}
