import liquidity from "./suites/liquidity.test";
import swap from "./suites/swap.test";

describe.skip("Uniswap", function () {
  describe("When liquidity", liquidity.bind(this));
  describe("When swap", swap.bind(this));
});
