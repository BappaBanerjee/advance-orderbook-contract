const { developmentChains } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const _contract = await deploy("OrderbookFactory", {
    from: deployer,
    args: [],
    log: true,
  });

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(_contract.address, []);
  }
};

module.exports.tags = ["all", "orderbookFactory"];
