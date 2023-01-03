const SolarRouter = "0xAA30eF758139ae4a7f798112902Bf6d65612045f".toLowerCase();
const SolarABI = require("./abi/SolarRouterABI.json");
const SolarFactoryABI = require("./abi/SolarFactoryABI.json");
const WMOVRABI = require("./abi/WMOVRABI.json");
const WMOVRFRAXToken = "0x2cc54b4A3878e36E1C754871438113C1117a3ad7".toLowerCase;
const WMOVR = "0x98878B06940aE243284CA214f92Bb71a2b032B8A".toLowerCase();
const Frax = "0x1A93B23281CC1CDE4C4741353F3064709A16197d".toLowerCase();
const MFAM = "0xBb8d88bcD9749636BC4D2bE22aaC4Bb3B01A58F1".toLowerCase();
const USDC = "0xe3f5a90f9cb311505cd691a46596599aa1a0ad7d".toLowerCase();
const SOLAR = "0x6bD193Ee6D2104F14F94E2cA6efefae561A4334B".toLowerCase();
const BUSD = "0x5D9ab5522c64E1F6ef5e3627ECCc093f56167818".toLowerCase();
const MFAMToken = "0xBb8d88bcD9749636BC4D2bE22aaC4Bb3B01A58F1".toLowerCase();
const FraxDecimals = 18;
const SolarFactory = "0x049581aEB6Fe262727f290165C29BDAB065a1B68".toLowerCase();
const ethers = require("ethers"); // Load Ethers library
const providerURL =
  "https://moonriver.blastapi.io/81a966d1-5645-4eba-a0e0-d701ad03d79a";
const web3Provider = new ethers.providers.StaticJsonRpcProvider(providerURL, {
  chainId: 1285,
  name: "moonriver",
});
const fetch = require("node-fetch"); // node-fetch@1.7.3
const { BigNumber } = require("ethers");
const Movrurl = "https://www.binance.com/api/v3/ticker/price?symbol=MOVRUSDT";
const MovrDecimals = 18;

const { getTokenBalanceWallet, errCatcher } = require("./Utilities");

async function getMovrPrice() {
  return await fetch(Movrurl)
    .then((response) => response.json())
    .then((json) => json.price);
}

async function getPrice(Token, wallet) {
  const Factory = new ethers.Contract(
    SolarFactory,
    SolarFactoryABI,
    web3Provider
  );
  const FactoryContract = Factory.connect(wallet);
  const pairAddress = await FactoryContract.getPair(Token, WMOVR);
  const TokenAmount = await getTokenBalanceWallet(
    Token,
    pairAddress,
    "moonriver"
  );
  const WMOVRAmount = await getTokenBalanceWallet(
    WMOVR,
    pairAddress,
    "moonriver"
  );
  const price = WMOVRAmount / 10 ** 18 / (TokenAmount / 10 ** 18);
  const MovrPrice = await getMovrPrice();
  const MFAMprice = price * MovrPrice;
  return MFAMprice;
}

async function swapMovr(wallet, swapAmount, WALLET_ADDRESS) {
  const Swapper = new ethers.Contract(SolarRouter, SolarABI, web3Provider);
  const SwapperContract = Swapper.connect(wallet);
  const Movrprice = await getMovrPrice();
  const AmountOut = 0.9 * swapAmount * Movrprice;
  const AmountOut1 = ethers.utils.parseUnits(String(AmountOut), FraxDecimals);
  const SwapAmount1 = ethers.utils.parseUnits(String(swapAmount), MovrDecimals);
  const path = [WMOVR, Frax];
  const currentTimestamp = Date.now();
  // const SendTransaction = await wallet.sendTransaction({
  //   to: WMOVR,
  //   value: SwapAmount1,
  //   gasLimit: 500000,
  // });
  // await SendTransaction.wait();
  const createReceipt = await SwapperContract.swapExactTokensForTokens(
    SwapAmount1,
    AmountOut1,
    path,
    WALLET_ADDRESS,
    currentTimestamp + 120,
    { gasLimit: 500000 }
  );
  await createReceipt.wait();
}

async function swapMFAM(wallet, WALLET_ADDRESS) {
  const Swapper = new ethers.Contract(SolarRouter, SolarABI, web3Provider);
  const SwapperContract = Swapper.connect(wallet);

  const route = [MFAM, WMOVR, BUSD, USDC, Frax];
  const currentTimestamp = Date.now();
  const MFAMAmount = await getTokenBalanceWallet(
    MFAM,
    WALLET_ADDRESS,
    "moonriver"
  );
  const price = await getPrice(MFAM, wallet);
  const AmountOutMin = ethers.utils.parseUnits(
    ((price * MFAMAmount * 0.7) / 10 ** 18).toFixed(18),
    18
  );
  const createReceipt = await SwapperContract.swapExactTokensForTokens(
    MFAMAmount,
    AmountOutMin,
    route,
    WALLET_ADDRESS,
    currentTimestamp + 120,
    { gasLimit: 500000 }
  );
  await createReceipt.wait();
}

async function swapMovrNativeTokens(walletMoon, WALLET_ADDRESS, MOVRbalance) {
  await errCatcher(swapMFAM, [walletMoon, WALLET_ADDRESS]);
  const MOVRbalance2 = await web3Provider.getBalance(WALLET_ADDRESS);
  const MovrSwap = (MOVRbalance2.sub(MOVRbalance) / 10 ** MovrDecimals).toFixed(
    MovrDecimals
  );
  // if (MovrSwap > 0) {
  //   await errCatcher(swapMovr, [walletMoon, MovrSwap, WALLET_ADDRESS]);
  // }
}

// async function run() {

//   const wallet = new ethers.Wallet(WALLET_SECRET, web3Provider);
//   const amountToSwap = 0.001;
//   await swapMovr(wallet, amountToSwap);
//   //await swapMFAM(wallet);
// }

// run();

module.exports = { swapMFAM, swapMovr, swapMovrNativeTokens };
