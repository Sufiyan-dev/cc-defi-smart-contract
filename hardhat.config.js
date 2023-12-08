require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');
require('dotenv').config()
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
     hardhat: {
      forking: {
        url: "https://eth-sepolia.g.alchemy.com/v2/FiOto0Hqv9MYSt7EiVMXEKGBf5z4tDKZ",
      }
    }
  }
};
