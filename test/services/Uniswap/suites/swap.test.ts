import dotenv from "dotenv";

import { expect } from "chai";
import { Contract, ethers, Wallet } from "ethers";
import IERC20 from "@openzeppelin/contracts/build/contracts/IERC20.json";
import IUniswapV2Router02 from '@uniswap/v2-periphery/build/IUniswapV2Router02.json';
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

  // Test Amount
  const swapExactETH = ethers.utils.parseEther("0.0001").toString();
  const swapExactUNI = ethers.utils.parseEther("0.001").toString();

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
  });

  xdescribe("Preparation", async () => {
    // it("Approve router for WETH", async () => {
    //   await ctx.WETH.connect(ctx.owner).approve(ctx.UniswapV2Router.address, ethers.utils.parseEther("10").toString());
    // });

    it("Approve router for UNI", async () => {
      await ctx.UNI.connect(ctx.owner).approve(ctx.UniswapV2Router.address, ethers.utils.parseEther("10").toString());
    });

    it("Approve router for MKR", async () => {
      await ctx.MKR.connect(ctx.owner).approve(ctx.UniswapV2Router.address, ethers.utils.parseEther("10").toString());
    });
  });

  describe("swapExactETHForTokens", async () => {
    it("ETH path should be matched", async () => {
      startTime = await time.latest();
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .swapExactETHForTokens(
            0,
            [ctx.owner.address, ctx.UNI.address],
            ctx.owner.address,
            startTime.add(time.duration.minutes(10)).toString(),
            {
              value: swapExactETH
            }
          )
      ).to.be.revertedWith('UniswapV2Router: INVALID_PATH');
    });

    it("Pool for token should be exist", async () => {
      startTime = await time.latest();
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .swapExactETHForTokens(
            0,
            [ctx.WETH.address, ctx.owner.address],
            ctx.owner.address,
            startTime.add(time.duration.minutes(10)).toString(),
            {
              value: swapExactETH
            }
          )
      ).to.be.reverted;
    });

    it("Cannot swap less than in token minumum", async () => {
      startTime = await time.latest();
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .swapExactETHForTokens(
            ethers.utils.parseEther("10000").toString(),
            [ctx.WETH.address, ctx.UNI.address],
            ctx.owner.address,
            startTime.add(time.duration.minutes(10)).toString(),
            {
              value: swapExactETH
            }
          )
      ).to.be.reverted;
    });

    it("swap ETH for UNI", async () => {
      startTime = await time.latest();

      let balanceETH = await provider.getBalance(ctx.owner.address);
      let balanceUNI = await ctx.UNI.balanceOf(ctx.owner.address);

      const tx = await ctx.UniswapV2Router
        .connect(ctx.owner)
        .swapExactETHForTokens(
          0,
          [ctx.WETH.address, ctx.UNI.address],
          ctx.owner.address,
          startTime.add(time.duration.minutes(10)).toString(),
          {
            value: swapExactETH
          }
        );
      await tx.wait(1);

      let balanceETHNew = await provider.getBalance(ctx.owner.address);
      let balanceUNINew = await ctx.UNI.balanceOf(ctx.owner.address);

      expect(balanceUNINew.gt(balanceUNI)).to.be.eql(
        true,
        "UNI balance of owner should be increased"
      );
      expect(balanceETHNew.lt(balanceETH)).to.be.eql(
        true,
        "ETH balance of owner should be decreased"
      );
    });
  });

  describe("swapExactTokensForTokens", async () => {
    it("Pool for tokens should be exist", async () => {
      startTime = await time.latest();
      await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .swapExactTokensForTokens(
            swapExactUNI,
            0,
            [ctx.owner.address, ctx.UNI.address],
            ctx.owner.address,
            startTime.add(time.duration.minutes(10)).toString()
          )
      ).to.be.reverted;

      await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .swapExactTokensForTokens(
            swapExactUNI,
            0,
            [ctx.UNI.address, ctx.owner.address],
            ctx.owner.address,
            startTime.add(time.duration.minutes(10)).toString()
          )
      ).to.be.reverted;
    });

    it("Cannot swap more than token balance", async () => {
      startTime = await time.latest();
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .swapExactTokensForTokens(
            ethers.utils.parseEther("100").toString(),
            0,
            [ctx.UNI.address, ctx.MKR.address],
            ctx.owner.address,
            startTime.add(time.duration.minutes(10)).toString()
          )
      ).to.be.revertedWith('execution reverted: TransferHelper: TRANSFER_FROM_FAILED');
    });

    it("Cannot swap less in token minumum", async () => {
      startTime = await time.latest();
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .swapExactTokensForTokens(
            swapExactUNI,
            ethers.utils.parseEther("10000").toString(),
            [ctx.UNI.address, ctx.MKR.address],
            ctx.owner.address,
            startTime.add(time.duration.minutes(10)).toString()
          )
      ).to.be.revertedWith('UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');
    });

    it("swap UNI for MKR", async () => {
      startTime = await time.latest();

      let balanceUNI = await ctx.UNI.balanceOf(ctx.owner.address);
      let balanceMKR = await ctx.MKR.balanceOf(ctx.owner.address);

      const tx = await ctx.UniswapV2Router
        .connect(ctx.owner)
        .swapExactTokensForTokens(
          swapExactUNI,
          0,
          [ctx.UNI.address, ctx.MKR.address],
          ctx.owner.address,
          startTime.add(time.duration.minutes(10)).toString()
        );
      await tx.wait(1);

      let balanceUNINew = await ctx.UNI.balanceOf(ctx.owner.address);
      let balanceMKRNew = await ctx.MKR.balanceOf(ctx.owner.address);

      expect(
        balanceUNINew.add(ethers.utils.parseEther("0.001")).toString()
      ).to.be.eql(
        balanceUNI.toString(),
        "UNI balance of owner should be decreased by " +
        swapExactUNI
      );
      expect(balanceMKRNew.gt(balanceMKR)).to.be.eql(
        true,
        "MKR balance of owner should be increased"
      );
    });
  });

  describe("swapExactTokensForETH", async () => {
    it("ETH path should be matched", async () => {
      startTime = await time.latest();
      await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .swapExactTokensForETH(
            swapExactUNI,
            0,
            [ctx.UNI.address, ctx.owner.address],
            ctx.owner.address,
            startTime.add(time.duration.minutes(10)).toString()
          )
      ).to.be.revertedWith('UniswapV2Router: INVALID_PATH');
    });

    it("Pool for token should be exist", async () => {
      startTime = await time.latest();
      await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .swapExactTokensForETH(
            swapExactUNI,
            0,
            [ctx.owner.address, ctx.WETH.address],
            ctx.owner.address,
            startTime.add(time.duration.minutes(10)).toString()
          )
      ).to.be.reverted;
    });

    it("Cannot swap more than token balance", async () => {
      startTime = await time.latest();
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .swapExactTokensForETH(
            ethers.utils.parseEther("100").toString(),
            0,
            [ctx.UNI.address, ctx.WETH.address],
            ctx.owner.address,
            startTime.add(time.duration.minutes(10)).toString()
          )
      ).to.be.revertedWith('execution reverted: TransferHelper: TRANSFER_FROM_FAILED');
    });

    it("Cannot swap less than ETH mininum", async () => {
      startTime = await time.latest();
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .swapExactTokensForETH(
            swapExactUNI,
            ethers.utils.parseEther("100000").toString(),
            [ctx.UNI.address, ctx.WETH.address],
            ctx.owner.address,
            startTime.add(time.duration.minutes(10)).toString()
          )
      ).to.be.revertedWith('UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');
    });

    it("swap UNI for ETH", async () => {
      startTime = await time.latest();

      let balanceUNI = await ctx.UNI.balanceOf(ctx.owner.address);
      let balanceETH = await provider.getBalance(ctx.owner.address);

      const tx = await ctx.UniswapV2Router
        .connect(ctx.owner)
        .swapExactTokensForETH(
          swapExactUNI,
          0,
          [ctx.UNI.address, ctx.WETH.address],
          ctx.owner.address,
          startTime.add(time.duration.minutes(10)).toString()
        );
      await tx.wait(1);

      let balanceUNINew = await ctx.UNI.balanceOf(ctx.owner.address);
      let balanceETHNew = await provider.getBalance(ctx.owner.address);

      expect(
        balanceUNINew.add(ethers.utils.parseEther("0.001")).toString()
      ).to.be.eql(
        balanceUNI.toString(),
        "UNI balance of owner should be decreased by " +
        swapExactUNI
      );
      expect(balanceETHNew.gt(balanceETH)).to.be.eql(
        true,
        "ETH balance of owner should be increased"
      );
    });
  });

  describe("swapETHForExactTokens", async () => {
    it("ETH path should be matched", async () => {
      startTime = await time.latest();
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .swapETHForExactTokens(
            swapExactUNI,
            [ctx.owner.address, ctx.UNI.address],
            ctx.owner.address,
            startTime.add(time.duration.minutes(10)).toString(),
            {
              value: swapExactETH
            }
          )
      ).to.be.revertedWith('UniswapV2Router: INVALID_PATH');
    });

    it("Pool for token should be exist", async () => {
      startTime = await time.latest();
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .swapETHForExactTokens(
            swapExactUNI,
            [ctx.WETH.address, ctx.owner.address],
            ctx.owner.address,
            startTime.add(time.duration.minutes(10)).toString(),
            {
              value: swapExactETH
            }
          )
      ).to.be.reverted;
    });

    it("Cannot swap more than token balance", async () => {
      startTime = await time.latest();
      const tx = await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .swapETHForExactTokens(
            ethers.utils.parseEther("10000").toString(),
            [ctx.WETH.address, ctx.UNI.address],
            ctx.owner.address,
            startTime.add(time.duration.minutes(10)).toString(),
            {
              value: swapExactETH
            }
          )
      ).to.be.reverted;
    });

    it("Cannot swap more than ETH limit", async () => {
      startTime = await time.latest();
      await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .swapETHForExactTokens(
            swapExactUNI,
            [ctx.WETH.address, ctx.UNI.address],
            ctx.owner.address,
            startTime.add(time.duration.minutes(10)).toString(),
            {
              value: ethers.utils.parseEther("0.0000001").toString(),
            }
          )
      ).to.be.revertedWith('UniswapV2Router: EXCESSIVE_INPUT_AMOUNT');
    });

    it("swap ETH for UNI", async () => {
      startTime = await time.latest();

      let balanceETH = await provider.getBalance(ctx.owner.address);
      let balanceUNI = await ctx.UNI.balanceOf(ctx.owner.address);

      const tx = await ctx.UniswapV2Router
        .connect(ctx.owner)
        .swapETHForExactTokens(
          swapExactUNI,
          [ctx.WETH.address, ctx.UNI.address],
          ctx.owner.address,
          startTime.add(time.duration.minutes(10)).toString(),
          {
            value: ethers.utils.parseEther("0.001").toString(),
          }
        );
      await tx.wait(1);

      let balanceETHNew = await provider.getBalance(ctx.owner.address);
      let balanceUNINew = await ctx.UNI.balanceOf(ctx.owner.address);

      expect(
        balanceUNI.add(ethers.utils.parseEther("0.001")).toString()
      ).to.be.eql(
        balanceUNINew.toString(),
        "UNI balance of owner should be increased by " +
          ethers.utils.parseEther("0.001").toString()
      );
      expect(balanceETHNew.lt(balanceETH)).to.be.eql(
        true,
        "ETH balance of owner should be decreased"
      );
    });
  });

  describe("swapTokensForExactTokens", async () => {
    it("Pool for token should be exist", async () => {
      startTime = await time.latest();
      await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .swapTokensForExactTokens(
            swapExactETH,
            swapExactUNI,
            [ctx.UNI.address, ctx.owner.address],
            ctx.owner.address,
            startTime.add(time.duration.minutes(10)).toString()
          )
      ).to.be.reverted;

      await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .swapTokensForExactTokens(
            swapExactETH,
            swapExactUNI,
            [ctx.owner.address, ctx.MKR.address],
            ctx.owner.address,
            startTime.add(time.duration.minutes(10)).toString()
          )
      ).to.be.reverted;
    });

    it("Cannot swap more than out token balance", async () => {
      startTime = await time.latest();
      await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .swapTokensForExactTokens(
            ethers.utils.parseEther("10000").toString(),
            ethers.utils.parseEther("0.1").toString(),
            [ctx.UNI.address, ctx.MKR.address],
            ctx.owner.address,
            startTime.add(time.duration.minutes(10)).toString()
          )
      ).to.be.reverted;
    });

    it("swap UNI for MKR", async () => {
      startTime = await time.latest();

      let balanceUNI = await ctx.UNI.balanceOf(ctx.owner.address);
      let balanceMKR = await ctx.MKR.balanceOf(ctx.owner.address);

      const tx = await ctx.UniswapV2Router
        .connect(ctx.owner)
        .swapTokensForExactTokens(
          ethers.utils.parseEther("0.000001").toString(),
          ethers.utils.parseEther("0.01").toString(),
          [ctx.UNI.address, ctx.MKR.address],
          ctx.owner.address,
          startTime.add(time.duration.minutes(10)).toString()
        );
      await tx.wait(1);

      let balanceUNINew = await ctx.UNI.balanceOf(ctx.owner.address);
      let balanceMKRNew = await ctx.MKR.balanceOf(ctx.owner.address);

      expect(
        balanceMKR.add(ethers.utils.parseEther("0.000001")).toString()
      ).to.be.eql(
        balanceMKRNew.toString(),
        "MKR balance of owner should be increased by " +
          ethers.utils.parseEther("0.000001").toString()
      );
      expect(balanceUNINew.lt(balanceUNI)).to.be.eql(
        true,
        "UNI balance of owner should be decreased"
      );
    });
  });

  describe("swapTokensForExactETH", async () => {
    it("ETH path should be matched", async () => {
      startTime = await time.latest();
      await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .swapTokensForExactETH(
            swapExactETH,
            swapExactUNI,
            [ctx.UNI.address, ctx.owner.address],
            ctx.owner.address,
            startTime.add(time.duration.minutes(10)).toString()
          )
      ).to.be.revertedWith('UniswapV2Router: INVALID_PATH');
    });

    it("Pool for token should be exist", async () => {
      startTime = await time.latest();
      await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .swapTokensForExactETH(
            swapExactETH,
            swapExactUNI,
            [ctx.owner.address, ctx.WETH.address],
            ctx.owner.address,
            startTime.add(time.duration.minutes(10)).toString()
          )
      ).to.be.reverted;
    });

    it("Cannot swap more than token balance", async () => {
      startTime = await time.latest();
      await expect(
        ctx.UniswapV2Router
          .connect(ctx.owner)
          .swapTokensForExactETH(
            ethers.utils.parseEther("0.1").toString(),
            ethers.utils.parseEther("10000").toString(),
            [ctx.UNI.address, ctx.WETH.address],
            ctx.owner.address,
            startTime.add(time.duration.minutes(10)).toString()
          )
      ).to.be.revertedWith;
    });

    it("swap UNI for ETH", async () => {
      startTime = await time.latest();

      // let balanceETH = await provider.getBalance(ctx.owner.address);
      let balanceUNI = await ctx.UNI.balanceOf(ctx.owner.address);

      const tx = await ctx.UniswapV2Router
        .connect(ctx.owner)
        .swapTokensForExactETH(
          ethers.utils.parseEther("0.001").toString(),
          ethers.utils.parseEther("0.005").toString(),
          [ctx.UNI.address, ctx.WETH.address],
          ctx.owner.address,
          startTime.add(time.duration.minutes(10)).toString()
        );
      await tx.wait(1);

      // let balanceETHNew = await provider.getBalance(ctx.owner.address);
      let balanceUNINew = await ctx.UNI.balanceOf(ctx.owner.address);

      // expect(
      //   balanceETH.add(ethers.utils.parseEther("0.0001")).toString()
      // ).to.be.eql(
      //   balanceETHNew.toString(),
      //   "ETH balance of owner should be increased by " +
      //     ethers.utils.parseEther("1").toString()
      // );
      expect(balanceUNINew.lt(balanceUNI)).to.be.eql(
        true,
        "UNI balance of owner should be decreased"
      );
    });
  });
};
 