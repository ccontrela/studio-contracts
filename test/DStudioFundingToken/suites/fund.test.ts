import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { MockContract, smock } from "@defi-wonderland/smock";

export default function suite() {
  let ctx: Mocha.Context;
  let investments: [SignerWithAddress, BigNumber][];
  let mockDStudioContract1: MockContract<Contract>;
  let mockDStudioContract2: MockContract<Contract>;

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
    await Promise.all(
      investments.map((investment) =>
        (async (investment) => {
          const [investor, amount] = investment;
          ctx.standardERC20Contract.connect(investor).mint(amount.mul(2));
        })(investment)
      )
    );

    const mockDStudioContractFactory = await smock.mock("DStudioFundingToken");
    mockDStudioContract1 = await mockDStudioContractFactory.deploy(
      "MockDStudioFundingToken",
      "MDST",
      ctx.standardERC20Contract.address,
      "120000", // fixed point 8 (1:1)
      "1000", // fixed point 2 (10%)
      ctx.masslessTreasuryContract.address
    );
    mockDStudioContract2 = await mockDStudioContractFactory.deploy(
      "MockDStudioFundingToken",
      "MDST",
      ctx.standardERC20Contract.address,
      "1200000000", // fixed point 8 (1:1)
      "1000", // fixed point 2 (10%)
      ctx.masslessTreasuryContract.address
    );
  });

  it("should add funds and mint tokens in return", async () => {
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

    // Check results
    await Promise.all(
      investments.map((investment) =>
        (async (investment) => {
          const [investor, amount] = investment;
          expect(
            await ctx.dStudioFundingTokenContract.balanceOf(investor.address)
          ).to.eql(amount);
        })(investment)
      )
    );

    const totalBalance = investments
      .map(([, amount]) => amount)
      .reduce((prev, curr) => prev.add(curr), BigNumber.from(0));

    expect(
      await ctx.standardERC20Contract.balanceOf(
        ctx.masslessTreasuryContract.address
      )
    ).to.eq(totalBalance);
  });

  it("should mint the exact rate of tokens when the token price is 0.0012 and 12 USDC and be successfully refunded", async () => {
    await ctx.masslessTreasuryContract.addFundingContract(
      mockDStudioContract1.address
    );
    await ctx.masslessTreasuryContract.addFundingContract(
      mockDStudioContract2.address
    );

    // Admin opens the funding
    expect(await mockDStudioContract1.open()).to.not.be.reverted;
    expect(await mockDStudioContract2.open()).to.not.be.reverted;

    const mockInvestments: [SignerWithAddress, BigNumber, BigNumber][] = [
      [
        ctx.user1,
        ethers.utils.parseEther("49999"),
        ethers.utils.parseEther("1"),
      ],
      [
        ctx.user2,
        ethers.utils.parseEther("0"),
        ethers.utils.parseEther("200000"),
      ],
      [
        ctx.user3,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("499990"),
      ],
    ];

    // Execute investments
    await Promise.all(
      mockInvestments.map((investment) =>
        (async (investment) => {
          const [investor, amount1, amount2] = investment;
          await ctx.standardERC20Contract
            .connect(investor)
            .approve(ctx.masslessTreasuryContract.address, amount1);
          await expect(mockDStudioContract1.connect(investor).fund(amount1))
            .to.emit(mockDStudioContract1, "Transfer")
            .withArgs(
              ethers.constants.AddressZero,
              investor.address,
              BigNumber.from(amount1)
                .mul(BigNumber.from(10 ** 8))
                .div(BigNumber.from(120000))
                .toString()
            );
          await ctx.standardERC20Contract
            .connect(investor)
            .approve(ctx.masslessTreasuryContract.address, amount2);
          await expect(mockDStudioContract2.connect(investor).fund(amount2))
            .to.emit(mockDStudioContract2, "Transfer")
            .withArgs(
              ethers.constants.AddressZero,
              investor.address,
              BigNumber.from(amount2)
                .mul(BigNumber.from(10 ** 8))
                .div(BigNumber.from(1200000000))
                .toString()
            );
        })(investment)
      )
    );

    expect(await mockDStudioContract1.cancel()).to.not.be.reverted;
    expect(await mockDStudioContract2.cancel()).to.not.be.reverted;

    await Promise.all(
      mockInvestments.map((investment) =>
        (async (investment) => {
          const [investor, amount1, amount2] = investment;
          await expect(mockDStudioContract1.connect(investor).refund())
            .to.emit(mockDStudioContract1, "Transfer")
            .withArgs(
              investor.address,
              ethers.constants.AddressZero,
              BigNumber.from(amount1)
                .mul(BigNumber.from(10 ** 8))
                .div(BigNumber.from(120000))
                .toString()
            );
          await expect(mockDStudioContract2.connect(investor).refund())
            .to.emit(mockDStudioContract2, "Transfer")
            .withArgs(
              investor.address,
              ethers.constants.AddressZero,
              BigNumber.from(amount2)
                .mul(BigNumber.from(10 ** 8))
                .div(BigNumber.from(1200000000))
                .toString()
            );
        })(investment)
      )
    );

    expect(await mockDStudioContract1.totalSupply()).to.eq(0);
    expect(await mockDStudioContract2.totalSupply()).to.eq(0);

    await ctx.masslessTreasuryContract.removeFundingContract(
      mockDStudioContract1.address
    );
    await ctx.masslessTreasuryContract.removeFundingContract(
      mockDStudioContract2.address
    );
  });
}
