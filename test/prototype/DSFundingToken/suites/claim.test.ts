import { expect } from "chai";
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
    ctx.claimLeaves = [
      encodeClaim(ctx.user1.address, "1000"),
      encodeClaim(ctx.user2.address, "100"),
      encodeClaim(ctx.user3.address, "10"),
      encodeClaim(ctx.user4.address, "1"),
      encodeClaim(ctx.user5.address, "0.1"),
    ];

    ctx.claimTree = new MerkleTree(ctx.claimLeaves, keccak256, {
      sortPairs: true,
    });
  });

  beforeEach(async function () {
    const claimRoot = ctx.claimTree.getHexRoot();
    await ctx.dsFundingTokenContract.setReserve(
      claimRoot,
      ethers.utils.parseEther("1111.1")
    );
  });

  it("should claim reserved tokens", async () => {
    const leaf = encodeClaim(ctx.user1.address, "1000");
    const merkleProof = ctx.claimTree.getHexProof(leaf);

    await expect(
      ctx.dsFundingTokenContract
        .connect(ctx.user1)
        .claimReserve(
          merkleProof,
          ctx.user1.address,
          ethers.utils.parseEther("1000")
        )
    )
      .to.emit(ctx.dsFundingTokenContract, "Transfer")
      .withArgs(
        ctx.nullAddress,
        ctx.user1.address,
        ethers.utils.parseEther("1000")
      );
  });

  it("should fail to claim reserved tokens", async () => {
    const leaf = encodeClaim(ctx.user1.address, "10");
    const merkleProof = ctx.claimTree.getHexProof(leaf);

    await expect(
      ctx.dsFundingTokenContract
        .connect(ctx.user1)
        .claimReserve(
          merkleProof,
          ctx.user1.address,
          ethers.utils.parseEther("10")
        )
    ).to.be.revertedWith("ProofFailed");
  });
}
