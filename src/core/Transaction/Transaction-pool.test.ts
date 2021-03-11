import TransactionPool from "./Transaction-pool";
import Transaction from "./Transaction";
import Wallet from "../Wallet/Wallet";
import BlockChain from "../BlockChain/BlockChain";

describe("[TRANSACTION-POOL]", () => {
  let transactionPool: TransactionPool,
    transaction: Transaction,
    senderWallet: Wallet;

  beforeEach(() => {
    transactionPool = new TransactionPool();
    senderWallet = new Wallet();
    transaction = new Transaction({
      senderWallet,
      recipient: "fake-recipient",
      amount: 50,
    });
  });

  describe("setTransaction", () => {
    it("should add a transaction", function () {
      transactionPool.setTransaction(transaction);

      expect(transactionPool.transactionMap[transaction.id]).toBe(transaction);
    });
  });

  describe("existingTransaction", () => {
    it("should return an existing transaction given an input adress", function () {
      transactionPool.setTransaction(transaction);
      expect(
        transactionPool.existingTransaction({
          inputAddress: senderWallet.publicKey,
        })
      ).toBe(transaction);
    });
  });

  describe("validTransactions", () => {
    let validTransactions: Transaction[], errorMock: () => void;

    beforeEach(() => {
      validTransactions = [];
      errorMock = jest.fn();
      global.console.error = errorMock;

      for (let i = 0; i < 10; i++) {
        transaction = new Transaction({
          senderWallet,
          recipient: "any-recipient",
          amount: 30,
        });

        if (i % 3 === 0) {
          transaction.input.amount = 9999; // do invalid amount
        } else if (i % 3 === 1) {
          transaction.input.signature = new Wallet().sign("foo"); // do invalid signature
        } else {
          validTransactions.push(transaction);
        }

        transactionPool.setTransaction(transaction);
      }
    });

    it("should return valid transaction", function () {
      expect(transactionPool.validTransactions()).toEqual(validTransactions);
    });

    it("should log error if has invalid transaction", function () {
      transactionPool.validTransactions();
      expect(errorMock).toHaveBeenCalled();
    });
  });

  describe("clear transaction function", () => {
    it("should clear the transaction", function () {
      transactionPool.clear();
      expect(transactionPool.transactionMap).toEqual({});
    });
  });

  describe("clearBlockchainTransactions", () => {
    it("should clear the pool of any existing blockchain transactions", function () {
      const blockchain = new BlockChain();
      const expectedTransactionMap: { [key: string]: Transaction } = {};

      for (let i = 0; i <= 6; i++) {
        const transaction = new Wallet().createTransaction({
          recipient: "foo",
          amount: 20,
        });

        transactionPool.setTransaction(transaction);

        if (i % 2 === 0) {
          blockchain.addBlock([transaction]);
        } else {
          expectedTransactionMap[transaction.id] = transaction;
        }
      }

      transactionPool.clearBlockchainTransaction({ chain: blockchain.chain });
    });
  });
});
