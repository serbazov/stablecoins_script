const { ethers, BigNumber } = require("ethers");
const { ChainId } = require("@aave/contract-helpers");
const web3Provider = new ethers.providers.StaticJsonRpcProvider(
  "https://polygon-mainnet.g.alchemy.com/v2/6aCuWP8Oxcd-4jvmNYLh-WervViwIeJq",
  ChainId.polygon
);
const {
  getTokenBalanceWallet,
  getCurrentPrice,
  approveToken,
} = require("./Utilities");
const DystopiaRouterAddress =
  "0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e".toLowerCase();
const PenAddress = "0x9008D70A5282a936552593f410AbcBcE2F891A97".toLowerCase();
const DystAddress = "0x39aB6574c289c3Ae4d88500eEc792AB5B947A5Eb".toLowerCase();
const UsdcAddress = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174".toLowerCase(); //Usdc
const WmaticAddress =
  "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270".toLowerCase(); //Wmatic
const PoolToken = "0x421a018cC5839c4C0300AfB21C725776dc389B1a".toLowerCase(); //Usd+/Usdc pool token
const DystopiaRouterABI = require("./abi/RouterABI.json");
const { swapToken1ToToken2 } = require("./DystopiaCommunication");
const {
  depositLpAndStake,
  unstakeLpWithdrawAndClaim,
} = require("./PenroseCommunication");
var args = process.argv.slice(2);
const timer = (ms) => new Promise((res) => setTimeout(res, ms));

async function errCatcher(f, arguments) {
  doLoop = true;
  do {
    try {
      return await f.apply(this, arguments);
    } catch (err) {
      console.log(err);
      await timer(180000);
    }
  } while (doLoop);
}

async function allApproves(args) {
  const WALLET_SECRET = args[0];
  const wallet = new ethers.Wallet(WALLET_SECRET, web3Provider);
  //await approveToken(UsdcAddress, AAVEpoolAddress, wallet);
  //await approveToken(WmaticAddress, AAVEpoolAddress, wallet);
  //await approveToken(PoolToken, DystopiaRouterAddress, wallet);
  //await approveToken(UsdcAddress, DystopiaRouterAddress, wallet);
  await approveToken(WmaticAddress, DystopiaRouterAddress, wallet);
  await approveToken(PenAddress, DystopiaRouterAddress, wallet);
  await approveToken(DystAddress, DystopiaRouterAddress, wallet);
  //await approveToken(PoolToken, PenroseProxy, wallet);
}

async function runBot(args) {
  const days = args[0];
  const WALLET_ADDRESS = args[1];
  const WALLET_SECRET = args[2];
  const wallet = new ethers.Wallet(WALLET_SECRET, web3Provider);
  while (true) {
    console.log("start");
    await timer(1000 * 60 * 60 * 24 * days);
    await unstakeLpWithdrawAndClaim(wallet, PoolToken);
    console.log("LP unstaked");
    const amountDyst = await getTokenBalanceWallet(DystAddress, WALLET_ADDRESS);
    const amountPen = await getTokenBalanceWallet(PenAddress, WALLET_ADDRESS);
    await swapToken1ToToken2(
      DystAddress,
      WmaticAddress,
      amountDyst,
      wallet,
      WALLET_ADDRESS
    );
    await swapToken1ToToken2(
      PenAddress,
      WmaticAddress,
      amountPen,
      wallet,
      WALLET_ADDRESS
    );
    const amountWmatic = await getTokenBalanceWallet(
      WmaticAddress,
      WALLET_ADDRESS
    );
    await swapToken1ToToken2(
      WmaticAddress,
      UsdcAddress,
      amountWmatic,
      wallet,
      WALLET_ADDRESS
    );
    await depositLpAndStake(wallet, PoolToken);
  }
}

runBot(args);
//allApproves(args);
