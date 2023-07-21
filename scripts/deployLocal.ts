import * as dotenv from "dotenv";
import { BigNumber, Signer } from "ethers";
import hre, { ethers } from "hardhat";
import keccak256 from "keccak256";
import MerkleTree from "merkletreejs";
import {
  DStudioFundingToken,
  MasslessTreasury,
  StandardERC20,
} from "../typechain-types";
import { contractDeployment, writeContractData } from "./utils";

dotenv.config();

const network = hre.network.name;

// Settings //////////////////////////////////////////////////////////////

const settingsNetwork = "localhost";
const date = new Date().toJSON().replace(/-|:|T|\..*/g, "");
const dir = `deployment/${network}`;
const filename = `deployment-${date}.json`;

//////////////////////////////////////////////////////////////////////////

async function main() {
  // Global(ish) vars
  const [contractDeployer, contractOwner, investor1, investor2, investor3] =
    await ethers.getSigners();

  const investments: Array<{
    investor: Signer;
    address: string;
    amount: BigNumber;
  }> = [
    {
      investor: investor1,
      address: investor1.address,
      amount: ethers.utils.parseEther("50000"),
    },
    {
      investor: investor2,
      address: investor2.address,
      amount: ethers.utils.parseEther("200000"),
    },
    {
      investor: investor3,
      address: investor3.address,
      amount: ethers.utils.parseEther("500000"),
    },
  ].sort((i1, i2) => (i1.address > i2.address ? 1 : -1));

  // if (["hardhat", "localhost"].includes(network)) {
  //   const [testUser] = await ethers.getSigners();
  //   testUser.sendTransaction({
  //     to: await contractDeployer.getAddress(),
  //     value: ethers.utils.parseEther("200"),
  //   });
  // }

  let initialBalance: BigNumber;
  let mockUSDCContract: StandardERC20;
  let masslessTreasuryContract: MasslessTreasury;
  let dsTokenContract: DStudioFundingToken;

  console.log("***************************");
  console.log("*   Contract Deployment   *");
  console.log("***************************");
  console.log("\n");

  // Confirm Settings
  {
    console.log("Settings");
    console.log("Network:", network, settingsNetwork == network);
    // console.log(
    //   "Contract Owner Address:",
    //   contractOwner.address,
    //   ethers.utils.isAddress(contractOwner.address)
    // );
    console.log("\n");

    writeContractData(dir, filename, {
      date,
      network,
      // contractOwnerAddress: contractOwner.address,
    });
  }

  // Confirm Deployer
  {
    initialBalance = await contractDeployer.getBalance();

    console.log("Deployment Wallet");
    console.log("Address:", await contractDeployer.getAddress());
    console.log("Chainid: ", await contractDeployer.getChainId());
    console.log("Balance:", ethers.utils.formatEther(initialBalance), "Ether");
    console.log("\n");

    writeContractData(dir, filename, {
      deployerAddress: await contractDeployer.getAddress(),
    });
  }
  // Mock USDC Deployment
  {
    const args: (string | number)[] = [];
    mockUSDCContract = (await contractDeployment(
      contractDeployer,
      "StandardERC20",
      args,
      true
    )) as StandardERC20;

    writeContractData(dir, filename, {
      standardERC20Contract: mockUSDCContract.address,
    });

    // Three investors mint mock USDC tokens so that they can make investments later
    await mockUSDCContract
      .connect(investor1)
      .mint(ethers.utils.parseEther("100000"));
    await mockUSDCContract
      .connect(investor2)
      .mint(ethers.utils.parseEther("300000"));
    await mockUSDCContract
      .connect(investor3)
      .mint(ethers.utils.parseEther("600000"));

    writeContractData(dir, filename, {
      investments: Object.fromEntries(
        investments.map((i) => [i.address, i.amount.toString()])
      ),
    });
  }

  // Massless Treasury Contract Deployment
  {
    const args: (string | number)[] = [];
    masslessTreasuryContract = (await contractDeployment(
      contractDeployer,
      "MasslessTreasury",
      args,
      true
    )) as MasslessTreasury;

    writeContractData(dir, filename, {
      masslessTreasuryContract: masslessTreasuryContract.address,
    });
  }

  // DStudioFundingToken Deployment
  {
    // string memory name_,
    // string memory symbol_,
    // address erc20Token_,
    // uint256 tokenPrice_, // fixed point 8
    // uint256 returnBasisPoints_, // fixed point 2
    // address masslessTreasury_
    const args: (string | number)[] = [
      "dStudio Funding Token",
      "DSFT",
      mockUSDCContract.address,
      "100000000", // fixed point 8 (1:1)
      "1000", // fixed point 2 (10%)
      masslessTreasuryContract.address,
    ];
    dsTokenContract = (await contractDeployment(
      contractDeployer,
      "DStudioFundingToken",
      args,
      true
    )) as DStudioFundingToken;

    writeContractData(dir, filename, {
      dStudioFundingTokenContract: dsTokenContract.address,
      dStudioFundingTokenArgs: args,
    });
  }

  // Fake Investment workflow
  {
    // Admin registers dsTokenContract to Massless Treasury contract
    await masslessTreasuryContract.addFundingContract(dsTokenContract.address);
    console.log(
      "Admin registered dsTokenContract to Massless Treasury contract"
    );

    // Admin opens the funding
    await dsTokenContract.open();
    console.log("Admin opened the investments!");

    // Three investors make their investments ( Totally 750000 USDC Invested )
    for (const investment of investments) {
      await mockUSDCContract
        .connect(investment.investor)
        .approve(
          masslessTreasuryContract.address,
          investment.amount.toString()
        );
      await dsTokenContract
        .connect(investment.investor)
        .fund(investment.amount.toString());
      console.log(
        `Investor[${
          investment.address
        }]: Invested ${investment.amount.toString()} USDC`
      );
    }

    // Admin closes the funding
    await dsTokenContract.close();
    console.log("Admin closed the investments!");

    // Admin withdraws the investmens to somewhere else
    await dsTokenContract.withdraw();
    console.log("Admin has withdrawn the investments!");

    // Admin deposits the profit
    await mockUSDCContract.mint(ethers.utils.parseEther("1000000"));

    // And we should get that value like the following
    const returnBasisPoints =
      (await dsTokenContract.returnBasisPoints()) as BigNumber;
    const totalReturnPercentage = returnBasisPoints.add(BigNumber.from(10000));

    const totalBalance = investments.reduce(
      (preV, curV) => preV.add(curV.amount),
      BigNumber.from(0)
    );
    const leaves = investments.map((investment) =>
      keccak256(
        ethers.utils.solidityPack(
          ["address", "uint256"],
          [
            investment.address,
            investment.amount
              // .mul(totalReturnPercentage)
              // .div(BigNumber.from(10000))
              .toString(),
          ]
        )
      )
    );
    const totalRecoupment = totalBalance
      .mul(totalReturnPercentage)
      .div(BigNumber.from(10000))
      .toString();
    const lastLeaf = keccak256(
      ethers.utils.solidityPack(
        ["address", "uint256"],
        [dsTokenContract.address, totalRecoupment]
      )
    );
    leaves.push(lastLeaf);
    const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const merkleRoot = merkleTree.getHexRoot();
    const merkleProof = merkleTree.getHexProof(lastLeaf);

    await mockUSDCContract.approve(
      masslessTreasuryContract.address,
      totalRecoupment // 825000 usdc = 110% of the total investment of 750000 usdc
    );
    await dsTokenContract.depositPref(merkleRoot, merkleProof);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
