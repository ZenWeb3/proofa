import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import "@nomicfoundation/hardhat-verify";


dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    aeneid: {
      url: process.env.STORY_RPC_URL || "https://aeneid.storyrpc.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1315,
    },
  },
  etherscan: {
    apiKey: {
      aeneid: "any-string-works",
    },
    customChains: [
      {
        network: "aeneid",
        chainId: 1315,
        urls: {
          apiURL: "https://aeneid.storyscan.io/api",
          browserURL: "https://aeneid.storyscan.io",
        },
      },
    ],
  },
};

export default config;
