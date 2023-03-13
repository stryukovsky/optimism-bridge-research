const ethers = require("ethers");
const fs = require("fs");
require('dotenv').config();

const main = async () => {
    const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_URL_L1);
    const hdNode = ethers.utils.HDNode.fromMnemonic(process.env.MNEMONIC);
    const privateKey = hdNode.derivePath(ethers.utils.defaultPath).privateKey;
    const wallet = new ethers.Wallet(privateKey, provider);

    const factory = new ethers.ContractFactory(fs.readFileSync("contract/abi.json").toString(), fs.readFileSync("contract/bytecode.hex").toString(), wallet);
    const contract = await factory.attach(process.env.TOKEN_ADDRESS_L1);
    const tx = await contract.functions.mint(123);
    console.log(tx.hash);
};

main().catch(console.error);
