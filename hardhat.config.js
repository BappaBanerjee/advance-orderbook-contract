require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */

require("@nomicfoundation/hardhat-ethers");
require("hardhat-deploy");
require("hardhat-deploy-ethers");
require("@nomicfoundation/hardhat-chai-matchers");

require("hardhat-contract-sizer");

module.exports = {
  solidity: "0.8.20",
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
};
