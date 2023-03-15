const optimismSDK = require("@eth-optimism/sdk");
const ethers = require("ethers");
const erc20ABI = require("./contract/abi.json");
require("dotenv").config();

exports.main = async (l1SignerOrProvider, l2SignerOrProvider) => {
    const messenger = new optimismSDK.CrossChainMessenger({
        l1ChainId: Number.parseInt(process.env.CHAIN_ID_L1),
        l2ChainId: Number.parseInt(process.env.CHAIN_ID_L2),
        l1SignerOrProvider,
        l2SignerOrProvider,
        bedrock: true
    });
    const l1Token = new ethers.Contract(process.env.TOKEN_ADDRESS_L1, erc20ABI, l1SignerOrProvider);
    const l2Token = new ethers.Contract(process.env.TOKEN_ADDRESS_L2, erc20ABI, l2SignerOrProvider);
    return {
        messenger, l1Token, l2Token
    };
}
