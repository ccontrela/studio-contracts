import { expect } from "chai";
import { ethers } from "hardhat";

export default function suite() {
  let ctx: Mocha.Context;
  before(async function () {
    const context = this.test?.ctx;
    if (context) ctx = context;
  });

  it("should invest funds and receive tokens", async () => {
    const value = ethers.utils.parseEther("1");
    const tokensReturned = ethers.utils.parseEther("10");
    await expect(
      ctx.dsFundingTokenContract.connect(ctx.user1).addFunds({ value })
    )
      .to.emit(ctx.dsFundingTokenContract, "Transfer")
      .withArgs(ctx.nullAddress, ctx.user1.address, tokensReturned);

    expect(
      await ctx.dsFundingTokenContract.balanceOf(ctx.user1.address)
    ).to.eql(tokensReturned);
  });

  it("should invest funds with default transaction and receive tokens", async () => {
    await expect(
      ctx.user1.sendTransaction({
        to: ctx.dsFundingTokenContract.address,
        value: ethers.utils.parseEther("1"),
      })
    ).to.emit(ctx.dsFundingTokenContract, "Transfer");
  });
}
