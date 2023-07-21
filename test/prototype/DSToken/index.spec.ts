import minting from "./suites/mint.test";
import claiming from "./suites/claim.test";

describe("DSToken", function () {
  describe("When minting", minting.bind(this));
  describe("When claiming", claiming.bind(this));
});
