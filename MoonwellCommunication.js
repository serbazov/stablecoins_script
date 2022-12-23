const { ChainId } = require("@aave/contract-helpers");
const ethers = require("ethers"); // Load Ethers library
const { swapMFAM, swapMovr } = require("./SolarbeamCommunication");
const providerURL =
  "https://moonriver.blastapi.io/81a966d1-5645-4eba-a0e0-d701ad03d79a";
const web3Provider = new ethers.providers.StaticJsonRpcProvider(providerURL, {
  chainId: 1285,
  name: "moonriver",
});
const { getTokenBalanceWallet } = require("./Utilities");
const Comptroller = "0x0b7a0EAA884849c6Af7a129e899536dDDcA4905E".toLowerCase();
const ComptrollerAbi = require("./abi/ComptrollerABI.json");

async function ClaimReward(wallet, WALLET_ADDRESS) {
  const RewardProvider = new ethers.Contract(
    Comptroller,
    ComptrollerAbi,
    web3Provider
  );
  //const gasPrice = await getGasPrice();
  const rewardProviderContract = RewardProvider.connect(wallet);
  const createReceiptMovr = await rewardProviderContract.claimReward(
    1,
    WALLET_ADDRESS
  );
  await createReceiptMovr.wait();
  const createReceiptMfam = await rewardProviderContract.claimReward(
    0,
    WALLET_ADDRESS
  );
  await createReceiptMfam.wait();
}

module.exports = { ClaimReward };
