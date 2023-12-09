require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');
require('dotenv').config()
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  // : "0.8.20",
  solidity: {
    compilers: [
      {
        version: "0.8.20",
      },
      {
        version: "0.7.5",
      },
    ],
  },
  networks: {
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/FiOto0Hqv9MYSt7EiVMXEKGBf5z4tDKZ`,
      accounts: [process.env.ADMIN_PRIVATE_KEY]
    },
    // hardhat: {
    //   forking: {
    //     url: "https://eth-sepolia.g.alchemy.com/v2/FiOto0Hqv9MYSt7EiVMXEKGBf5z4tDKZ",
    //     blockNumber: 4849510
    //   }
    // }
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_SEPOLIA_API_KEY,
    }
  },
};
