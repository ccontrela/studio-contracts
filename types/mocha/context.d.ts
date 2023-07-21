import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  DSToken,
  DSToken__factory,
  DSFundingToken,
  DSFundingToken__factory,
  DStudioFundingToken,
  DStudioFundingToken__factory,
  MasslessTreasury__factory,
  MasslessTreasury,
  StandardERC20,
  StandardERC20__factory,
} from "../../typechain-types";

declare module "mocha" {
  export interface Context {
    owner: SignerWithAddress;
    signer: SignerWithAddress;
    approved: SignerWithAddress;
    admin: SignerWithAddress;
    mod: SignerWithAddress;
    user1: SignerWithAddress;
    user2: SignerWithAddress;
    user3: SignerWithAddress;
    user4: SignerWithAddress;
    user5: SignerWithAddress;
    user6: SignerWithAddress;
    user7: SignerWithAddress;
    user8: SignerWithAddress;
    user9: SignerWithAddress;
    nullAddress: string;
    dsTokenFactory: DSToken__factory;
    dsTokenContract: DSToken;
    dsFundingTokenFactory: DSFundingToken__factory;
    dsFundingTokenContract: DSFundingToken;
    dStudioFundingTokenFactory: DStudioFundingToken__factory;
    dStudioFundingTokenContract: DStudioFundingToken;
    masslessTreasuryFactory: MasslessTreasury__factory;
    masslessTreasuryContract: MasslessTreasury;
    standardERC20Factory: StandardERC20__factory;
    standardERC20Contract: StandardERC20;
  }
}
