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
  errCatcher,
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
const UsdcAddress = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174".toLowerCase(); //Usdc
const WmaticAddress =
  "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270".toLowerCase(); //Wmatic
const PenAddress = "0x9008D70A5282a936552593f410AbcBcE2F891A97".toLowerCase();
const DystAddress = "0x39aB6574c289c3Ae4d88500eEc792AB5B947A5Eb".toLowerCase();
const fetch = require("node-fetch"); // node-fetch@1.7.3

const Tocken1 = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174".toLowerCase(); // Usdc
const Tocken2 = "0x236eeC6359fb44CCe8f97E99387aa7F8cd5cdE1f".toLowerCase(); // Usd+
const PoolToken = "0x421a018cC5839c4C0300AfB21C725776dc389B1a".toLowerCase(); //Usd+/Usdc pool token

//const PoolToken = "0x60c088234180b36edcec7aa8aa23912bb6bed114".toLowerCase(); //Usdc/Wmatic pool token

//const Tocken1 = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270".toLowerCase(); //Wmatic
const TOCKEN1DECIMALS = 6;
//const Tocken2 = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174".toLowerCase(); //Usdc
const TOCKEN2DECIMALS = 6;

async function calcLPTokensValue(LPTokenAddress, WALLET_ADDRESS) {
  const dystopiarouter = new ethers.Contract(
    DystopiaRouterAddress,
    DystopiaRouterABI,
    web3Provider
  );
  const dystopiarouterContract = dystopiarouter.connect(wallet);
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

async function swapPolyNativeTokens(wallet, WALLET_ADDRESS) {
  const amountDyst = await getTokenBalanceWallet(DystAddress, WALLET_ADDRESS);
  const amountPen = await getTokenBalanceWallet(PenAddress, WALLET_ADDRESS);
  await errCatcher(swapToken1ToToken2, [
    DystAddress,
    WmaticAddress,
    amountDyst,
    wallet,
    WALLET_ADDRESS,
  ]);
  await errCatcher(swapToken1ToToken2, [
    PenAddress,
    WmaticAddress,
    amountPen,
    wallet,
    WALLET_ADDRESS,
  ]);
  const amountWmatic = await getTokenBalanceWallet(
    WmaticAddress,
    WALLET_ADDRESS
  );
  await errCatcher(swapToken1ToToken2, [
    WmaticAddress,
    UsdcAddress,
    amountWmatic,
    wallet,
    WALLET_ADDRESS,
  ]);
}

async function swapToken1ToToken2(
  Token1address,
  Token2address,
  amount,
  wallet,
  WALLET_ADDRESS
) {
  const dystopiarouter = new ethers.Contract(
    DystopiaRouterAddress,
    DystopiaRouterABI,
    web3Provider
  );
  const gasPrice = await getGasPrice();
  const dystopiarouterContract = dystopiarouter.connect(wallet);
  const BestChange = await dystopiarouterContract.getAmountOut(
    amount,
    Token1address,
    Token2address
  );
  const currentTimestamp = Date.now();
  await dystopiarouterContract
    .swapExactTokensForTokensSimple(
      amount,
      BestChange.amount,
      Token1address,
      Token2address,
      BestChange.stable,
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

module.exports = {
  swapToken1ToToken2,
  calcLPTokensValue,
  swapPolyNativeTokens,
};
