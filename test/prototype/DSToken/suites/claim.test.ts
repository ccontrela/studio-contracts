import { expect } from "chai";
import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";
import { encodeClaim } from "../../../utils/claim";

export default function suite() {
  let ctx: Mocha.Context;
  before(async function () {
    const context = this.test?.ctx;
    if (context) ctx = context;
  });

  beforeEach(async function () {
    const merkleRoot = ctx.merkleTree.getHexRoot();
    await ctx.dsTokenContract.setMerkleRoot(merkleRoot);
  });

  it("should claim tokens", async () => {
    const leaf = encodeClaim(ctx.user1.address, "1000");
    const merkleProof = ctx.merkleTree.getHexProof(leaf);

    await expect(
      ctx.dsTokenContract
        .connect(ctx.user1)
        .claim(merkleProof, ctx.user1.address, ethers.utils.parseEther("1000"))
    ).to.emit(ctx.dsTokenContract, "Transfer");
  });

  it("should fail to claim tokens", async () => {
    const leaf = encodeClaim(ctx.user1.address, "10");
    const merkleProof = ctx.merkleTree.getHexProof(leaf);

    await expect(
      ctx.dsTokenContract
        .connect(ctx.user1)
        .claim(merkleProof, ctx.user1.address, ethers.utils.parseEther("10"))
    ).to.be.revertedWith("ProofFailed");
  });
}
