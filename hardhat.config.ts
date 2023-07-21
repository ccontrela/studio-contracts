import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (_, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.14",
    settings: {
      optimizer: {
        enabled: process.env.DEBUG ? false : true,
        runs: 200,
      },
      outputSelection: {
        "*": {
          "*": ["storageLayout"],
        },
      },
    },
  },
  networks: {
    rinkeby: {
      url: process.env.RINKEBY_RPC_URL ?? "",
      accounts: [process.env.RINKEBY_PRIVATE_KEY ?? ""],
    },
    // ropsten: {
    //   url: process.env.ROPSTEN_RPC_URL ?? "",
    //   accounts: [process.env.ROPSTEN_PRIVATE_KEY ?? ""],
    // },
    mainnet: {
      url: process.env.MAINNET_RPC_URL ?? "",
      // accounts: [process.env.MAINNET_PRIVATE_KEY ?? ""],
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    hardhat: {
      chainId: 1337,
      // gasPrice: 1,
      // initialBaseFeePerGas: 0,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    // gasPrice: 60,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  mocha: {
    timeout: 1200000,
  },
};

export default config;
