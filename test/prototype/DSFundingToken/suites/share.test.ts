import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import keccak256 from "keccak256";
import MerkleTree from "merkletreejs";
import { encodeClaim } from "../../../utils/claim";

export default function suite() {
  let ctx: Mocha.Context;
  before(async function () {
    const context = this.test?.ctx;
    if (context) ctx = context;

    // claim list
    ctx.snapshotLeaves = [
      encodeClaim(ctx.user1.address, "1000"),
      encodeClaim(ctx.user2.address, "100"),
      encodeClaim(ctx.user3.address, "10"),
      encodeClaim(ctx.user4.address, "1"),
      encodeClaim(ctx.user5.address, "0.1"),
      encodeClaim(ctx.nullAddress, "3.14159"),
    ];

    ctx.snapshotTree = new MerkleTree(ctx.snapshotLeaves, keccak256, {
      sortPairs: true,
    });
  });

  beforeEach(async function () {
    const context = this.test?.ctx;
    if (context) ctx = context;

    const value = ethers.utils.parseEther("462.5");
    const tokens = ethers.utils.parseEther("4625");

    await expect(
      ctx.dsFundingTokenContract.connect(ctx.user1).addFunds({ value })
    )
      .to.emit(ctx.dsFundingTokenContract, "Transfer")
      .withArgs(ctx.nullAddress, ctx.user1.address, tokens);

    await expect(
      ctx.dsFundingTokenContract.connect(ctx.user2).addFunds({ value })
    )
      .to.emit(ctx.dsFundingTokenContract, "Transfer")
      .withArgs(ctx.nullAddress, ctx.user2.address, tokens);

    await expect(
      ctx.dsFundingTokenContract.connect(ctx.user3).addFunds({ value })
    )
      .to.emit(ctx.dsFundingTokenContract, "Transfer")
      .withArgs(ctx.nullAddress, ctx.user3.address, tokens);

    await expect(
      ctx.dsFundingTokenContract.connect(ctx.user4).addFunds({ value })
    )
      .to.emit(ctx.dsFundingTokenContract, "Transfer")
      .withArgs(ctx.nullAddress, ctx.user4.address, tokens);

    await ctx.dsFundingTokenContract.releaseFunds();
  });

  it("should withdraw revenue proporsional to owned tokens", async () => {
    const revenueSnapshot = ctx.snapshotTree.getHexRoot();
    const revenueProof = ctx.snapshotTree.getHexProof(
      encodeClaim(ctx.nullAddress, "3.14159")
    );
    const value = ethers.utils.parseEther("3.14159");

    await expect(
      ctx.dsFundingTokenContract
        .connect(ctx.owner)
        .addRevenueShare(revenueSnapshot, revenueProof, { value })
    )
      .to.emit(ctx.dsFundingTokenContract, "RevenueRoundAdded")
      .withArgs(BigNumber.from("1"), value);

    const withdrawProof = ctx.snapshotTree.getHexProof(
      encodeClaim(ctx.user1.address, "1000")
    );

    await expect(
      ctx.dsFundingTokenContract
        .connect(ctx.user1)
        .withdrawRevenueShare(1, withdrawProof, ethers.utils.parseEther("1000"))
    )
      .to.emit(ctx.dsFundingTokenContract, "RevenueRoundWithdrawn")
      .withArgs(ctx.user1.address, BigNumber.from(1), BigNumber.from("1000"));
  });
}
