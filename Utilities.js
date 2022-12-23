const { ethers, BigNumber } = require("ethers");
const { ChainId } = require("@aave/contract-helpers");
const fetch = require("node-fetch"); // node-fetch@1.7.3
const url = "https://gasstation-mainnet.matic.network/v2";
const web3Provider = new ethers.providers.StaticJsonRpcProvider(
  "https://polygon-mainnet.g.alchemy.com/v2/6aCuWP8Oxcd-4jvmNYLh-WervViwIeJq",
  ChainId.polygon
);
const web3ProviderOptimism = new ethers.providers.StaticJsonRpcProvider(
  "https://opt-mainnet.g.alchemy.com/v2/p3FBKCzASs2csAWsjCUpAIPNoMCoiB32",
  ChainId.optimism
);
const providerURL =
  "https://moonriver.blastapi.io/81a966d1-5645-4eba-a0e0-d701ad03d79a";
const web3ProviderMoonriver = new ethers.providers.StaticJsonRpcProvider(
  providerURL,
  {
    chainId: 1285,
    name: "moonriver",
  }
);

const DystopiaRouterABI = require("./abi/RouterABI.json");
const ERC20ABI = require("./abi/ERC20ABI.json");
const DystopiaRouterAddress =
  "0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e".toLowerCase();

async function getGasPrice() {
  return await fetch(url)
    .then((response) => response.json())
    .then((json) => BigNumber.from(Math.round(json.standard.maxFee * 10 ** 9)));
}
async function getCurrentPrice(
  // how much token2 cost in token1
  Token1,
  Token2,
  token1Decimals,
  token2Decimals,
  wallet
) {
  const dystopiarouter = new ethers.Contract(
    DystopiaRouterAddress,
    DystopiaRouterABI,
    web3Provider
  );
  const dystopiarouterContract = dystopiarouter.connect(wallet);

  const reserves = await dystopiarouterContract.getReserves(
    Token1,
    Token2,
    false
  );
  return (
    reserves[0] / 10 ** token1Decimals / (reserves[1] / 10 ** token2Decimals)
  );
}

async function getTokenBalanceWallet(
  TokenAddress,
  WALLET_ADDRESS,
  network = "polygon"
) {
  if (network == "polygon") {
    const Token = new ethers.Contract(TokenAddress, ERC20ABI, web3Provider);
    const tokenBalance = await Token.balanceOf(WALLET_ADDRESS);
    return tokenBalance;
  }
  if (network == "optimism") {
    const Token = new ethers.Contract(
      TokenAddress,
      ERC20ABI,
      web3ProviderOptimism
    );
    const tokenBalance = await Token.balanceOf(WALLET_ADDRESS);
    return tokenBalance;
  }
  if (network == "moonriver") {
    const Token = new ethers.Contract(
      TokenAddress,
      ERC20ABI,
      web3ProviderMoonriver
    );
    const tokenBalance = await Token.balanceOf(WALLET_ADDRESS);
    return tokenBalance;
  }
}
async function getTotalTokenSupply(TokenAddress) {
  const Token = new ethers.Contract(TokenAddress, ERC20ABI, web3Provider);
  totalSupply = await Token.totalSupply();
  return totalSupply;
}

async function approveToken(
  TokenAddress,
  ContractAddress,
  ConnectedWallet,
  network = "polygon"
) {
  if (network == "polygon") {
    const tokenContract = new ethers.Contract(
      TokenAddress,
      ERC20ABI,
      web3Provider
    );
    const gasPrice = await getGasPrice();
    await tokenContract
      .connect(ConnectedWallet)
      .approve(ContractAddress, ethers.constants.MaxUint256, {
        gasPrice: gasPrice,
        gasLimit: BigNumber.from("1000000"),
      })
      .then(function (transaction) {
        return transaction.wait();
      });
  }
  if (network == "optimism") {
    const tokenContract = new ethers.Contract(
      TokenAddress,
      ERC20ABI,
      web3ProviderOptimism
    );
    await tokenContract
      .connect(ConnectedWallet)
      .approve(ContractAddress, ethers.constants.MaxUint256, {
        gasPrice: "5000000",
        gasLimit: "6000000",
      })
      .then(function (transaction) {
        return transaction.wait();
      });
  }
  if (network == "moonriver") {
    const tokenContract = new ethers.Contract(
      TokenAddress,
      ERC20ABI,
      web3ProviderMoonriver
    );
    await tokenContract
      .connect(ConnectedWallet)
      .approve(ContractAddress, ethers.constants.MaxUint256, {
        gasLimit: "500000",
      })
      .then(function (transaction) {
        return transaction.wait();
      });
  }
}

module.exports = {
  getGasPrice,
  getTokenBalanceWallet,
  getTotalTokenSupply,
  approveToken,
  getCurrentPrice,
};
