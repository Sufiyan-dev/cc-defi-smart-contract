// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "hardhat/console.sol";

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);

    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);

    function mint(address to, uint256 amount) external;

    function totalSupply() external view returns (uint256);
    function decimals() external  view returns (uint8);
    function burn(uint256 value) external;
    function burnFrom(address account, uint256 value) external;
}

interface IAggregatorInterface {
    function latestAnswer() external view returns (int256);
    function decimals() external view returns (uint8);
}

contract OpenSwap is
    Initializable,
    PausableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    struct TokenDetails {
        address priceFeedAddress;
        uint256 poolBalance;
    }

    struct supplyDetails {
        // uint256 balance;
        uint256 lastSupplyBlock;
    }

    address public protocalToken;

    // user to token to balance
    mapping(address => supplyDetails) UserTokenSupply;

    // token to token info
    mapping(address => TokenDetails) public tokenInfo;

    uint16 public protocolFeeBasisPoints; // in basis points 1000 = 1%
    uint16 public tokenRewardPerBlockInBasisPoints;
    uint256 public feeEarnedInUsd;

    event TokenSwap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    event TokenAdded(address indexed token);
    event Rewarded(address indexed user, uint256 amount);
    event addedLiquidity(address indexed user, address indexed token, uint256 amount);
    event tokenBuyBacked(address indexed user, address indexed token, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner,
        address _protocalToken,
        uint16 _protocalFee,
        uint16 _rewardsPerBlock
    ) public initializer {
        __Pausable_init();
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        protocolFeeBasisPoints = _protocalFee;
        protocalToken = _protocalToken;
        tokenRewardPerBlockInBasisPoints = _rewardsPerBlock;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    function addToken(
        address token,
        address tokenPriceFeed
    ) external onlyOwner {
        tokenInfo[token].priceFeedAddress = tokenPriceFeed;
        emit TokenAdded(token);
    }

    function updateToken(address token, address tokenPriceFeed)
        external
        onlyOwner
    {
        assert(tokenPriceFeed.code.length != 0);
        tokenInfo[token].priceFeedAddress = tokenPriceFeed;
    }

    // and fee also take cut from usd value and give the rest ot the user
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) external whenNotPaused {
        IERC20 token = IERC20(tokenIn);
        require(
            token.allowance(msg.sender, address(this)) >= amountIn,
            "Insufficient allowance"
        );

        TokenDetails memory tokenOutInfo = tokenInfo[tokenOut];

        require(
            tokenInfo[tokenIn].priceFeedAddress != address(0),
            "tokenIn not yet avaiable for swap"
        );
        require(
            tokenOutInfo.priceFeedAddress != address(0),
            "tokenOut not yet avaiable for swap"
        );

        (uint256 amountOut, uint256 fee) = quote(tokenIn, tokenOut, amountIn);
        require(tokenOutInfo.poolBalance > amountOut,"Insufficent pool balance");
        require(amountOut >= amountOutMin,"slippage issue");

        token.transferFrom(msg.sender, address(this), amountIn);

        tokenInfo[tokenIn].poolBalance += amountIn;
        feeEarnedInUsd += fee;
        tokenInfo[tokenOut].poolBalance -= amountOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);

        emit TokenSwap(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }

    function addLiquidity(address token, uint256 amount)
        external
        whenNotPaused
    {
        TokenDetails memory tokenData = tokenInfo[token];
        require(
            tokenData.priceFeedAddress != address(0),
            "token not yet available"
        );

        IERC20 tokenIn = IERC20(token);
        require(
            tokenIn.allowance(msg.sender, address(this)) >= amount,
            "Insufficient approved amount"
        );

        tokenIn.transferFrom(msg.sender, address(this), amount);
        tokenInfo[token].poolBalance += amount;

        int256 latestPrice = getPrice(token);
        assert(latestPrice > 0);
            
        // if token value is positive and update the value here
        uint256 numberOfTokenToMint = (uint256(latestPrice) * amount) / 1e8;

        IERC20(protocalToken).mint(msg.sender, numberOfTokenToMint);

        uint256 lastSupplyBlock = UserTokenSupply[msg.sender].lastSupplyBlock;

        if (lastSupplyBlock != 0 && lastSupplyBlock < block.number) {

            uint256 blockDiffrence = block.number - lastSupplyBlock;

            uint256 reward = calculateReward(blockDiffrence);

            if (reward > 0) {
                // reward tranfer
                IERC20(protocalToken).mint(msg.sender, amount);
                emit Rewarded(msg.sender, reward);
            }
        }
        UserTokenSupply[msg.sender].lastSupplyBlock = block.number;
        emit addedLiquidity(msg.sender, token, amount);
    }

    function buyBackLiquidity(address token, uint256 amountMin)
        external
        whenNotPaused
    {
        TokenDetails memory tokenstatus = tokenInfo[token];
        require(tokenstatus.poolBalance > amountMin,"Insufficient liquidity");

        uint256 userProtocalTokenBalance = IERC20(protocalToken).balanceOf(msg.sender);
        console.log(userProtocalTokenBalance);
        (uint256 amount, uint256 fee) = quote(protocalToken, token, userProtocalTokenBalance);
        uint256 amountOut = amount + fee;
        console.log(amountOut,amount,fee, amountMin);

        require(amountOut >= amountMin,"Slippage issue");

        IERC20(protocalToken).burnFrom(msg.sender,userProtocalTokenBalance);

        uint256 lastSupplyBlock = UserTokenSupply[msg.sender].lastSupplyBlock;

        if(lastSupplyBlock < block.number){
            uint256 blockDiffrence = block.number - lastSupplyBlock;

            uint256 reward = calculateReward(blockDiffrence);

            if (reward > 0) {
                // reward tranfer
                IERC20(protocalToken).mint(msg.sender, amount);
                emit Rewarded(msg.sender, reward);
            }
        }


        UserTokenSupply[msg.sender].lastSupplyBlock = block.number;

        tokenInfo[token].poolBalance -= amountOut;

        IERC20(protocalToken).mint(msg.sender,amountOut);

        emit tokenBuyBacked(msg.sender, token, amountOut);
    }

    function calculateReward(uint256 blockDiffrence)
        internal view
        returns (uint256 reward)
    {
        uint256 userProtocalTokenBalance = IERC20(protocalToken).balanceOf(
            msg.sender
        );
        uint256 protocalTokenTotalSupply = IERC20(protocalToken).totalSupply();

        reward =
            ((userProtocalTokenBalance *
                tokenRewardPerBlockInBasisPoints *
                blockDiffrence) / 10000000) *
            protocalTokenTotalSupply;
    }

    function quote(address tokenIn, address tokenOut, uint256 amountIn) public view returns(uint256 amountOut, uint256 fee){

        int256 tokenInPrice = getPrice(tokenIn);
        int256 tokenOutPrice = getPrice(tokenOut);
        console.log(uint(tokenInPrice));
        console.log(uint(tokenOutPrice));

        // Ensure prices are positive
        require(tokenInPrice > 0 && tokenOutPrice > 0, "Token prices must be positive");

        uint8 tokeInDecimal = IERC20(tokenIn).decimals();

        // Calculate the amountOut in USD
        uint256 amountOutUSD = (amountIn * uint256(tokenInPrice)) / (10**(uint256(tokeInDecimal)));
        console.log(amountOutUSD);

        fee = amountOutUSD * protocolFeeBasisPoints / 100000;
        console.log(fee);
        amountOutUSD -= fee;

        uint8 tokeOutDecimal = IERC20(tokenOut).decimals();

        // Convert amountOut from USD to tokenOut
        amountOut = (amountOutUSD * (10**uint256(tokeOutDecimal))) / uint256(tokenOutPrice);

    }

    function getPrice(address token) internal view returns(int256) {
        if(token == protocalToken){
            return 1e8;
        }
        address priceFeed = tokenInfo[token].priceFeedAddress;
        return IAggregatorInterface(priceFeed).latestAnswer();
    }

    function updateProtocalFee(uint16 _newProtocalFeeInBasisPoint) external onlyOwner {
        protocolFeeBasisPoints = _newProtocalFeeInBasisPoint;
    }

    function updateRewardPerBlock(uint16 _newRewardPerBlock) external onlyOwner {
        tokenRewardPerBlockInBasisPoints = _newRewardPerBlock;
    }
}
