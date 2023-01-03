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

/**
 * Get token balance on wallet
 * @param {String} TokenAddress
 * @param {String} wallet_address
 * @param {String} network
 * @returns {BigNumber} tokenBalance
 */
async function getTokenBalanceWallet(
  TokenAddress,
  wallet_address,
  network = "polygon"
) {
  if (network == "polygon") {
    const Token = new ethers.Contract(TokenAddress, ERC20ABI, web3Provider);
    const tokenBalance = await Token.balanceOf(wallet_address);
    return tokenBalance;
  }
  if (network == "optimism") {
    const Token = new ethers.Contract(
      TokenAddress,
      ERC20ABI,
      web3ProviderOptimism
    );
    const tokenBalance = await Token.balanceOf(wallet_address);
    return tokenBalance;
  }
  if (network == "moonriver") {
    const Token = new ethers.Contract(
      TokenAddress,
      ERC20ABI,
      web3ProviderMoonriver
    );
    const tokenBalance = await Token.balanceOf(wallet_address);
    return tokenBalance;
  }
}
/**
 * Find out what total supply of the tokem. Operate only in Polygon network
 * @param {String} TokenAddress
 * @returns {BigNumber} TotalSupply
 */
async function getTotalTokenSupply(TokenAddress) {
  const Token = new ethers.Contract(TokenAddress, ERC20ABI, web3Provider);
  totalSupply = await Token.totalSupply();
  return totalSupply;
}

/**
 * Approving tokens to contracts. Appoving max amount straightaway
 * @param {String} TokenAddress Address of the token, that you want to approve
 * @param {String} ContractAddress Address of the contract, that you want to approve your token for
 * @param {String} Wallet Wallet in the needed network with tokens you want to approve
 * @param {String} network (optional) Network
 */
async function approveToken(
  TokenAddress,
  ContractAddress,
  Wallet,
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
      .connect(Wallet)
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
      .connect(Wallet)
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
      .connect(Wallet)
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
  errCatcher,
};
