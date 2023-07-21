import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { MockContract, smock } from "@defi-wonderland/smock";
import keccak256 from "keccak256";
import MerkleTree from "merkletreejs";

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
          ctx.standardERC20Contract.connect(investor).mint(amount.mul(3));
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
    await ctx.masslessTreasuryContract.addFundingContract(
      mockDStudioContract1.address
    );
    await ctx.masslessTreasuryContract.addFundingContract(
      mockDStudioContract2.address
    );
  });

  afterEach(async () => {
    await ctx.masslessTreasuryContract.removeFundingContract(
      mockDStudioContract1.address
    );
    await ctx.masslessTreasuryContract.removeFundingContract(
      mockDStudioContract2.address
    );
  });

  const preProcess = async (
    dStudioContract: Contract | MockContract<Contract>,
    tokenPrice: string = "100000000"
  ) => {
    // Admin opens the funding
    expect(await dStudioContract.open()).to.not.be.reverted;

    // Execute investments
    await Promise.all(
      investments.map((investment) =>
        (async (investment) => {
          const [investor, amount] = investment;
          await ctx.standardERC20Contract
            .connect(investor)
            .approve(ctx.masslessTreasuryContract.address, amount);
          await expect(dStudioContract.connect(investor).fund(amount))
            .to.emit(dStudioContract, "Transfer")
            .withArgs(
              ethers.constants.AddressZero,
              investor.address,
              amount
                .mul(BigNumber.from(10 ** 8))
                .div(BigNumber.from(tokenPrice))
            );
        })(investment)
      )
    );

    // Admin closes the funding
    expect(await dStudioContract.close()).to.not.be.reverted;

    const totalBalance = investments
      .map(([, amount]) => amount)
      .reduce((prev, curr) => prev.add(curr));

    expect(
      await ctx.standardERC20Contract.balanceOf(
        ctx.masslessTreasuryContract.address
      )
    ).to.eq(totalBalance);

    await expect(dStudioContract.withdraw())
      .to.emit(dStudioContract, "Withdraw")
      .withArgs(totalBalance);

    expect(
      await ctx.standardERC20Contract.balanceOf(
        ctx.masslessTreasuryContract.address
      )
    ).to.eq(0);
  };

  const depositAndWithdrawPref = async (
    dStudioContract: Contract | MockContract<Contract>,
    tokenPrice: string = "100000000"
  ) => {
    // Admin deposits the profit
    await ctx.standardERC20Contract.mint(ethers.utils.parseEther("10000000"));

    // And we should get that value like the following
    const returnBasisPoints =
      (await dStudioContract.returnBasisPoints()) as BigNumber;
    const totalReturnPercentage = returnBasisPoints.add(BigNumber.from(10000));

    const leaves = investments.map(([invester, amount]) =>
      keccak256(
        ethers.utils.solidityPack(
          ["address", "uint256"],
          [
            invester.address,
            amount
              .mul(BigNumber.from(10 ** 8))
              .div(BigNumber.from(tokenPrice))
              .toString(),
          ]
        )
      )
    );
    const totalRecoupment = investments
      .map(([, amount]) =>
        amount.mul(BigNumber.from(10 ** 8)).div(BigNumber.from(tokenPrice))
      )
      .reduce((prev, curr) => prev.add(curr))
      .mul(BigNumber.from(tokenPrice))
      .div(BigNumber.from(10 ** 8))
      .mul(totalReturnPercentage)
      .div(BigNumber.from(10000))
      .toString();

    const lastLeaf = keccak256(
      ethers.utils.solidityPack(
        ["address", "uint256"],
        [dStudioContract.address, totalRecoupment]
      )
    );
    leaves.push(lastLeaf);
    const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const merkleRoot = merkleTree.getHexRoot();
    const merkleProof = merkleTree.getHexProof(lastLeaf);

    await ctx.standardERC20Contract.approve(
      ctx.masslessTreasuryContract.address,
      totalRecoupment
    );
    await expect(dStudioContract.depositPref(merkleRoot, merkleProof)).to.emit(
      dStudioContract,
      "RecoupmentDeposit"
    );

    await expect(dStudioContract.depositPref(merkleRoot, merkleProof)).to.emit(
      dStudioContract,
      "RecoupmentDeposit"
    ).to.be.reverted;

    const withdrawPrefValues = investments.map(([investor, amount], i) => {
      return [
        investor,
        merkleTree.getHexProof(leaves[i]),
        amount
          .mul(BigNumber.from(10 ** 8))
          .div(BigNumber.from(tokenPrice))
          .toString(),
      ];
    });

    for (const params of withdrawPrefValues) {
      await expect(
        dStudioContract
          .connect(params[0] as SignerWithAddress)
          .withdrawPref(params[1], params[2])
      ).to.emit(dStudioContract, "RecoupmentWithdraw");
    }
  };

  it("should be allowed to deposit pref only once and to withdraw preferred return", async () => {
    await preProcess(ctx.dStudioFundingTokenContract, "100000000"); // 1 USDC
    await preProcess(mockDStudioContract1, "120000"); // 0.0012 USDC
    await preProcess(mockDStudioContract2, "1200000000"); // 12 USDC

    await depositAndWithdrawPref(ctx.dStudioFundingTokenContract, "100000000"); // 1 USDC
    await depositAndWithdrawPref(mockDStudioContract1, "120000"); // 0.0012 USDC
    await depositAndWithdrawPref(mockDStudioContract2, "1200000000"); // 12 USDC
  });
}
