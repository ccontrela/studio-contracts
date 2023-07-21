import * as dotenv from "dotenv";

import { expect, assert } from "chai";
import { Contract, ethers, Wallet } from "ethers";
import IERC20 from "@openzeppelin/contracts/build/contracts/IERC20.json";
import IUniswapV2Router02 from '@uniswap/v2-periphery/build/IUniswapV2Router02.json';
import IUniswapV2Factory from '@uniswap/v2-core/build/IUniswapV2Factory.json';
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json';
import CONTRACT_ADDRESSES from "../contract_addresses.json";

const {
  time
} = require('@openzeppelin/test-helpers');

dotenv.config();

export default function suite() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.RINKEBY_RPC_URL
  );
  let ctx: Mocha.Context;
  let startTime: typeof time;
  let amountUniForAddLiquidity = ethers.utils.parseEther("0.001").toString();
  let amountMkrForAddLiquidity = ethers.utils.parseEther("0.000001").toString();
  let amountEthForAddLiquidity = ethers.utils.parseEther("0.001").toString();
  let amountLiquidityForRemoveLiquidity = ethers.utils.parseEther("0.0000001").toString();

  before(async function () {
    const context = this.test?.ctx;
    if (context) ctx = context;

    // @ts-ignore
    ctx.owner = new Wallet(process.env.RINKEBY_PRIVATE_KEY, provider);

    // Initialize Contract
    ctx.UNI = new Contract(
      CONTRACT_ADDRESSES.UNI.rinkeby,
      IERC20.abi,
      provider
    );
    ctx.MKR = new Contract(
      CONTRACT_ADDRESSES.MKR.rinkeby,
      IERC20.abi,
      provider
    );
    ctx.WETH = new Contract(
      CONTRACT_ADDRESSES.WETH.rinkeby,
      IERC20.abi,
      provider
    );

    ctx.UniswapV2Router = new Contract(
      CONTRACT_ADDRESSES.UniswapV2Router.rinkeby,
      IUniswapV2Router02.abi,
      provider
    );

    let factoryAddress = await ctx.UniswapV2Router.factory();
    ctx.UniswapV2Factory = new Contract(
      factoryAddress,
      IUniswapV2Factory.abi,
      provider
    );
    let pairUNItoMKRAddress = await ctx.UniswapV2Factory.getPair(ctx.UNI.address, ctx.MKR.address);
    ctx.UniswapV2PairUNItoMKR = new Contract(
      pairUNItoMKRAddress,
      IUniswapV2Pair.abi,
      provider
    );

    let pairUNItoETHAddress = await ctx.UniswapV2Factory.getPair(ctx.UNI.address, ctx.WETH.address);
    ctx.UniswapV2PairUNItoETH = new Contract(
      pairUNItoETHAddress,
      IUniswapV2Pair.abi,
      provider
    );
  });

  describe("Preparation", async () => {
    // it("Approve router for WETH", async () => {
    //   await ctx.WETH.connect(ctx.owner).approve(ctx.UniswapV2Router.address, ethers.utils.parseEther("10").toString());
    // });

    it("Approve router for UNI", async () => {
      await ctx.UNI.connect(ctx.owner).approve(ctx.UniswapV2Router.address, ethers.utils.parseEther("10").toString());
    });

    it("Approve router for MKR", async () => {
      await ctx.MKR.connect(ctx.owner).approve(ctx.UniswapV2Router.address, ethers.utils.parseEther("10").toString());
    });

    it("Approve router for UNI to MKR pair Liquidity", async () => {
      await ctx.UniswapV2PairUNItoMKR.connect(ctx.owner).approve(ctx.UniswapV2Router.address, ethers.utils.parseEther("10").toString());
    });

    it("Approve router for UNI to ETH pair Liquidity", async () => {
      await ctx.UniswapV2PairUNItoETH.connect(ctx.owner).approve(ctx.UniswapV2Router.address, ethers.utils.parseEther("10").toString());
    });

    // it("swap WETH for UNI", async () => {
    //   startTime = await time.latest();
    //   const tx = await ctx.UniswapV2Router
    //     .connect(ctx.owner)
    //     .swapExactETHForTokens(
    //       ethers.utils.parseEther("0.01").toString(),
    //       [ctx.WETH.address, ctx.UNI.address],
    //       ctx.owner.address,
    //       startTime.add(time.duration.minutes(20)).toString()
    //     );
    // });

    // it("swap UNI for MKR", async () => {
    //   startTime = await time.latest();
    //   const tx = await ctx.UniswapV2Router
    //     .connect(ctx.owner)
    //     .swapExactTokensForTokens(
    //       ethers.utils.parseEther("0.1").toString(),
    //       0,
    //       [ctx.UNI.address, ctx.MKR.address],
    //       ctx.owner.address,
    //       startTime.add(time.duration.minutes(20)).toString()
    //     );
    // });
  });

  describe("addLiquidity", async () => {
    it("Only ERC20 token should be used", async () => {
      startTime = await time.latest();
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .addLiquidity(
            ctx.owner.address,
            ctx.MKR.address,
            amountUniForAddLiquidity,
            amountMkrForAddLiquidity,
            0,
            0,
            ctx.owner.address,
            startTime.add(time.duration.minutes(20)).toString()
          )
      ).to.be.reverted;
    });

    it("Desired amount of token A and B cannot be more than balance", async () => {
      startTime = await time.latest();
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .addLiquidity(
            ctx.UNI.address,
            ctx.MKR.address,
            ethers.utils.parseEther("1000").toString(),
            ethers.utils.parseEther("1000").toString(),
            0,
            0,
            ctx.owner.address,
            startTime.add(time.duration.minutes(20)).toString()
          )
      ).to.be.revertedWith('execution reverted: TransferHelper: TRANSFER_FROM_FAILED');
    });

    it("Liquid amount of token A, B cannot be more than minimum", async () => {
      startTime = await time.latest();
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .addLiquidity(
            ctx.UNI.address,
            ctx.MKR.address,
            amountUniForAddLiquidity,
            amountMkrForAddLiquidity,
            ethers.utils.parseEther("100000").toString(),
            ethers.utils.parseEther("100000").toString(),
            ctx.owner.address,
            startTime.add(time.duration.minutes(20)).toString()
          )
      ).to.be.revertedWith('execution reverted: UniswapV2Router: INSUFFICIENT_');
    });

    it('Add Liquidity with UNI, MKR', async () => {
      let balanceUNI = await ctx.UNI.balanceOf(ctx.owner.address);
      let balanceMKR = await ctx.MKR.balanceOf(ctx.owner.address);

      startTime = await time.latest();
      const tx = await ctx.UniswapV2Router.connect(ctx.owner).addLiquidity(
        ctx.UNI.address,
        ctx.MKR.address,
        amountUniForAddLiquidity,
        amountMkrForAddLiquidity,
        0,
        0,
        ctx.owner.address,
        startTime.add(time.duration.minutes(20)).toString()
      );
      await tx.wait(1);

      let balanceUNINew = await ctx.UNI.balanceOf(ctx.owner.address);
      let balanceMKRNew = await ctx.MKR.balanceOf(ctx.owner.address);

      assert.equal(balanceUNINew.lt(balanceUNI), true, 'UNI balance of owner should be decreased');
      assert.equal(balanceMKRNew.lt(balanceMKR), true, 'MKR balance of owner should be decreased');
    });
  });

  describe("removeLiquidity", async () => {
    it("Only ERC20 token should be used", async () => {
      startTime = await time.latest();
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .removeLiquidity(
            ctx.owner.address,
            ctx.MKR.address,
            amountLiquidityForRemoveLiquidity,
            0,
            0,
            ctx.owner.address,
            startTime.add(time.duration.minutes(20)).toString()
          )
      ).to.be.reverted;
    });

    it("Cannot claim over LP token balance", async () => {
      startTime = await time.latest();
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .removeLiquidity(
            ctx.UNI.address,
            ctx.MKR.address,
            ethers.utils.parseEther("1000").toString(),
            0,
            0,
            ctx.owner.address,
            startTime.add(time.duration.minutes(20)).toString()
          )
      ).to.be.reverted;
    });

    it('Desired amount of token A cannot be more than minimum', async () => {
      startTime = await time.latest();
      let balanceLP = await ctx.UniswapV2PairUNItoMKR.balanceOf(ctx.owner.address);
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .removeLiquidity(
            ctx.UNI.address,
            ctx.MKR.address,
            balanceLP.toString(),
            ethers.utils.parseEther("1000").toString(),
            0,
            ctx.owner.address,
            startTime.add(time.duration.minutes(20)).toString()
          )
      ).to.be.revertedWith('UniswapV2Router: INSUFFICIENT_A_AMOUNT');
    });

    it('Desired amount of token B cannot be more than minimum', async () => {
      startTime = await time.latest();
      let balanceLP = await ctx.UniswapV2PairUNItoMKR.balanceOf(ctx.owner.address);
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .removeLiquidity(
            ctx.UNI.address,
            ctx.MKR.address,
            balanceLP.toString(),
            0,
            ethers.utils.parseEther("1000").toString(),
            ctx.owner.address,
            startTime.add(time.duration.minutes(20)).toString()
          )
      ).to.be.revertedWith('UniswapV2Router: INSUFFICIENT_B_AMOUNT');
    });

    it('Remove Liquidity with UNI, MKR', async () => {
      let balanceUNI = await ctx.UNI.balanceOf(ctx.owner.address);
      let balanceMKR = await ctx.MKR.balanceOf(ctx.owner.address);
      let balanceLP = await ctx.UniswapV2PairUNItoMKR.balanceOf(ctx.owner.address);

      startTime = await time.latest();
      const tx = await ctx.UniswapV2Router.connect(ctx.owner).removeLiquidity(
        ctx.UNI.address,
        ctx.MKR.address,
        amountLiquidityForRemoveLiquidity,
        0,
        0,
        ctx.owner.address,
        startTime.add(time.duration.minutes(20)).toString()
      );
      await tx.wait(1);

      let balanceUNINew = await ctx.UNI.balanceOf(ctx.owner.address);
      let balanceMKRNew = await ctx.MKR.balanceOf(ctx.owner.address);
      let balanceLPNew = await ctx.UniswapV2PairUNItoMKR.balanceOf(ctx.owner.address);

      assert.equal(balanceUNINew.gt(balanceUNI), true, 'UNI balance of owner should be increased');
      assert.equal(balanceMKRNew.gt(balanceMKR), true, 'MKR balance of owner should be increased');
      assert.equal(balanceLPNew.lt(balanceLP), true, 'LP Token balance of owner should be decreased');
    });
  });

  describe("addLiquidityETH", async () => {
    it("Only ERC20 token should be used", async () => {
      startTime = await time.latest();
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .addLiquidityETH(
            ctx.owner.address,
            amountUniForAddLiquidity,
            0,
            0,
            ctx.owner.address,
            startTime.add(time.duration.minutes(20)).toString(),
            {
              value: amountEthForAddLiquidity
            }
          )
      ).to.be.reverted;
    });

    it("Desired amount of token cannot be more than balance", async () => {
      startTime = await time.latest();
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .addLiquidityETH(
            ctx.UNI.address,
            ethers.utils.parseEther("1000").toString(),
            ethers.utils.parseEther("0.1").toString(),
            0,
            ctx.owner.address,
            startTime.add(time.duration.minutes(20)).toString(),
            {
              value: amountEthForAddLiquidity
            }
          )
      ).to.be.revertedWith('UniswapV2Router: INSUFFICIENT_A_AMOUNT');
    });

    it("Desired amount of ETH cannot be more than balance", async () => {
      startTime = await time.latest();
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .addLiquidityETH(
            ctx.UNI.address,
            amountUniForAddLiquidity,
            0,
            ethers.utils.parseEther("10000").toString(),
            ctx.owner.address,
            startTime.add(time.duration.minutes(20)).toString(),
            {
              value: amountEthForAddLiquidity
            }
          )
      ).to.be.revertedWith('UniswapV2Router: INSUFFICIENT_B_AMOUNT');
    });

    it("Amount of token, ETH cannot be more than minimum", async () => {
      startTime = await time.latest();
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .addLiquidityETH(
            ctx.UNI.address,
            amountUniForAddLiquidity,
            ethers.utils.parseEther("0.2").toString(),
            ethers.utils.parseEther("100000").toString(),
            ctx.owner.address,
            startTime.add(time.duration.minutes(20)).toString(),
            {
              value: amountEthForAddLiquidity
            }
          )
      ).to.be.revertedWith('UniswapV2Router: INSUFFICIENT_');
    });

    it('Add Liquidity with UNI, ETH', async () => {
      let balanceUNI = await ctx.UNI.balanceOf(ctx.owner.address);
      let balanceETH = await provider.getBalance(ctx.owner.address);
      let balanceLP = await ctx.UniswapV2PairUNItoETH.balanceOf(ctx.owner.address);

      startTime = await time.latest();
      const tx = await ctx.UniswapV2Router.connect(ctx.owner).addLiquidityETH(
        ctx.UNI.address,
        amountUniForAddLiquidity,
        0,
        0,
        ctx.owner.address,
        startTime.add(time.duration.minutes(20)).toString(),
        {
          value: amountEthForAddLiquidity,
        }
      );
      await tx.wait(1);

      let balanceUNINew = await await ctx.UNI.balanceOf(ctx.owner.address);
      let balanceETHNew = await provider.getBalance(ctx.owner.address);
      let balanceLPNew = await ctx.UniswapV2PairUNItoETH.balanceOf(ctx.owner.address);

      assert.equal(balanceUNINew.lt(balanceUNI), true, 'UNI balance of owner should be decreased');
      assert.equal(balanceETHNew.lt(balanceETH), true, 'ETH balance of owner should be decreased');
      assert.equal(balanceLPNew.gt(balanceLP), true, 'LP Token balance of owner should be increased');
    });
  });

  describe("removeLiquidityETH", async () => {
    it("Only ERC20 token should be used", async () => {
      startTime = await time.latest();
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .removeLiquidityETH(
            ctx.owner.address,
            amountLiquidityForRemoveLiquidity,
            0,
            0,
            ctx.owner.address,
            startTime.add(time.duration.minutes(20)).toString()
          )
      ).to.be.reverted;
    });

    it("Cannot claim over LP token balance", async () => {
      startTime = await time.latest();
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .removeLiquidityETH(
            ctx.UNI.address,
            ethers.utils.parseEther("1000").toString(),
            0,
            0,
            ctx.owner.address,
            startTime.add(time.duration.minutes(20)).toString()
          )
      ).to.be.revertedWith('execution reverted: ds-math-sub-underflow');
    });

    it('Desired amount of token cannot be more than minimum', async () => {
      startTime = await time.latest();
      let balanceLP = await ctx.UniswapV2PairUNItoETH.balanceOf(ctx.owner.address);

      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .removeLiquidityETH(
            ctx.UNI.address,
            balanceLP.toString(),
            ethers.utils.parseEther("1000").toString(),
            0,
            ctx.owner.address,
            startTime.add(time.duration.minutes(20)).toString()
          )
      ).to.be.revertedWith('UniswapV2Router: INSUFFICIENT_A_AMOUNT');
    });

    it('Desired amount of ETH cannot be more than minimum', async () => {
      startTime = await time.latest();
      let balanceLP = await ctx.UniswapV2PairUNItoETH.balanceOf(ctx.owner.address);

      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .removeLiquidityETH(
            ctx.UNI.address,
            balanceLP.toString(),
            0,
            ethers.utils.parseEther("1000").toString(),
            ctx.owner.address,
            startTime.add(time.duration.minutes(20)).toString()
          )
      ).to.be.revertedWith('UniswapV2Router: INSUFFICIENT_B_AMOUNT');
    });

    it('Remove Liquidity with ETH UNI', async () => {
      let balanceUNI = await ctx.UNI.balanceOf(ctx.owner.address);
      // let balanceETH = await provider.getBalance(ctx.owner.address);
      let balanceLP = await ctx.UniswapV2PairUNItoETH.balanceOf(ctx.owner.address);

      startTime = await time.latest();
      const tx = await ctx.UniswapV2Router.connect(ctx.owner).removeLiquidityETH(
        ctx.UNI.address,
        amountLiquidityForRemoveLiquidity,
        0,
        0,
        ctx.owner.address,
        startTime.add(time.duration.minutes(20)).toString()
      );
      await tx.wait(1);

      let balanceUNINew = await ctx.UNI.balanceOf(ctx.owner.address);
      // let balanceETHNew = await provider.getBalance(ctx.owner.address);
      let balanceLPNew = await ctx.UniswapV2PairUNItoETH.balanceOf(ctx.owner.address);

      assert.equal(balanceUNINew.gt(balanceUNI), true, 'UNI balance of owner should be increased');
      // assert.equal(balanceETHNew.gt(balanceETH), true, 'ETH balance of owner should be increased');
      assert.equal(balanceLPNew.lt(balanceLP), true, 'LP Token balance of owner should be decreased');
    });
  });

  // describe("Rollback preparation", async () => {
  //   it("swap MKR for UNI", async () => {
  //     startTime = await time.latest();
  //     let balanceMKR = await ctx.MKR.balanceOf(ctx.owner.address);
  //     const tx = await ctx.UniswapV2Router
  //       .connect(ctx.owner)
  //       .swapExactTokensForTokens(
  //         balanceMKR,
  //         0,
  //         [ctx.MKR.address, ctx.UNI.address],
  //         ctx.owner.address,
  //         startTime.add(time.duration.minutes(20)).toString()
  //       );
  //     await tx.wait(1);
  //   });

  //   it("swap UNI for WETH", async () => {
  //     startTime = await time.latest();
  //     let balanceUNI = await ctx.UNI.balanceOf(ctx.owner.address);
  //     const tx = await ctx.UniswapV2Router
  //       .connect(ctx.owner)
  //       .swapExactTokensForETH(
  //         balanceUNI.toString(),
  //         0,
  //         [ctx.UNI.address, ctx.WETH.address],
  //         ctx.owner.address,
  //         startTime.add(time.duration.minutes(20)).toString()
  //       );
  //     await tx.wait(1);
  //   });
  // });
};
 