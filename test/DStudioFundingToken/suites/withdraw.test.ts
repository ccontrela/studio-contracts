import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { MockContract, smock } from "@defi-wonderland/smock";

export default function suite() {
  let ctx: Mocha.Context;
  let investments: [SignerWithAddress, BigNumber][];
  before(async function () {
    const context = this.test?.ctx;
    if (context) ctx = context;

    investments = [
      [ctx.user1, ethers.utils.parseEther("50000")],
      [ctx.user2, ethers.utils.parseEther("200000")],
      [ctx.user3, ethers.utils.parseEther("500000")],
    ];
  });

  beforeEach(async () => {
    // Investor USDC minting
    await Promise.all(
      investments.map((investment) =>
        (async (investment) => {
          const [investor, amount] = investment;
          ctx.standardERC20Contract.connect(investor).mint(amount.mul(2));
        })(investment)
      )
    );

    // Admin opens the funding
    expect(await ctx.dStudioFundingTokenContract.open()).to.not.be.reverted;

    // Execute investments
    await Promise.all(
      investments.map((investment) =>
        (async (investment) => {
          const [investor, amount] = investment;
          await ctx.standardERC20Contract
            .connect(investor)
            .approve(ctx.masslessTreasuryContract.address, amount);
          await expect(
            ctx.dStudioFundingTokenContract.connect(investor).fund(amount)
          )
            .to.emit(ctx.dStudioFundingTokenContract, "Transfer")
            .withArgs(ethers.constants.AddressZero, investor.address, amount);
        })(investment)
      )
    );

    // Admin closes the funding
    expect(await ctx.dStudioFundingTokenContract.close()).to.not.be.reverted;
  });

  it("should allow producer to withdraw funding", async () => {
    const totalBalance = investments
      .map(([, amount]) => amount)
      .reduce((prev, curr) => prev.add(curr));

    expect(
      await ctx.standardERC20Contract.balanceOf(
        ctx.masslessTreasuryContract.address
      )
    ).to.eq(totalBalance);

    await expect(ctx.dStudioFundingTokenContract.withdraw())
      .to.emit(ctx.dStudioFundingTokenContract, "Withdraw")
      .withArgs(totalBalance);

    expect(
      await ctx.standardERC20Contract.balanceOf(
        ctx.masslessTreasuryContract.address
      )
    ).to.eq(0);
  });

  it("should be reverted from re-entrancy attack in withdraw", async () => {
    const totalBalance = investments
      .map(([, amount]) => amount)
      .reduce((prev, curr) => prev.add(curr));

    expect(
      await ctx.standardERC20Contract.balanceOf(
        ctx.masslessTreasuryContract.address
      )
    ).to.eq(totalBalance);

    const ReentrancyAttackerFactory = await smock.mock("ReentrancyAttacker");
    const reentrancyAttacker = await ReentrancyAttackerFactory.deploy(
      ctx.dStudioFundingTokenContract.address
    );

    await expect(
      ctx.dStudioFundingTokenContract.transferOwnership(
        reentrancyAttacker.address
      )
    ).to.emit(ctx.dStudioFundingTokenContract, "OwnershipTransferred");

    await expect(reentrancyAttacker.attackWithdraw()).to.not.emit(
      reentrancyAttacker, "ReentrancyAttackSuccess"
    );

    expect(
      await ctx.standardERC20Contract.balanceOf(
        ctx.masslessTreasuryContract.address
      )
    ).to.eq(0);
  });
}
