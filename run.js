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
const { GoogleSpreadsheet } = require("google-spreadsheet");
const {
  getTokenBalanceWallet,
  getCurrentPrice,
  approveToken,
} = require("./Utilities");
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
  await approveToken(WmaticAddress, DystopiaRouterAddress, wallet);
  await approveToken(PenAddress, DystopiaRouterAddress, wallet);
  await approveToken(DystAddress, DystopiaRouterAddress, wallet);
  await approveToken(VeloToken, VelodromeRouter, optWallet, "optimism");
}

async function runBot(args) {
  const days = args[0];
  const WALLET_ADDRESS = args[1];
  const WALLET_SECRET = args[2];
  const wallet = new ethers.Wallet(WALLET_SECRET, web3Provider);
  const walletOpt = new ethers.Wallet(WALLET_SECRET, web3ProviderOpt);
  await doc.useServiceAccountAuth(creds);
  const sheet = await doc.addSheet({
    headerValues: [
      "Time",
      "UnixTime",
      "PolygonUSDCClaimed",
      "MaticGasSpent",
      "VelodromeUSDCClaimed",
      "EthGasSpent",
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
    await unstakeLpWithdrawAndClaim(wallet, PoolToken);
    await claimVeloReward(walletOpt, WALLET_ADDRESS);
    await timer(1000 * 60 * 5);
    console.log("LP unstaked");
    const amountDyst = await getTokenBalanceWallet(DystAddress, WALLET_ADDRESS);
    const amountPen = await getTokenBalanceWallet(PenAddress, WALLET_ADDRESS);
    const amountVelo = await getTokenBalanceWallet(
      VeloToken,
      WALLET_ADDRESS,
      "optimism"
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
    });
  }
}

runBot(args);
//allApproves(args);
