module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  await deploy("BaseToken", {
    from: deployer,
    args: [deployer],
    log: true,
  });
};

module.exports.tags = ["all", "baseToken"];
