const { ethers, BigNumber } = require("ethers");
const { ChainId } = require("@aave/contract-helpers");
const web3Provider = new ethers.providers.StaticJsonRpcProvider(
  "https://polygon-mainnet.g.alchemy.com/v2/6aCuWP8Oxcd-4jvmNYLh-WervViwIeJq",
  ChainId.polygon
);
const web3ProviderOpt = new ethers.providers.StaticJsonRpcProvider(
  "https://opt-mainnet.g.alchemy.com/v2/p3FBKCzASs2csAWsjCUpAIPNoMCoiB32",
  ChainId.optimism
);
const providerURL =
  "https://moonriver.blastapi.io/81a966d1-5645-4eba-a0e0-d701ad03d79a";
const web3ProviderMoon = new ethers.providers.StaticJsonRpcProvider(
  providerURL,
  {
    chainId: 1285,
    name: "moonriver",
  }
);
const { GoogleSpreadsheet } = require("google-spreadsheet");
const {
  getTokenBalanceWallet,
  getCurrentPrice,
  approveToken,
} = require("./Utilities");
const { swapMFAM, swapMovr } = require("./SolarbeamCommunication");
const { ClaimReward } = require("./MoonwellCommunication");
const doc = new GoogleSpreadsheet(
  "1jp8CdsTwO--563iN3IIJmJd6X6t5DQ8leMwGlXbJ-Yc"
);
const creds = require("./credentials.json");
const DystopiaRouterAddress =
  "0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e".toLowerCase();
const PenAddress = "0x9008D70A5282a936552593f410AbcBcE2F891A97".toLowerCase();
const DystAddress = "0x39aB6574c289c3Ae4d88500eEc792AB5B947A5Eb".toLowerCase();
const UsdcAddress = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174".toLowerCase(); //Usdc
const UsdcDecimals = 6;
const WmaticDecimals = 18;
const EthDecimals = 18;
const WmaticAddress =
  "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270".toLowerCase(); //Wmatic
const VelodromeRouter =
  "0x9c12939390052919aF3155f41Bf4160Fd3666A6f".toLowerCase();
const VeloToken = "0x3c8B650257cFb5f272f799F5e2b4e65093a11a05".toLowerCase();
const UsdcOptToken = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607".toLowerCase();
const PoolToken = "0x421a018cC5839c4C0300AfB21C725776dc389B1a".toLowerCase(); //Usd+/Usdc pool token
const MaticAddress = "0x0000000000000000000000000000000000001010".toLowerCase();
const EthAddress = "0x4200000000000000000000000000000000000042".toLowerCase();
const MFAMToken = "0xBb8d88bcD9749636BC4D2bE22aaC4Bb3B01A58F1".toLowerCase();
const SolarRouter = "0xAA30eF758139ae4a7f798112902Bf6d65612045f".toLowerCase();
const DystopiaRouterABI = require("./abi/RouterABI.json");
const { swapToken1ToToken2 } = require("./DystopiaCommunication");
const {
  depositLpAndStake,
  unstakeLpWithdrawAndClaim,
} = require("./PenroseCommunication");
const {
  swapToken1ToToken2velo,
  claimVeloReward,
} = require("./VelodromeCommunication");
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
  const optWallet = new ethers.Wallet(WALLET_SECRET, web3ProviderOpt);
  const MoonWallet = new ethers.Wallet(WALLET_SECRET, web3ProviderMoon);
  await approveToken(WmaticAddress, DystopiaRouterAddress, wallet);
  await approveToken(PenAddress, DystopiaRouterAddress, wallet);
  await approveToken(DystAddress, DystopiaRouterAddress, wallet);
  await approveToken(VeloToken, VelodromeRouter, optWallet, "optimism");
  await approveToken(MFAMToken, SolarRouter, MoonWallet, "moonriver");
}

async function runBot(args) {
  const days = args[0];
  const WALLET_ADDRESS = args[1];
  const WALLET_SECRET = args[2];
  const wallet = new ethers.Wallet(WALLET_SECRET, web3Provider);
  const walletOpt = new ethers.Wallet(WALLET_SECRET, web3ProviderOpt);
  const walletMoon = new ethers.Wallet(WALLET_SECRET, web3ProviderMoon);
  await doc.useServiceAccountAuth(creds);
  const sheet = await doc.addSheet({
    headerValues: [
      "Time",
      "UnixTime",
      "PolygonUSDCClaimed",
      "MaticGasSpent",
      "VelodromeUSDCClaimed",
      "EthGasSpent",
      "MoonriverMFAMClaimed",
      "MoonriverMOVRIncome",
    ],
  });

  while (true) {
    console.log("start");
    await timer(1000 * 60 * 60 * 24 * days);
    const UsdcInitPolygon = await getTokenBalanceWallet(
      UsdcAddress,
      WALLET_ADDRESS
    );
    const UsdcInitOpt = await getTokenBalanceWallet(
      UsdcOptToken,
      WALLET_ADDRESS,
      "optimism"
    );

    const MaticInit = await getTokenBalanceWallet(MaticAddress, WALLET_ADDRESS);
    const EthInit = await web3ProviderOpt.getBalance(WALLET_ADDRESS);
    const MOVRbalance = await web3ProviderMoon.getBalance(WALLET_ADDRESS);
    await ClaimReward(walletMoon, WALLET_ADDRESS);
    await unstakeLpWithdrawAndClaim(wallet, PoolToken);
    await claimVeloReward(walletOpt, WALLET_ADDRESS);
    await timer(1000 * 60 * 5);
    const MOVRbalance2 = await web3ProviderMoon.getBalance(WALLET_ADDRESS);
    console.log("LP unstaked");
    const amountDyst = await getTokenBalanceWallet(DystAddress, WALLET_ADDRESS);
    const amountPen = await getTokenBalanceWallet(PenAddress, WALLET_ADDRESS);
    const amountVelo = await getTokenBalanceWallet(
      VeloToken,
      WALLET_ADDRESS,
      "optimism"
    );
    const amountMFAM = await getTokenBalanceWallet(
      MFAMToken,
      WALLET_ADDRESS,
      "moonriver"
    );
    await swapToken1ToToken2velo(
      VeloToken,
      UsdcOptToken,
      amountVelo,
      walletOpt,
      WALLET_ADDRESS
    );
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
    const MovrSwap = MOVRbalance2.sub(MOVRbalance);
    await swapMFAM(walletMoon, WALLET_ADDRESS);
    if (MovrSwap.gt(0)) {
      await swapMovr(walletMoon, MovrSwap);
    }
    await depositLpAndStake(wallet, PoolToken);
    const UsdcEndPolygon = await getTokenBalanceWallet(
      UsdcAddress,
      WALLET_ADDRESS
    );
    const UsdcEndOpt = await getTokenBalanceWallet(
      UsdcOptToken,
      WALLET_ADDRESS,
      "optimism"
    );
    const MaticEnd = await getTokenBalanceWallet(MaticAddress, WALLET_ADDRESS);
    const EthEnd = await web3ProviderOpt.getBalance(WALLET_ADDRESS);
    await sheet.addRow({
      Time: Date(Date.now),
      UnixTime: Date.now(),
      PolygonUSDCClaimed:
        (UsdcEndPolygon - UsdcInitPolygon) / 10 ** UsdcDecimals,
      MaticGasSpent: (MaticInit - MaticEnd) / 10 ** WmaticDecimals,
      VelodromeUSDCClaimed: (UsdcEndOpt - UsdcInitOpt) / 10 ** UsdcDecimals,
      EthGasSpent: (EthInit - EthEnd) / 10 ** EthDecimals,
      MoonriverMFAMClaimed: amountMFAM / 10 ** 18,
      MoonriverMOVRIncome: MovrSwap / 10 ** 18,
    });
  }
}

runBot(args);
//allApproves(args);
