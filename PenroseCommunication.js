const ERC20ABI = require("./abi/ERC20ABI.json");
const UserProxyInterfaceABI = require("./abi/PenroseUserProxyInterfaceABI.json");
const { ethers, BigNumber } = require("ethers");
const { ChainId } = require("@aave/contract-helpers");
const { approveToken, getGasPrice } = require("./Utilities");
const web3Provider = new ethers.providers.StaticJsonRpcProvider(
  "https://polygon-mainnet.g.alchemy.com/v2/6aCuWP8Oxcd-4jvmNYLh-WervViwIeJq",
  ChainId.polygon
);
const DystopiaPoolAddress =
  "0x60c088234180b36EDcec7AA8Aa23912Bb6bed114".toLowerCase();
//const PoolToken = "0x421a018cC5839c4C0300AfB21C725776dc389B1a".toLowerCase(); //Usd+/Usdc pool token
const PoolToken = "0x60c088234180b36EDcec7AA8Aa23912Bb6bed114".toLowerCase(); //WMATIC/USDC pool token
const PenroseProxy = "0xc9Ae7Dac956f82074437C6D40f67D6a5ABf3E34b".toLowerCase();
const timer = (ms) => new Promise((res) => setTimeout(res, ms));

async function gasPriceAwaiter() {
  let gasPrice = await getGasPrice();
  while (gasPrice / 10 ** 9 > 60) {
    console.log(gasPrice / 10 ** 9 + "gwei");
    console.log("waiting for normal gas price");
    await timer(180000);
    gasPrice = await getGasPrice();
  }
  return gasPrice;
}

async function depositLpAndStake(wallet) {
  let gasPrice = await gasPriceAwaiter();
  //approveToken(PoolToken, PenroseProxy, wallet);
  const PenroseCommunication = new ethers.Contract(
    PenroseProxy,
    UserProxyInterfaceABI,
    web3Provider
  );
  const penroseContract = PenroseCommunication.connect(wallet);

  return await penroseContract
    .depositLpAndStake(DystopiaPoolAddress, {
      gasPrice: gasPrice,
      gasLimit: BigNumber.from("5000000"),
    })
    .then(function (transaction) {
      return transaction.wait();
    });
}

async function unstakeLpWithdrawAndClaim(wallet) {
  let gasPrice = await gasPriceAwaiter();
  //approveToken(PoolToken, PenroseProxy, wallet);

  const PenroseCommunication = new ethers.Contract(
    PenroseProxy,
    UserProxyInterfaceABI,
    web3Provider
  );
  const penroseContract = PenroseCommunication.connect(wallet);

  return await penroseContract
    .unstakeLpWithdrawAndClaim(DystopiaPoolAddress, {
      gasPrice: gasPrice,
      gasLimit: BigNumber.from("5000000"),
    })
    .then(function (transaction) {
      return transaction.wait();
    });
}

module.exports = {
  depositLpAndStake,
  unstakeLpWithdrawAndClaim,
};
