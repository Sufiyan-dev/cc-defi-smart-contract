const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const tokenInfo = require("../tokens.json");

  describe("Open Swap", function () {
    async function deployOpenProtocalFixture() {
      // Contracts are deployed using the first signer/account by default
      const [owner, otherAccount] = await ethers.getSigners();

      const ProtocalToken = await ethers.getContractFactory("MyToken");
      const protocalToken = await ProtocalToken.deploy(owner.address);

      const protocalTokenAddress = await protocalToken.getAddress();
  
      const OpenSwap = await ethers.getContractFactory("OpenSwap");
      const openSwap = await upgrades.deployProxy(OpenSwap,[owner.address, protocalTokenAddress, 5000, 3000])
  
      return { protocalToken , openSwap, owner, otherAccount };
    }
  
    describe("Quote", function () {
      it("Add the new token", async function () {
        const { protocalToken, openSwap, owner, otherAccount } = await loadFixture(deployOpenProtocalFixture);

        await openSwap.addToken(tokenInfo.WETH.address,tokenInfo.WETH.priceFeed);
        await openSwap.addToken(tokenInfo.LINK.address,tokenInfo.LINK.priceFeed);

        const amountOut = await openSwap.quote(tokenInfo.WETH.address, tokenInfo.LINK.address, ethers.parseEther('1.5'))
        console.log("amount out ",amountOut, Number(amountOut) / 10**18)

        const amountOut2 = await openSwap.quote(tokenInfo.LINK.address, tokenInfo.WETH.address, ethers.parseEther('1'))
        console.log("amount out ",amountOut2, Number(amountOut2) / 10**18)
      });
    });
  });