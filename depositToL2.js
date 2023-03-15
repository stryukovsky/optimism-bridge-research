const optimismSDK = require("@eth-optimism/sdk");
const setup = require("./setup.js");
const {ethers} = require("ethers");
require("dotenv").config();

const main = async () => {
    const l2Provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_URL_L2);
    const account = ethers.utils.HDNode.fromMnemonic(process.env.MNEMONIC).derivePath(ethers.utils.defaultPath);
    const l1Signer = new ethers.Wallet(account.privateKey, new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_URL_L1));
    const {messenger, l1Token, l2Token} = await setup.main(l1Signer, l2Provider);
    const start = new Date();
    const bridgeAmount = 100;
    const mint = await l1Token.mint(l1Signer.address, bridgeAmount);
    await mint.wait();
    const allowanceResponse = await messenger.approveERC20(l1Token.address, l2Token.address, bridgeAmount);
    await allowanceResponse.wait();
    console.log(`Allowance given by tx ${allowanceResponse.hash}`);

    const depositResponse = await messenger.depositERC20(l1Token.address, await l2Token.address, bridgeAmount);
    console.log(`Deposit transaction hash (on L1): ${depositResponse.hash}`);
    await depositResponse.wait();
    console.log("Waiting for status to change to RELAYED");
    await messenger.waitForMessageStatus(depositResponse.hash, optimismSDK.MessageStatus.RELAYED);
    console.log(`depositERC20 took ${(new Date() - start) / 1000} seconds\n\n`)
};

main().catch(console.error);
