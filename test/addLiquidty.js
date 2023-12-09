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

      await protocalToken.updateMinter(await openSwap.getAddress(), true);
  
      return { protocalToken , openSwap, owner, otherAccount };
    }
  
    describe("Add liquidity", function () {
      it("Add liquidty to specific token", async function () {
        const { protocalToken, openSwap, owner, otherAccount } = await loadFixture(deployOpenProtocalFixture);

        await openSwap.addToken(tokenInfo.WETH.address,tokenInfo.WETH.priceFeed);
        await openSwap.addToken(tokenInfo.LINK.address,tokenInfo.LINK.priceFeed);

        const impersonatedSigner = await ethers.getImpersonatedSigner("0x4281eCF07378Ee595C564a59048801330f3084eE");

        const LINKtoken = await ethers.getContractAt('IToken','0x779877A7B0D9E8603169DdbD7836e478b4624789');

        const balanceOfImpersonte = await LINKtoken.balanceOf('0x4281eCF07378Ee595C564a59048801330f3084eE');
        console.log("balance ",balanceOfImpersonte);

        await LINKtoken.connect(impersonatedSigner).approve(await openSwap.getAddress(), ethers.parseEther("50"));

        const addLiquidity = await openSwap.connect(impersonatedSigner).addLiquidity(await LINKtoken.getAddress(), ethers.parseEther("50"));

        const balanceOfUserInProtocalTokens = await protocalToken.balanceOf(impersonatedSigner.address);
        console.log("blance of user in protocal balance ", balanceOfUserInProtocalTokens);

        const poolInfo = await openSwap.tokenInfo(await LINKtoken.getAddress());
        console.log("token info ", poolInfo)
      });
    });
  });