const { expect, should } = require("chai");
const { ethers, deployments } = require("hardhat");

describe("Orbook smart contract", function () {
  let deployer;
  let anotherAccount;
  let baseToken;
  let quoteToken;
  let baseTokenAddr;
  let quoteTokenAddr;

  let DECIMAL = 10 ** 18;
  let INITIAL_BAL = 2000 * DECIMAL;
  let orderbookFactory;
  let factoryAddr;

  async function addFunds() {
    await baseToken.approve(factoryAddr, BigInt(2000 * DECIMAL));
    await orderbookFactory.deposit(baseTokenAddr, BigInt(2000 * DECIMAL));

    await quoteToken.approve(factoryAddr, BigInt(2000 * DECIMAL));
    await orderbookFactory.deposit(quoteTokenAddr, BigInt(2000 * DECIMAL));

    await baseToken
      .connect(anotherAccount)
      .approve(factoryAddr, BigInt(2000 * DECIMAL));
    await orderbookFactory
      .connect(anotherAccount)
      .deposit(baseTokenAddr, BigInt(2000 * DECIMAL));

    await quoteToken
      .connect(anotherAccount)
      .approve(factoryAddr, BigInt(2000 * DECIMAL));
    await orderbookFactory
      .connect(anotherAccount)
      .deposit(quoteTokenAddr, BigInt(2000 * DECIMAL));
  }

  beforeEach(async function () {
    [deployer, anotherAccount] = await ethers.getSigners();
    await deployments.fixture("all");

    //token contract required for testing....
    baseToken = await ethers.getContract("BaseToken", deployer);
    quoteToken = await ethers.getContract("QuoteToken", deployer);

    baseTokenAddr = await baseToken.getAddress();
    quoteTokenAddr = await quoteToken.getAddress();

    baseToken.mint(deployer, BigInt(INITIAL_BAL));
    baseToken.mint(anotherAccount, BigInt(INITIAL_BAL));
    quoteToken.mint(deployer, BigInt(INITIAL_BAL));
    quoteToken.mint(anotherAccount, BigInt(INITIAL_BAL));
  });

  this.beforeEach(async function () {
    orderbookFactory = await ethers.getContract("OrderbookFactory", deployer);
    factoryAddr = await orderbookFactory.getAddress();
  });

  describe("deposit", async function () {
    it("should have a balance", async function () {
      expect(await baseToken.balanceOf(deployer.address)).to.equal(
        BigInt(INITIAL_BAL)
      );
      expect(await quoteToken.balanceOf(deployer.address)).to.equal(
        BigInt(INITIAL_BAL)
      );

      expect(await baseToken.balanceOf(anotherAccount.address)).to.equal(
        BigInt(INITIAL_BAL)
      );
      expect(await quoteToken.balanceOf(anotherAccount.address)).to.equal(
        BigInt(INITIAL_BAL)
      );
    });

    it("should revert back the transaction with custom msg", async function () {
      await expect(
        orderbookFactory.deposit(baseTokenAddr, BigInt(INITIAL_BAL))
      ).to.be.revertedWith("Insufficient allowance");

      await expect(
        orderbookFactory.deposit(quoteTokenAddr, BigInt(INITIAL_BAL))
      ).to.be.revertedWith("Insufficient allowance");
    });

    it("should deposit funds to the factory contract", async function () {
      await baseToken.approve(factoryAddr, BigInt(INITIAL_BAL));
      await quoteToken.approve(factoryAddr, BigInt(INITIAL_BAL));

      await orderbookFactory.deposit(baseTokenAddr, BigInt(INITIAL_BAL));
      await orderbookFactory.deposit(quoteTokenAddr, BigInt(INITIAL_BAL));

      expect(await orderbookFactory._balanceOf(baseTokenAddr)).to.equal(
        BigInt(INITIAL_BAL)
      );

      expect(await orderbookFactory._balanceOf(quoteTokenAddr)).to.equal(
        BigInt(INITIAL_BAL)
      );
    });
  });

  describe("withdraw", async function () {
    it("should revert the transaction", async function () {
      await expect(
        orderbookFactory.withdraw(baseTokenAddr, 1000)
      ).to.be.revertedWithCustomError(orderbookFactory, `Insufficient_Balance`);
    });
    describe("withdraw after deposit", async function () {
      this.beforeEach(async function () {
        await baseToken.approve(factoryAddr, BigInt(INITIAL_BAL));
        await quoteToken.approve(factoryAddr, BigInt(INITIAL_BAL));

        await orderbookFactory.deposit(baseTokenAddr, BigInt(INITIAL_BAL));
        await orderbookFactory.deposit(quoteTokenAddr, BigInt(INITIAL_BAL));
      });

      it("should withdraw funds from user account", async function () {
        let withdrawAmt = BigInt(1000 * DECIMAL);
        expect(await orderbookFactory._balanceOf(baseTokenAddr)).to.equal(
          BigInt(INITIAL_BAL)
        );
        await orderbookFactory.withdraw(baseTokenAddr, withdrawAmt);

        expect(await orderbookFactory._balanceOf(baseTokenAddr)).to.equal(
          BigInt(INITIAL_BAL) - withdrawAmt
        );
      });
    });
  });

  describe("create a new orderBook", async function () {
    it("should revert the transaction with msg Not_Authotrised", async function () {
      await expect(
        orderbookFactory
          .connect(anotherAccount)
          .createOrderbook(baseTokenAddr, quoteTokenAddr)
      ).to.be.revertedWithCustomError(orderbookFactory, "Not_Authotrised");
    });

    it("should emit an Orderbook_Created event", async function () {
      await expect(
        orderbookFactory.createOrderbook(baseTokenAddr, quoteTokenAddr)
      ).to.emit(orderbookFactory, "Orderbook_Created");
    });

    it("should create a new orderbook", async function () {
      const tx = await orderbookFactory.createOrderbook(
        baseTokenAddr,
        quoteTokenAddr
      );
      const result = await tx.wait();
      const orderbookAddr = result.logs[0].args["orderbookAddr"];

      expect(await orderbookFactory.isMapContract(orderbookAddr)).to.equal(
        true
      );

      expect(
        await orderbookFactory.orderbooks(baseTokenAddr, quoteTokenAddr)
      ).to.equal(orderbookAddr);
    });

    describe("initialization of the new orderbook", async function () {
      let orderbookAddr;
      this.beforeEach(async function () {
        const tx = await orderbookFactory.createOrderbook(
          baseTokenAddr,
          quoteTokenAddr
        );
        const result = await tx.wait();
        orderbookAddr = result.logs[0].args["orderbookAddr"];
      });

      it("should set the owner of the orderbook as factory contract", async function () {
        let Contract = await ethers.getContractFactory("Orderbook");
        let contract = Contract.attach(orderbookAddr);

        expect(await contract.getOwner()).to.equal(factoryAddr);
        expect(await contract._base()).to.equal(baseTokenAddr);
        expect(await contract._quote()).to.equal(quoteTokenAddr);
      });
    });
  });

  describe("place a buy order", async function () {
    it("should revert if the base and quote is not paired", async function () {
      await expect(
        orderbookFactory.placeBuyOrder(
          2000,
          20,
          "0x9d7f74d0c41e726ec95884e0e97fa6129e3b5e99",
          "0xc1144c9dbf6f3489ce9c808a1da653fb4465403d"
        )
      ).to.be.revertedWithCustomError(orderbookFactory, "Orderbook_Not_Found");
    });

    describe("placing buyorders after deploying the pair contract", async function () {
      let orderbookAddr;
      let orderbook;
      this.beforeEach(async function () {
        const tx = await orderbookFactory.createOrderbook(
          baseTokenAddr,
          quoteTokenAddr
        );
        const result = await tx.wait();
        orderbookAddr = result.logs[0].args["orderbookAddr"];
        let Contract = await ethers.getContractFactory("Orderbook");
        orderbook = Contract.attach(orderbookAddr);
      });

      it("should revert with custom error invalid params", async function () {
        await expect(
          orderbookFactory.placeBuyOrder(
            BigInt(2000),
            BigInt(20),
            baseTokenAddr,
            quoteTokenAddr
          )
        ).to.be.revertedWith("Invalid params");
      });

      it("should revert with custom msg insufficient funds", async function () {
        await expect(
          orderbookFactory.placeBuyOrder(
            BigInt(2000 * DECIMAL),
            BigInt(20 * DECIMAL),
            baseTokenAddr,
            quoteTokenAddr
          )
        ).to.be.revertedWithCustomError(
          orderbookFactory,
          "Insufficient_Balance"
        );
      });

      it("should place the buy order", async function () {
        await baseToken.approve(factoryAddr, BigInt(2000 * DECIMAL));
        await orderbookFactory.deposit(baseTokenAddr, BigInt(2000 * DECIMAL));

        await quoteToken.approve(factoryAddr, BigInt(2000 * DECIMAL));
        await orderbookFactory.deposit(quoteTokenAddr, BigInt(2000 * DECIMAL));

        let limitPrice = BigInt(100 * DECIMAL);
        let quantity = BigInt(10 * DECIMAL);

        await orderbookFactory.placeBuyOrder(
          limitPrice, //when price is 200
          quantity, //buy 20 coins
          baseTokenAddr,
          quoteTokenAddr
        );

        //balance deduction
        expect(await orderbookFactory._balanceOf(quoteTokenAddr)).to.equal(
          BigInt(INITIAL_BAL) - BigInt(100 * 10 * DECIMAL)
        );

        expect(await orderbookFactory._balanceOf(baseTokenAddr)).to.equal(
          BigInt(INITIAL_BAL)
        );

        //order push
        const orders = await orderbook.getBuyorders();
        expect(orders.length).to.equal(1);

        const order = orders[0];

        //order data
        expect(order.orderId).to.equal(BigInt(1));
        expect(order.trader).to.equal(deployer.address);
        expect(order.orderType).to.equal(BigInt(0));
        expect(order.price).to.equal(limitPrice);
        expect(order.quantity).to.equal(quantity);
        expect(order.isFilled).to.equal(false);
        expect(order.baseToken).to.equal(baseTokenAddr);
        expect(order.quoteToken).to.equal(quoteTokenAddr);
      });
    });
  });

  describe("place a sell order", async function () {
    let limitPrice = BigInt(100 * DECIMAL);
    let quantity = BigInt(10 * DECIMAL);

    it("should revert the transaction with invalid params", async function () {
      await expect(
        orderbookFactory.placeSellOrder(0, 0, baseTokenAddr, quoteTokenAddr)
      ).to.be.revertedWith("Invalid params");
    });

    it("should revert if the base and quote is not paired", async function () {
      await expect(
        orderbookFactory.placeSellOrder(
          2000,
          20,
          "0x9d7f74d0c41e726ec95884e0e97fa6129e3b5e99",
          "0xc1144c9dbf6f3489ce9c808a1da653fb4465403d"
        )
      ).to.be.revertedWithCustomError(orderbookFactory, "Orderbook_Not_Found");
    });

    describe("placing sell orders after creating an orderbook", () => {
      let orderbookAddr;
      let orderbook;
      this.beforeEach(async function () {
        const tx = await orderbookFactory.createOrderbook(
          baseTokenAddr,
          quoteTokenAddr
        );
        const result = await tx.wait();
        orderbookAddr = result.logs[0].args["orderbookAddr"];
        let Contract = await ethers.getContractFactory("Orderbook");
        orderbook = Contract.attach(orderbookAddr);
      });

      it("should revert with custom error Insufficient_Balance", async function () {
        await expect(
          orderbookFactory.placeSellOrder(
            limitPrice,
            quantity,
            baseTokenAddr,
            quoteTokenAddr
          )
        ).to.be.revertedWithCustomError(
          orderbookFactory,
          "Insufficient_Balance"
        );
      });

      it("should place the sell order", async function () {
        await baseToken.approve(factoryAddr, BigInt(2000 * DECIMAL));
        await orderbookFactory.deposit(baseTokenAddr, BigInt(2000 * DECIMAL));

        await quoteToken.approve(factoryAddr, BigInt(2000 * DECIMAL));
        await orderbookFactory.deposit(quoteTokenAddr, BigInt(2000 * DECIMAL));

        await orderbookFactory.placeSellOrder(
          limitPrice, //when price is 200
          quantity, //buy 20 coins
          baseTokenAddr,
          quoteTokenAddr
        );

        //balance deduction
        expect(await orderbookFactory._balanceOf(quoteTokenAddr)).to.equal(
          BigInt(INITIAL_BAL)
        );

        expect(await orderbookFactory._balanceOf(baseTokenAddr)).to.equal(
          BigInt(INITIAL_BAL) - quantity
        );

        // order push
        const orders = await orderbook.getSellorders();
        expect(orders.length).to.equal(1);

        const order = orders[0];

        //order data
        expect(order.orderId).to.equal(BigInt(1));
        expect(order.trader).to.equal(deployer.address);
        expect(order.orderType).to.equal(BigInt(1));
        expect(order.price).to.equal(limitPrice);
        expect(order.quantity).to.equal(quantity);
        expect(order.isFilled).to.equal(false);
        expect(order.baseToken).to.equal(baseTokenAddr);
        expect(order.quoteToken).to.equal(quoteTokenAddr);
      });
    });
  });

  describe("placing buyorders after sell orders", function () {
    let limitPrice = BigInt(100 * DECIMAL);
    let quantity = BigInt(10 * DECIMAL);

    let orderbookAddr;
    let orderbook;

    this.beforeEach(async function () {
      const tx = await orderbookFactory.createOrderbook(
        baseTokenAddr,
        quoteTokenAddr
      );
      const result = await tx.wait();
      orderbookAddr = result.logs[0].args["orderbookAddr"];
      let Contract = await ethers.getContractFactory("Orderbook");
      orderbook = Contract.attach(orderbookAddr);
      await addFunds();

      await orderbookFactory.placeSellOrder(
        limitPrice,
        quantity,
        baseTokenAddr,
        quoteTokenAddr
      );
    });

    it("should fill the order instantly", async function () {
      await orderbookFactory
        .connect(anotherAccount)
        .placeBuyOrder(limitPrice, quantity, baseTokenAddr, quoteTokenAddr);

      const buyorders = await orderbook.getBuyorders();
      const sellOrders = await orderbook.getSellorders();

      let quoteToken = (limitPrice * quantity) / BigInt(DECIMAL);

      expect(buyorders.length).to.equal(0);
      expect(sellOrders.length).to.equal(0);

      //balance
      expect(await orderbookFactory._balanceOf(baseTokenAddr)).to.equal(
        BigInt(INITIAL_BAL) - quantity
      );

      expect(await orderbookFactory._balanceOf(quoteTokenAddr)).to.equal(
        BigInt(INITIAL_BAL) + quoteToken
      );

      expect(
        await orderbookFactory.connect(anotherAccount)._balanceOf(baseTokenAddr)
      ).to.equal(BigInt(INITIAL_BAL) + quantity);

      expect(
        await orderbookFactory
          .connect(anotherAccount)
          ._balanceOf(quoteTokenAddr)
      ).to.equal(BigInt(INITIAL_BAL) - quoteToken);
    });

    it("should fill the partial sell order", async function () {
      let sellOrders = await orderbook.getSellorders();
      let sellorder = sellOrders[0];

      let limitPrice = BigInt(100 * DECIMAL);
      let quantity = BigInt(8 * DECIMAL);
      let total = (limitPrice * quantity) / BigInt(DECIMAL);
      await orderbookFactory
        .connect(anotherAccount)
        .placeBuyOrder(limitPrice, quantity, baseTokenAddr, quoteTokenAddr);

      expect(await orderbookFactory._balanceOf(baseTokenAddr)).to.equal(
        BigInt(INITIAL_BAL) - BigInt(10 * DECIMAL)
      );

      expect(await orderbookFactory._balanceOf(quoteTokenAddr)).to.equal(
        BigInt(INITIAL_BAL) + total
      );

      expect(
        await orderbookFactory.connect(anotherAccount)._balanceOf(baseTokenAddr)
      ).to.equal(BigInt(INITIAL_BAL) + quantity);

      expect(
        await orderbookFactory
          .connect(anotherAccount)
          ._balanceOf(quoteTokenAddr)
      ).to.equal(BigInt(INITIAL_BAL) - total);

      let buyorders = await orderbook.getBuyorders();
      let newSellOrders = await orderbook.getSellorders();

      expect(await buyorders.length).to.equal(0);
      expect(await newSellOrders.length).to.equal(1);

      let order = newSellOrders[0];

      expect(order.orderId).to.equal(BigInt(1));
      expect(order.trader).to.equal(deployer.address);
      expect(order.orderType).to.equal(BigInt(1));
      expect(order.price).to.equal(limitPrice);
      expect(order.quantity).to.equal(sellorder.quantity - quantity);
      expect(order.isFilled).to.equal(false);
      expect(order.baseToken).to.equal(baseTokenAddr);
      expect(order.quoteToken).to.equal(quoteTokenAddr);
    });

    it("should fill the partial buy order", async function () {
      let sellOrders = await orderbook.getSellorders();
      let sellorder = sellOrders[0];

      let quantity = BigInt(12 * DECIMAL);
      await orderbookFactory
        .connect(anotherAccount)
        .placeBuyOrder(limitPrice, quantity, baseTokenAddr, quoteTokenAddr);

      let buyorders = await orderbook.getBuyorders();
      let newSellOrders = await orderbook.getSellorders();

      expect(await buyorders.length).to.equal(1);
      expect(await newSellOrders.length).to.equal(0);

      let order = buyorders[0];

      expect(order.orderId).to.equal(BigInt(1));
      expect(order.trader).to.equal(anotherAccount.address);
      expect(order.orderType).to.equal(BigInt(0));
      expect(order.price).to.equal(limitPrice);
      expect(order.quantity).to.equal(quantity - sellorder.quantity);
      expect(order.isFilled).to.equal(false);
      expect(order.baseToken).to.equal(baseTokenAddr);
      expect(order.quoteToken).to.equal(quoteTokenAddr);
    });
  });

  describe.only("placing sellorders after buyorder", function () {
    let limitPrice = BigInt(100 * DECIMAL);
    let quantity = BigInt(10 * DECIMAL);

    let orderbookAddr;
    let orderbook;

    this.beforeEach(async function () {
      const tx = await orderbookFactory.createOrderbook(
        baseTokenAddr,
        quoteTokenAddr
      );
      const result = await tx.wait();
      orderbookAddr = result.logs[0].args["orderbookAddr"];
      let Contract = await ethers.getContractFactory("Orderbook");
      orderbook = Contract.attach(orderbookAddr);
      await addFunds();

      await orderbookFactory.placeBuyOrder(
        limitPrice,
        quantity,
        baseTokenAddr,
        quoteTokenAddr
      );
    });

    it("should fill the order instantly", async function () {
      await orderbookFactory
        .connect(anotherAccount)
        .placeSellOrder(limitPrice, quantity, baseTokenAddr, quoteTokenAddr);

      const buyorders = await orderbook.getBuyorders();
      const sellOrders = await orderbook.getSellorders();

      let quoteToken = (limitPrice * quantity) / BigInt(DECIMAL);

      expect(buyorders.length).to.equal(0);
      expect(sellOrders.length).to.equal(0);

      //balance
      expect(await orderbookFactory._balanceOf(baseTokenAddr)).to.equal(
        BigInt(INITIAL_BAL) + quantity
      );

      expect(await orderbookFactory._balanceOf(quoteTokenAddr)).to.equal(
        BigInt(INITIAL_BAL) - quoteToken
      );

      expect(
        await orderbookFactory.connect(anotherAccount)._balanceOf(baseTokenAddr)
      ).to.equal(BigInt(INITIAL_BAL) - quantity);

      expect(
        await orderbookFactory
          .connect(anotherAccount)
          ._balanceOf(quoteTokenAddr)
      ).to.equal(BigInt(INITIAL_BAL) + quoteToken);
    });
  });
});
