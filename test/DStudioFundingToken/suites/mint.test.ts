import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import keccak256 from "keccak256";
import { MerkleTree } from "merkletreejs";

export default function suite() {
  let ctx: Mocha.Context;
  before(async function () {
    const context = this.test?.ctx;
    if (context) ctx = context;
  });

  it("should mint tokens", async () => {
    {
      await ctx.standardERC20Contract.connect(ctx.user1).mint(100000);
      await ctx.standardERC20Contract.connect(ctx.user2).mint(300000);
      await ctx.standardERC20Contract.connect(ctx.user3).mint(600000);

      // Admin opens the funding
      expect(await ctx.dStudioFundingTokenContract.open()).to.not.be.reverted;

      // Three users make their investments ( Totally 750000 USDC Invested )
      await ctx.standardERC20Contract
        .connect(ctx.user1)
        .approve(ctx.masslessTreasuryContract.address, 50000);
      await expect(
        ctx.dStudioFundingTokenContract.connect(ctx.user1).fund(50000)
      )
        .to.emit(ctx.dStudioFundingTokenContract, "Transfer")
        .withArgs(ethers.constants.AddressZero, ctx.user1.address, "50000");

      await ctx.standardERC20Contract
        .connect(ctx.user2)
        .approve(ctx.masslessTreasuryContract.address, 200000);
      await expect(
        ctx.dStudioFundingTokenContract.connect(ctx.user2).fund(200000)
      )
        .to.emit(ctx.dStudioFundingTokenContract, "Transfer")
        .withArgs(ethers.constants.AddressZero, ctx.user2.address, "200000");

      await ctx.standardERC20Contract
        .connect(ctx.user3)
        .approve(ctx.masslessTreasuryContract.address, 500000);
      await expect(
        ctx.dStudioFundingTokenContract.connect(ctx.user3).fund(500000)
      )
        .to.emit(ctx.dStudioFundingTokenContract, "Transfer")
        .withArgs(ethers.constants.AddressZero, ctx.user3.address, "500000");

      // Admin closes the funding
      expect(await ctx.dStudioFundingTokenContract.close()).to.not.be.reverted;

      // Admin withdraws the investmens to somewhere else
      await expect(ctx.dStudioFundingTokenContract.withdraw())
        .to.emit(ctx.dStudioFundingTokenContract, "Withdraw")
        .withArgs("750000");

      // Admin deposits the profit
      await ctx.standardERC20Contract.mint(1000000);

      // And we should get that value like the following
      const returnBasisPoints =
        (await ctx.dStudioFundingTokenContract.returnBasisPoints()) as BigNumber;
      const totalReturnPercentage = returnBasisPoints.add(
        BigNumber.from(10000)
      );

      const investments = {
        [ctx.user1.address]: BigNumber.from(50000),
        [ctx.user2.address]: BigNumber.from(200000),
        [ctx.user3.address]: BigNumber.from(500000),
      };
      const totalBalance = Object.values(investments).reduce(
        (preV, curV) => preV.add(curV),
        BigNumber.from(0)
      );
      const leaves = Object.keys(investments)
        .sort()
        .map((address) =>
          keccak256(
            ethers.utils.solidityPack(
              ["address", "uint256"],
              [
                address,
                investments[address]
                  .mul(totalReturnPercentage)
                  .div(BigNumber.from(10000))
                  .toString(),
              ]
            )
          )
        );
      const totalRecoupment = totalBalance
        .mul(totalReturnPercentage)
        .div(BigNumber.from(10000))
        .toString();
      const lastLeaf = keccak256(
        ethers.utils.solidityPack(
          ["address", "uint256"],
          [ctx.dStudioFundingTokenContract.address, totalRecoupment]
        )
      );
      leaves.push(lastLeaf);
      const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
      const merkleRoot = merkleTree.getHexRoot();
      const merkleProof = merkleTree.getHexProof(lastLeaf);

      await ctx.standardERC20Contract.approve(
        ctx.masslessTreasuryContract.address,
        totalRecoupment // 825000 = 110% of the total investment of 750000
      );
      await expect(
        ctx.dStudioFundingTokenContract.depositPref(merkleRoot, merkleProof)
      )
        .emit(ctx.dStudioFundingTokenContract, "RecoupmentDeposit")
        .withArgs(merkleRoot, totalRecoupment);
    }
  });
}
