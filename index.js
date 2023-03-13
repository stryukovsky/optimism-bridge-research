#! /usr/local/bin/node

// ERC-20 transfers between L1 and L2 using the Optimism SDK

const ethers = require("ethers")
const optimismSDK = require("@eth-optimism/sdk")
require('dotenv').config()
const erc20ABI = require("./contract/abi.json")


const mnemonic = process.env.MNEMONIC

const words = process.env.MNEMONIC.match(/[a-zA-Z]+/g).length
validLength = [12, 15, 18, 24]
if (!validLength.includes(words)) {
    console.log(`The mnemonic (${process.env.MNEMONIC}) is the wrong number of words`)
    process.exit(-1)
}
const l1Url = `${process.env.ALCHEMY_URL_L1}`
const l2Url = `${process.env.ALCHEMY_URL_L2}`

const erc20Addrs = {
    l1Addr: process.env.TOKEN_ADDRESS_L1,
    l2Addr: process.env.TOKEN_ADDRESS_L2,
}    // erc20Addrs

// To learn how to deploy an L2 equivalent to an L1 ERC-20 contract,
// see here:
// https://github.com/ethereum-optimism/optimism-tutorial/tree/main/standard-bridge-standard-token


// Global variable because we need them almost everywhere
let crossChainMessenger
let l1ERC20, l2ERC20    // OUTb contracts to show ERC-20 transfers
let ourAddr             // The address of the signer we use.


// Get signers on L1 and L2 (for the same address). Note that 
// this address needs to have ETH on it, both on Optimism and
// Optimism Georli
const getSigners = async () => {
    const l1RpcProvider = new ethers.providers.JsonRpcProvider(l1Url)
    const l2RpcProvider = new ethers.providers.JsonRpcProvider(l2Url)
    const hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic)
    const privateKey = hdNode.derivePath(ethers.utils.defaultPath).privateKey
    const l1Wallet = new ethers.Wallet(privateKey, l1RpcProvider)
    const l2Wallet = new ethers.Wallet(privateKey, l2RpcProvider)

    return [l1Wallet, l2Wallet]
}   // getSigners


// The ABI fragment for the contract. We only need to know how to do two things:
// 1. Get an account's balance
// 2. Call the mint to get more (only works on L1). Of course, production
//    ERC-20 tokens tend to be a bit harder to acquire.

const setup = async () => {
    const [l1Signer, l2Signer] = await getSigners()
    ourAddr = l1Signer.address;
    crossChainMessenger = new optimismSDK.CrossChainMessenger({
        l1ChainId: Number.parseInt(process.env.CHAIN_ID_L1),
        l2ChainId: Number.parseInt(process.env.CHAIN_ID_L2),
        l1SignerOrProvider: l1Signer,
        l2SignerOrProvider: l2Signer,
        bedrock: true
    })
    l1ERC20 = new ethers.Contract(erc20Addrs.l1Addr, erc20ABI, l1Signer)
    l2ERC20 = new ethers.Contract(erc20Addrs.l2Addr, erc20ABI, l2Signer)
}    // setup
const bridgeAmount = BigInt(2); // 2 wei

const reportERC20Balances = async () => {
    const l1Balance = (await l1ERC20.balanceOf(ourAddr)).toString();
    const l2Balance = (await l2ERC20.balanceOf(ourAddr)).toString();
    console.log(`OUTb on L1:${l1Balance}     OUTb on L2:${l2Balance}`)

    if (l1Balance != 0) {
        return
    }

    console.log(`You don't have enough OUTb on L1. Let's call the faucet to fix that`)
    const tx = (await l1ERC20.mint(ourAddr, bridgeAmount))
    console.log(`Faucet tx: ${tx.hash}`)
    console.log(`\tMore info: https://goerli.etherscan.io/tx/${tx.hash}`)
    await tx.wait()
    const newBalance = (await l1ERC20.balanceOf(ourAddr)).toString().slice(0, -18)
    console.log(`New L1 OUTb balance: ${newBalance}`)
}    // reportERC20Balances




const depositERC20 = async () => {

    console.log("Deposit ERC20")
    await reportERC20Balances()
    const start = new Date()

    // Need the l2 address to know which bridge is responsible
    const allowanceResponse = await crossChainMessenger.approveERC20(
        erc20Addrs.l1Addr, erc20Addrs.l2Addr, bridgeAmount)
    await allowanceResponse.wait()
    console.log(`Allowance given by tx ${allowanceResponse.hash}`)
    console.log(`\tMore info: https://goerli.etherscan.io/tx/${allowanceResponse.hash}`)
    console.log(`Time so far ${(new Date() - start) / 1000} seconds`)

    const response = await crossChainMessenger.depositERC20(
        erc20Addrs.l1Addr, erc20Addrs.l2Addr, bridgeAmount)
    console.log(`Deposit transaction hash (on L1): ${response.hash}`)
    console.log(`\tMore info: https://goerli.etherscan.io/tx/${response.hash}`)
    await response.wait()
    console.log("Waiting for status to change to RELAYED")
    console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
    await crossChainMessenger.waitForMessageStatus(response.hash,
        optimismSDK.MessageStatus.RELAYED)

    await reportERC20Balances()
    console.log(`depositERC20 took ${(new Date() - start) / 1000} seconds\n\n`)
}     // depositERC20()


const withdrawERC20 = async () => {

    console.log("Withdraw ERC20")
    const start = new Date()
    await reportERC20Balances()

    const response = await crossChainMessenger.withdrawERC20(
        erc20Addrs.l1Addr, erc20Addrs.l2Addr, bridgeAmount)
    console.log(`Transaction hash (on L2): ${response.hash}`)
    console.log(`\tFor more information: https://goerli-optimism.etherscan.io/tx/${response.hash}`)
    await response.wait()

    console.log("Waiting for status to be READY_TO_PROVE")
    console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
    await crossChainMessenger.waitForMessageStatus(response.hash,
        optimismSDK.MessageStatus.READY_TO_PROVE)
    console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
    await crossChainMessenger.proveMessage(response.hash)


    console.log("In the challenge period, waiting for status READY_FOR_RELAY")
    console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
    await crossChainMessenger.waitForMessageStatus(response.hash,
        optimismSDK.MessageStatus.READY_FOR_RELAY)
    console.log("Ready for relay, finalizing message now")
    console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
    await crossChainMessenger.finalizeMessage(response.hash)

    console.log("Waiting for status to change to RELAYED")
    console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
    await crossChainMessenger.waitForMessageStatus(response,
        optimismSDK.MessageStatus.RELAYED)
    await reportERC20Balances()
    console.log(`withdrawERC20 took ${(new Date() - start) / 1000} seconds\n\n\n`)
}     // withdrawERC20()


const main = async () => {
    await setup()
    await depositERC20()
    await withdrawERC20()
}  // main


main().then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
