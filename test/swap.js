const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const tokenInfo = require("../tokens.json");
const WETHabi = require("../contracts/abi/WETH.json")

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

        await openSwap.connect(impersonatedSigner).addLiquidity(await LINKtoken.getAddress(), ethers.parseEther("50"));

        const balanceOfUserInProtocalTokens = await protocalToken.balanceOf(impersonatedSigner.address);
        console.log("blance of user in protocal balance ", balanceOfUserInProtocalTokens);

        const poolInfo = await openSwap.tokenInfo(await LINKtoken.getAddress());
        console.log("token info ", poolInfo)

        const WETHtoken = await ethers.getContractAt(WETHabi, "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9");
        const totalSupply = await WETHtoken.totalSupply();
        console.log("total supply",totalSupply);

        const balance = await WETHtoken.balanceOf(otherAccount.address);
        console.log("balance ",balance);

        await WETHtoken.connect(otherAccount).deposit({value: ethers.parseEther("10")}); 

        const balance2 = await WETHtoken.balanceOf(otherAccount.address);
        console.log("balance ",balance2);

        await WETHtoken.connect(otherAccount).approve(await openSwap.getAddress(), ethers.parseEther("1"));

        const amountOut = await openSwap.quote(tokenInfo.WETH.address, tokenInfo.LINK.address, ethers.parseEther('0.2'))
        console.log("amount out ",amountOut, Number(amountOut[0]) / 10**18);

        const balanceBeforeLink = await LINKtoken.balanceOf(otherAccount.address);
        console.log("balance of user link before ", balanceBeforeLink);

        const balanceBeforeWeth = await WETHtoken.balanceOf(otherAccount.address);
        console.log("balance of user weth before ", balanceBeforeWeth);
        
        // performign swap here 
        await openSwap.connect(otherAccount).swap(await WETHtoken.getAddress(), await LINKtoken.getAddress(), ethers.parseEther("0.2"), ethers.parseEther("20"))
        
        const balanceAfterLink = await LINKtoken.balanceOf(otherAccount.address);
        console.log("balance of user link after ", balanceAfterLink);

        const balanceAfterWeth = await WETHtoken.balanceOf(otherAccount.address);
        console.log("balance of user weth after ", balanceAfterWeth);

      });
    });
  });