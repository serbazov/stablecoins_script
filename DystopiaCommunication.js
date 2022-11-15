const Web3 = require("web3");
const ERC20ABI = require("./abi/ERC20ABI.json");
const DystopiaPoolABI = require("./abi/DystopiaPoolABI.json");
const DystopiaRouterABI = require("./abi/RouterABI.json");
const DYSTRewardABI = require("./abi/DistopiaRewardABI.json");
const FeesRewardABI = require("./abi/FeesRewardABI.json");
const { ethers, BigNumber } = require("ethers");
const Token = require("@uniswap/sdk-core");
const { ChainId } = require("@aave/contract-helpers");
const {
  getGasPrice,
  getTokenBalanceWallet,
  getTotalTokenSupply,
  approveToken,
} = require("./Utilities");
const web3Provider = new ethers.providers.StaticJsonRpcProvider(
  "https://polygon-mainnet.g.alchemy.com/v2/6aCuWP8Oxcd-4jvmNYLh-WervViwIeJq",
  ChainId.polygon
);

const DystopiaPoolAddress =
  "0x11637b94Dfab4f102c21fDe9E34915Bb5F766A8a".toLowerCase();
const DystopiaRouterAddress =
  "0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e".toLowerCase();
const DYSTRewardContract =
  "0x719BfE5213AF9c2523E9f46b86cc70EB8b7F530F".toLowerCase();
const FeesRewardContract =
  "0x421a018cC5839c4C0300AfB21C725776dc389B1a".toLowerCase();

const fetch = require("node-fetch"); // node-fetch@1.7.3

const Tocken1 = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174".toLowerCase(); // Usdc
const Tocken2 = "0x236eeC6359fb44CCe8f97E99387aa7F8cd5cdE1f".toLowerCase(); // Usd+
const PoolToken = "0x421a018cC5839c4C0300AfB21C725776dc389B1a".toLowerCase(); //Usd+/Usdc pool token

//const PoolToken = "0x60c088234180b36edcec7aa8aa23912bb6bed114".toLowerCase(); //Usdc/Wmatic pool token

//const Tocken1 = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270".toLowerCase(); //Wmatic
const TOCKEN1DECIMALS = 6;
//const Tocken2 = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174".toLowerCase(); //Usdc
const TOCKEN2DECIMALS = 6;

async function calcLPTokensValue(
  LPTokenAddress,
  dystopiarouterContract,
  WALLET_ADDRESS
) {
  const tokenBalance = await getTokenBalanceWallet(
    LPTokenAddress,
    WALLET_ADDRESS
  );
  const tokenTotalSupply = await getTotalTokenSupply(LPTokenAddress);

  const reserves = await dystopiarouterContract.getReserves(
    Tocken1,
    Tocken2,
    false
  );
  const LPToken1 = tokenBalance.mul(reserves[0]).div(tokenTotalSupply);
  const LPToken2 = tokenBalance.mul(reserves[1]).div(tokenTotalSupply);
  return [LPToken1, LPToken2];
}

async function claimDYSTReward(wallet) {
  const RewardProvider = new ethers.Contract(
    DYSTRewardContract,
    DYSTRewardABI,
    web3Provider
  );
  const gasPrice = await getGasPrice();
  const rewardProviderContract = RewardProvider.connect(wallet);
  rewardProviderContract
    .claimFees({
      gasPrice: gasPrice,
      gasLimit: BigNumber.from("500000"),
    })
    .then(function (transaction) {
      return transaction.wait();
    });
}

async function swapToken1ToToken2(
  Token1address,
  Token2address,
  amount,
  wallet,
  WALLET_ADDRESS
) {
  //approveToken(Token1address, DystopiaRouterAddress, wallet);
  const dystopiarouter = new ethers.Contract(
    DystopiaRouterAddress,
    DystopiaRouterABI,
    web3Provider
  );
  const gasPrice = await getGasPrice();
  const dystopiarouterContract = dystopiarouter.connect(wallet);
  const ExpectedAmount = await dystopiarouterContract.getExactAmountOut(
    amount,
    Token1address,
    Token2address,
    true
  );
  const currentTimestamp = Date.now();
  await dystopiarouterContract
    .swapExactTokensForTokensSimple(
      amount,
      ExpectedAmount,
      Token1address,
      Token2address,
      true,
      WALLET_ADDRESS,
      currentTimestamp + 60,
      { gasPrice: gasPrice, gasLimit: BigNumber.from("500000") }
    )
    .then(function (transaction) {
      return transaction.wait();
    });
}

async function claimFeesReward(wallet) {
  const RewardProvider = new ethers.Contract(
    PoolToken,
    FeesRewardABI,
    web3Provider
  );
  const gasPrice = await getGasPrice();
  const rewardProviderContract = RewardProvider.connect(wallet);
  rewardProviderContract
    .claimFees({
      gasPrice: gasPrice,
      gasLimit: BigNumber.from("500000"),
    })
    .then(function (transaction) {
      return transaction.wait();
    });
}

async function swapInTargetProportion(WALLET_ADDRESS, WALLET_SECRET) {
  const gasPrice = await getGasPrice();
  const wallet = new ethers.Wallet(WALLET_SECRET, web3Provider);

  //approveToken(Tocken1, DystopiaRouterAddress, wallet);

  const dystopiarouter = new ethers.Contract(
    DystopiaRouterAddress,
    DystopiaRouterABI,
    web3Provider
  );

  const dystopiarouterContract = dystopiarouter.connect(wallet);
  const Token1WalletAmount = await getTokenBalanceWallet(
    Tocken1,
    WALLET_ADDRESS
  );
  const Token2WalletAmount = await getTokenBalanceWallet(
    Tocken2,
    WALLET_ADDRESS
  );

  const reserves = await dystopiarouterContract.getReserves(
    Tocken1,
    Tocken2,
    false
  );

  const TokensLiquidity = Token2WalletAmount.mul(reserves[0])
    .div(reserves[1])
    .add(Token1WalletAmount);

  const Token1Swap = TokensLiquidity.div(2).sub(Token1WalletAmount);
  const maxSlippageCoeff = 1;
  const currentTimestamp = Date.now();
  //TODO: minswap ERROR
  if (Token1Swap.lt(0)) {
    let Token2ExpectedAmount = Token1Swap.mul(-1)
      .mul(reserves[1])
      .div(reserves[0])
      .mul(100 - maxSlippageCoeff)
      .div(100);

    const ExpectedAmount = await dystopiarouterContract.getExactAmountOut(
      Token1Swap.mul(-1),
      Tocken1,
      Tocken2,
      true
    );
    if (Token2ExpectedAmount.gt(ExpectedAmount)) {
      Token2ExpectedAmount = Token2ExpectedAmount.mul(98).div(100);
    }

    await dystopiarouterContract
      .swapExactTokensForTokensSimple(
        Token1Swap.mul(-1),
        Token2ExpectedAmount,
        Tocken1,
        Tocken2,
        true,
        WALLET_ADDRESS,
        currentTimestamp + 60,
        { gasPrice: gasPrice, gasLimit: BigNumber.from("500000") }
      )
      .then(function (transaction) {
        return transaction.wait();
      });
  } else {
    const TokensLiquidity = Token1WalletAmount.mul(reserves[1])
      .div(reserves[0])
      .add(Token2WalletAmount);

    const Token2Swap = TokensLiquidity.div(2).sub(Token2WalletAmount);

    let Token1ExpectedAmount = Token2Swap.mul(-1)
      .mul(reserves[0])
      .div(reserves[1])
      .mul(100 - maxSlippageCoeff)
      .div(100);

    const ExpectedAmount = await dystopiarouterContract.getExactAmountOut(
      Token2Swap.mul(-1),
      Tocken2,
      Tocken1,
      true
    );
    if (Token1ExpectedAmount.gt(ExpectedAmount)) {
      Token1ExpectedAmount = Token1ExpectedAmount.mul(99).div(100);
    }
    await dystopiarouterContract
      .swapExactTokensForTokensSimple(
        Token2Swap.mul(-1),
        Token1ExpectedAmount,
        Tocken2,
        Tocken1,
        true,
        WALLET_ADDRESS,
        currentTimestamp + 60,
        { gasPrice: gasPrice, gasLimit: BigNumber.from("500000") }
      )
      .then(function (transaction) {
        return transaction.wait();
      });
  }
}

async function claimFeesReward(wallet) {
  const RewardProvider = new ethers.Contract(
    PoolToken,
    FeesRewardABI,
    web3Provider
  );
  const gasPrice = await getGasPrice();
  const rewardProviderContract = RewardProvider.connect(wallet);
  rewardProviderContract
    .claimFees({
      gasPrice: gasPrice,
      gasLimit: BigNumber.from("500000"),
    })
    .then(function (transaction) {
      return transaction.wait();
    });
}

async function swapAndAdd(WALLET_ADDRESS, WALLET_SECRET) {
  await swapInTargetProportion(WALLET_ADDRESS, WALLET_SECRET);
  return await addAllLiquidity(WALLET_ADDRESS, WALLET_SECRET);
}

async function addAllLiquidity(WALLET_ADDRESS, WALLET_SECRET) {
  const Token1WalletAmount = await getTokenBalanceWallet(
    Tocken1,
    WALLET_ADDRESS
  );
  const Token2WalletAmount = await getTokenBalanceWallet(
    Tocken2,
    WALLET_ADDRESS
  );

  return await addLiquidityToPool(
    WALLET_SECRET,
    WALLET_ADDRESS,
    Token1WalletAmount,
    Token2WalletAmount,
    Token1WalletAmount.sub(90).div(100),
    Token2WalletAmount.sub(90).div(100)
  );
}

// add liquidity to required pool
async function addLiquidityToPool(
  WALLET_SECRET,
  WALLET_ADDRESS,
  amountADesired,
  amountBDesired,
  amountAMin,
  amountBMin
) {
  const gasPrice = await getGasPrice();
  const wallet = new ethers.Wallet(WALLET_SECRET, web3Provider);

  //approveToken(Tocken1);

  const dystopiarouter = new ethers.Contract(
    DystopiaRouterAddress,
    DystopiaRouterABI,
    web3Provider
  );

  const dystopiarouterContract = dystopiarouter.connect(wallet);
  const currentTimestamp = Date.now();

  return await dystopiarouterContract
    .addLiquidity(
      Tocken1,
      Tocken2,
      false,
      amountADesired,
      amountBDesired,
      amountAMin,
      amountBMin,
      WALLET_ADDRESS,
      currentTimestamp + 60,
      { gasPrice: gasPrice, gasLimit: BigNumber.from("500000") }
    )
    .then(function (transaction) {
      return transaction.wait();
    });
}

// remove liquidity from pool and claim fees
async function removeLiquidityFromPool(WALLET_ADDRESS, WALLET_SECRET) {
  const gasPrice = await getGasPrice();

  const wallet = new ethers.Wallet(WALLET_SECRET, web3Provider);

  const dystopiarouter = new ethers.Contract(
    DystopiaRouterAddress,
    DystopiaRouterABI,
    web3Provider
  );

  const dystopiarouterContract = dystopiarouter.connect(wallet);
  const currentTimestamp = Date.now();
  const lptokens = await calcLPTokensValue(
    PoolToken,
    dystopiarouterContract,
    WALLET_ADDRESS
  );

  //claimDYSTReward(wallet);
  //claimFeesReward(wallet);

  //approveoken(PoolToken, dystopiarouterContract, wallet);
  const liquidity = await dystopiarouterContract.quoteAddLiquidity(
    Tocken1,
    Tocken2,
    false,
    lptokens[0],
    lptokens[1]
  );

  return await dystopiarouterContract
    .removeLiquidity(
      Tocken1,
      Tocken2,
      false,
      liquidity[2],
      lptokens[0].sub(98).div(100),
      lptokens[1].sub(98).div(100),
      WALLET_ADDRESS,
      currentTimestamp + 60,
      { gasPrice: gasPrice, gasLimit: BigNumber.from("500000") }
    )
    .then(function (transaction) {
      return transaction.wait();
    });
}

//swapAndAdd();
//addAllLiquidity();
//removeLiquidityFromPool();
// const wallet = new ethers.Wallet(WALLET_SECRET, web3Provider);
//claimFeesReward(wallet);

module.exports = {
  swapAndAdd,
  addAllLiquidity,
  removeLiquidityFromPool,
  claimFeesReward,
  swapToken1ToToken2,
  swapInTargetProportion,
  calcLPTokensValue,
  removeLiquidityFromPool,
};
