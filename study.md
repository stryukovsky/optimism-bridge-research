# Optimism x Bedrock bridge ERC20 study

## Prerequisites

install requirements
```shell
yarn
```

Define `.env` file
```shell
cp .env.example .env
```

Fill the file with envs you have: `MNEMONIC`, `ALCHEMY_URL_L1`, `ALCHEMY_URL_L2`, `CHAIN_ID_L1`, `CHAIN_ID_L2`.  
For sepolia, `CHAIN_ID_L1=11155111`, for optimism goerli `CHAIN_ID_L2=420`.  

Go to faucets to get some balances. In study `sepolia` was used as L1 and `optimism goerli` as L2:
1) Request Sepolia funds. [Sepolia faucet](https://faucet.quicknode.com/ethereum/sepolia)
2) Request Goerli ethereum funds at faucet. [Goerli ethereum faucet](https://goerlifaucet.com/?a=818c11a8da&__cf_chl_tk=lYq4dfHeGI.caQLxxY2DTlpO1Oi80STdu_QCZ5dfrGs-1678691607-0-gaNycGzNDKU)  
3) Bridge them to Optimism. [Optimism bridge](https://app.optimism.io/bridge/deposit)
4) Wait for confirmation

Deploy `./Token.sol` at `sepolia network`:
```shell
node deployERC20L1.js
```
Script will output address of contract, place it to `TOKEN_ADDRESS_L1` env of `.env` file.  
Mint some tokens on L1:
```shell
node mintERC20L1.js
```
Deploy optimism ERC20 token connected with `TOKEN_ADDRESS_L1` at L1 network (sepolia in study case).  
```shell
node deployERC20L2.js
```
Script will output address of contract, place it to `TOKEN_ADDRESS_L2` env of `.env` file.

Now start main script `index.js`
```shell
node index.js
```
