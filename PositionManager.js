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
const UsdcAddress = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174".toLowerCase(); //Usdc
const Frax = "0x1A93B23281CC1CDE4C4741353F3064709A16197d".toLowerCase();
const MaticAddress = "0x0000000000000000000000000000000000001010".toLowerCase();
const FraxDecimals = 18;
const UsdcDecimals = 6;
const WmaticDecimals = 18;
const EthDecimals = 18;
const {
  swapToken1ToToken2,
  swapPolyNativeTokens,
} = require("./DystopiaCommunication");
const {
  depositLpAndStake,
  unstakeLpWithdrawAndClaim,
  claimStakingRewards,
} = require("./PenroseCommunication");
const {
  swapToken1ToToken2velo,
  claimVeloReward,
  swapVeloNativeTokens,
} = require("./VelodromeCommunication");
const { getTokenBalanceWallet } = require("./Utilities");
const { ClaimReward } = require("./MoonwellCommunication");
const { swapMovrNativeTokens } = require("./SolarbeamCommunication");
const PoolToken = "0x421a018cC5839c4C0300AfB21C725776dc389B1a".toLowerCase();
const UsdcOptToken = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607".toLowerCase();
const { GoogleSpreadsheet } = require("google-spreadsheet");
const doc = new GoogleSpreadsheet(
  "1jp8CdsTwO--563iN3IIJmJd6X6t5DQ8leMwGlXbJ-Yc"
);
const { errCatcher } = require("./Utilities");
const creds = require("./credentials.json");
const timer = (ms) => new Promise((res) => setTimeout(res, ms));

class Strategy {
  wallet_address;
  wallet_secret;
  daysInterval;
  constructor(wallet_address, wallet_secret, daysInterval) {
    this.wallet_address = wallet_address;
    this.wallet_secret = wallet_secret;
    this.wallet = new ethers.Wallet(wallet_secret, web3Provider);
    this.walletOpt = new ethers.Wallet(wallet_secret, web3ProviderOpt);
    this.walletMoon = new ethers.Wallet(wallet_secret, web3ProviderMoon);
    this.daysInterval = daysInterval;
  }
  async ClaimRewards() {
    await errCatcher(claimStakingRewards, [this.wallet, PoolToken]);
    await errCatcher(claimVeloReward, [this.walletOpt, this.wallet_address]);
    await ClaimReward(this.walletMoon, this.wallet_address);
  }
  async SwapTokens() {
    await swapVeloNativeTokens(this.walletOpt, this.wallet_address);
    await swapPolyNativeTokens(this.wallet, this.wallet_address);
    await swapMovrNativeTokens(
      this.walletMoon,
      this.wallet_address,
      this.MOVRbalance
    );
  }
  async InitSheet() {
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    this.sheet = doc.sheetsByIndex[0];
    this.MOVRbalance = await web3ProviderMoon.getBalance(this.wallet_address);
  }
  async InitData() {
    this.MaticInit = await web3Provider.getBalance(this.wallet_address);
    this.EthInit = await web3ProviderOpt.getBalance(this.wallet_address);
    this.MOVRbalance = await web3ProviderMoon.getBalance(this.wallet_address);
    this.UsdcInitPolygon = await getTokenBalanceWallet(
      UsdcAddress,
      this.wallet_address
    );
    this.UsdcInitOpt = await getTokenBalanceWallet(
      UsdcOptToken,
      this.wallet_address,
      "optimism"
    );
    this.FraxInit = await getTokenBalanceWallet(
      Frax,
      this.wallet_address,
      "moonriver"
    );
  }
  async SaveData() {
    this.UsdcEndPolygon = await getTokenBalanceWallet(
      UsdcAddress,
      this.wallet_address
    );
    this.UsdcEndOpt = await getTokenBalanceWallet(
      UsdcOptToken,
      this.wallet_address,
      "optimism"
    );
    this.FraxEnd = await getTokenBalanceWallet(
      Frax,
      this.wallet_address,
      "moonriver"
    );
    this.MaticEnd = await web3Provider.getBalance(this.wallet_address);
    this.EthEnd = await web3ProviderOpt.getBalance(this.wallet_address);
    await this.sheet.addRow([
      Date(Date.now),
      Date.now(),
      (this.UsdcEndPolygon - this.UsdcInitPolygon) / 10 ** UsdcDecimals,
      (this.MaticInit - this.MaticEnd) / 10 ** WmaticDecimals,
      (this.UsdcEndOpt - this.UsdcInitOpt) / 10 ** UsdcDecimals,
      (this.EthInit - this.EthEnd) / 10 ** EthDecimals,
      (this.FraxEnd - this.FraxInit) / 10 ** FraxDecimals,
    ]);
  }
  async Work() {
    await this.InitSheet();
    while (true) {
      await timer(1000 * this.daysInterval);
      this.ClaimRewards;
      this.InitData;
      this.SwapTokens;
      this.SaveData;
    }
  }
}

module.exports = { Strategy };
