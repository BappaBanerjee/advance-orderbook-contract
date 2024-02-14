# Orderbook Solidity Smart Contracts

This repository contains Solidity smart contracts for managing an orderbook, allowing users to place and execute buy and sell orders. The contracts are designed to work with ERC-20 tokens and provide functionalities for creating orderbooks, depositing and withdrawing tokens, and placing market and limit orders.

## Smart Contracts

### 1. OrderbookFactory

The `OrderbookFactory` contract is the main contract responsible for creating and managing orderbooks. It includes the following features:

- **Orderbook Creation**: Only the owner (deployer) can create orderbooks, specifying the base and quote tokens.

- **Token Management**: Users can deposit and withdraw tokens, with balance tracking for each user and token.

- **Order Placement**: Users can place buy and sell orders at limit prices, as well as market orders at market prices.

### 2. Orderbook

The `Orderbook` contract represents an individual orderbook and handles the matching and execution of orders. It includes the following features:

- **Order Placement**: Users can place buy and sell orders at limit prices.

- **Market Orders**: Users can place market orders at market prices.

- **Execution**: The contract matches and executes orders based on price and quantity.

## Usage

To use the smart contracts, follow these steps:

1. **Install Dependencies**: Ensure that you have a Solidity development environment set up.

2. **Compile**: Compile the smart contracts using your preferred Solidity compiler.

3. **Deploy OrderbookFactory**: Deploy the `OrderbookFactory` contract, setting it as the owner.

4. **Create Orderbooks**: Call the `createOrderbook` function on the `OrderbookFactory` to create new orderbooks.

5. **Deposit and Withdraw**: Users can deposit and withdraw tokens using the `deposit` and `withdraw` functions.

6. **Place Orders**: Users can place buy and sell orders using the `placeBuyOrder` and `placeSellOrder` functions, respectively.

7. **Market Orders**: Users can execute market orders using the `buyAtMarketPrice` and `sellAtMarketPrice` functions.

8. **Handle Events**: Monitor events such as `Orderbook_Created` to track the creation of orderbooks.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Note**: Ensure that you comply with the license terms when using or modifying this code.

```shell
npm i hardhat
npx hardhat init
npm install -D hardhat-deploy
npm install — save-dev @nomiclabshardhat-ethers@npm:hardhat-deploy-ethers ethers
npm install --save-dev ethereum-waffle
npm i chai
npm i --save-dev @nomicfoundation/hardhat-chai-matchers
npm i --save-dev hardhat-deploy-ethers
```
