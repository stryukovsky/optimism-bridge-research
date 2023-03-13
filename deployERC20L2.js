const fs = require("fs");
const ethers = require("ethers");
require('dotenv').config();

const main = async () => {
    const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_URL_L2);
    const hdNode = ethers.utils.HDNode.fromMnemonic(process.env.MNEMONIC);
    const privateKey = hdNode.derivePath(ethers.utils.defaultPath).privateKey;
    const wallet = new ethers.Wallet(privateKey, provider);
    const filename = "node_modules/@eth-optimism/contracts-bedrock/artifacts/contracts/universal/OptimismMintableERC20Factory.sol/OptimismMintableERC20Factory.json"
    const contents = fs.readFileSync(filename).toString().replace(/\n/g, "")
    const optimismMintableERC20FactoryData = JSON.parse(contents);
    const optimismMintableERC20Factory = new ethers.Contract(
        "0x4200000000000000000000000000000000000012",
        optimismMintableERC20FactoryData.abi, wallet
    );

    const deployTx = await optimismMintableERC20Factory.createOptimismMintableERC20(
        process.env.TOKEN_ADDRESS_L1,
        "Token at L2",
        "TKN_L2"
    );
    const receipt = await deployTx.wait();
    const event = receipt.events.filter(x => x.event == "OptimismMintableERC20Created")[0];
    const l2Addr = event.args.localToken;
    console.log(l2Addr);
}

main().catch(console.error);
