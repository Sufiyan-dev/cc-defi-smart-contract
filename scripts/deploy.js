const { ethers, upgrades } = require("hardhat");

async function main() {
  const protocalFee = 5000;
  const rewardPerBlock = 3000;
  const [signer] = await ethers.getSigners();
  console.log("singer ", signer.address);

  const protocalToken = await ethers.getContractFactory("OpenSwapToken");
  const ProtocalToken = await protocalToken.deploy(signer.address);

  ProtocalToken.waitForDeployment();

  console.log(`Protocal token deployed at ${await ProtocalToken.getAddress()}`);

  const openSwap = await ethers.getContractFactory("OpenSwap");
  const OpenSwap = await upgrades.deployProxy(openSwap,[signer.address, await ProtocalToken.getAddress(), protocalFee, rewardPerBlock])

  await OpenSwap.waitForDeployment();

  console.log(`OpenSwap deployed at ${await OpenSwap.getAddress()}`);

  await ProtocalToken.updateMinter(await OpenSwap.getAddress(), true);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
