import minting from "./suites/mint.test";
import funding from "./suites/fund.test";
import withdrawing from "./suites/withdraw.test";
import preferredReturn from "./suites/preferred.return.test";
import netCarry from "./suites/net.carry.test";

describe.only("DStudioFundingToken", function () {
  describe("When minting", minting.bind(this));
  describe("When funding", funding.bind(this));
  describe("When withdrawing", withdrawing.bind(this));
  describe("When preferred returning", preferredReturn.bind(this));
  describe("When net carry", netCarry.bind(this));
});
