import claiming from "./suites/claim.test";
import funding from "./suites/fund.test";
import minting from "./suites/mint.test";
import sharing from "./suites/share.test";

describe("DSFundingToken", function () {
  describe("When claiming", claiming.bind(this));
  describe("When funding", funding.bind(this));
  describe("When minting", minting.bind(this));
  describe("When revenue sharing", sharing.bind(this));
});
