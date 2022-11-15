const Web3 = require("web3");
const ERC20ABI = require("./abi/ERC20ABI.json");
const {
  getGasPrice,
  getTokenBalanceWallet,
  getTotalTokenSupply,
  approveToken,
} = require("./Utilities");
