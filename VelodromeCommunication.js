const Web3 = require("web3");
const ERC20ABI = require("./abi/ERC20ABI.json");
const {
  getGasPrice,
  getTokenBalanceWallet,
  getTotalTokenSupply,
  approveToken,
} = require("./Utilities");
const { ethers, BigNumber } = require("ethers");
const { ChainId } = require("@aave/contract-helpers");
const web3Provider = new ethers.providers.StaticJsonRpcProvider(
  "https://opt-mainnet.g.alchemy.com/v2/p3FBKCzASs2csAWsjCUpAIPNoMCoiB32",
  ChainId.optimism
);
const FeesRewardABI = require("./abi/VelodromeABI.json");
const VelodromeRewardABI = require("./abi/VelodromeRewardABI.json");
const VelodromeRouterABI = require("./abi/VelodromeRouter.json");
const PoolToken = "0x67124355cCE2Ad7A8eA283E990612eBe12730175".toLowerCase(); //Usd+/Usdc pool token
const RewardAddress =
  "0xd2d95775D35A6D492CED7C7e26817aAcB7D264F2".toLowerCase();
const VelodromeRouter =
  "0x9c12939390052919aF3155f41Bf4160Fd3666A6f".toLowerCase();
const VeloToken = "0x3c8B650257cFb5f272f799F5e2b4e65093a11a05".toLowerCase();
const UsdcToken = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607".toLowerCase();
var args = process.argv.slice(2);

async function allApproves(args) {
  const WALLET_SECRET = args[0];
  const wallet = new ethers.Wallet(WALLET_SECRET, web3Provider);
  await approveToken(VeloToken, VelodromeRouter, wallet, "optimism");
  //await approveToken(WmaticAddress, AAVEpoolAddress, wallet);
  //await approveToken(PoolToken, DystopiaRouterAddress, wallet);
  //await approveToken(UsdcAddress, DystopiaRouterAddress, wallet);
  //await approveToken(WmaticAddress, DystopiaRouterAddress, wallet);
  //await approveToken(PenAddress, DystopiaRouterAddress, wallet);
  //await approveToken(DystAddress, DystopiaRouterAddress, wallet);
  //await approveToken(PoolToken, PenroseProxy, wallet);
}

async function claimFeesReward(wallet) {
  const RewardProvider = new ethers.Contract(
    PoolToken,
    FeesRewardABI,
    web3Provider
  );
  //const gasPrice = await getGasPrice();
  const rewardProviderContract = RewardProvider.connect(wallet);
  rewardProviderContract
    .claimFees({
      gasPrice: "5000000",
      gasLimit: "6000000",
    })
    .then(function (transaction) {
      return transaction.wait();
    });
}

async function claimVeloReward(wallet, WALLET_ADDRESS) {
  const RewardProvider = new ethers.Contract(
    RewardAddress,
    VelodromeRewardABI,
    web3Provider
  );
  //const gasPrice = await getGasPrice();
  const rewardProviderContract = RewardProvider.connect(wallet);
  rewardProviderContract
    .getReward(WALLET_ADDRESS, [VeloToken], {
      gasPrice: "5000000",
      gasLimit: "6000000",
    })
    .then(function (transaction) {
      return transaction.wait();
    });
}

async function swapToken1ToToken2velo(
  Token1address,
  Token2address,
  amount,
  wallet,
  WALLET_ADDRESS
) {
  //approveToken(Token1address, DystopiaRouterAddress, wallet);
  const velorouter = new ethers.Contract(
    VelodromeRouter,
    VelodromeRouterABI,
    web3Provider
  );
  const velorouterContract = velorouter.connect(wallet);
  const ExpectedAmount = await velorouterContract.getAmountOut(
    amount,
    Token1address,
    Token2address
  );
  const currentTimestamp = Date.now();
  await velorouterContract
    .swapExactTokensForTokensSimple(
      amount,
      ExpectedAmount.amount,
      Token1address,
      Token2address,
      false,
      WALLET_ADDRESS,
      currentTimestamp + 60,
      { gasPrice: "5000000", gasLimit: "6000000" }
    )
    .then(function (transaction) {
      return transaction.wait();
    });
}

// async function runVelodrome(args) {
//   const WALLET_ADDRESS = args[0];
//   const WALLET_SECRET = args[1];
//   const wallet = new ethers.Wallet(WALLET_SECRET, web3Provider);
//   await claimVeloReward(wallet, WALLET_ADDRESS);
//   const amount = await getTokenBalanceWallet(
//     VeloToken,
//     WALLET_ADDRESS,
//     "optimism"
//   );
//   await swapToken1ToToken2velo(
//     VeloToken,
//     UsdcToken,
//     amount,
//     wallet,
//     WALLET_ADDRESS
//   );
// }

// runVelodrome(args);
//allApproves(args);
module.exports = { swapToken1ToToken2velo, claimVeloReward };
