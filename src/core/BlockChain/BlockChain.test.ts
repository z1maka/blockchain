import Block from "../Block/Block";
import BlockChain from "./BlockChain";
import toHash from "../../utils/hash/hash";
import Wallet from "../Wallet/Wallet";
import Transaction from "../Transaction/Transaction";

describe("[BLOCKCHAIN]", () => {
  let blockchain: BlockChain;
  let newChain: BlockChain;
  let originalChain: any[];

  beforeEach(() => {
    blockchain = new BlockChain();
    newChain = new BlockChain();

    originalChain = blockchain.chain;
  });

  it("should contain a `chain` Array instance", function () {
    expect(blockchain.chain instanceof Array).toBeTruthy();
  });

  it("should start with genesis block", function () {
    expect(blockchain.chain[0]).toEqual(Block.genesis);
  });

  it("should add a new block to the chain", function () {
    const newData = "newData";
    blockchain.addBlock(newData);
    expect(blockchain.chain[blockchain.chain.length - 1].data).toEqual(newData);
  });

  describe("isValidChain", () => {
    beforeEach(() => {
      blockchain.addBlock("FakeData1");
      blockchain.addBlock("FakeData2");
      blockchain.addBlock("FakeData3");
    });

    describe("when chain does not start with genesis black", () => {
      it("should return false", function () {
        blockchain.chain[0] = { data: "fake-genesis" } as any;

        expect(BlockChain.isValidChain(blockchain.chain)).toBeFalsy();
      });
    });

    describe("when chain starts with the genesis block and has multiple blocks", () => {
      describe("and a lastHash reference was changed", () => {
        it("should return false", function () {
          blockchain.chain[2].lastHash = "broken-lastHash";

          expect(BlockChain.isValidChain(blockchain.chain)).toBeFalsy();
        });
      });

      describe("and chain contains a block with invalid fields", () => {
        it("should return false", function () {
          blockchain.chain[2].data = "changed data";

          expect(BlockChain.isValidChain(blockchain.chain)).toBeFalsy();
        });
      });

      describe("and chain does not contain any invalid blocks", () => {
        it("should return true", function () {
          expect(BlockChain.isValidChain(blockchain.chain)).toBeTruthy();
        });
      });

      describe("and the chain contains block with the jumps difficulty", () => {
        it("should return false", function () {
          const lastBlock = blockchain.chain[blockchain.chain.length - 1];
          const lastHash = lastBlock.hash;
          const timestamp = Date.now();
          const nonce = 0;
          const data: any[] = [];
          const difficulty = lastBlock.difficulty - 3;

          const hash = toHash(timestamp, lastHash, difficulty, nonce, data);
          const badBlock = new Block({
            timestamp,
            hash,
            lastHash,
            difficulty,
            nonce,
            data,
          });

          blockchain.chain.push(badBlock);

          expect(BlockChain.isValidChain(blockchain.chain)).toBe(false);
        });
      });
    });
  });

  describe("replaceChain", () => {
    let errorMock: () => void;
    let logMock: () => void;

    beforeEach(() => {
      errorMock = jest.fn();
      logMock = jest.fn();

      global.console.error = errorMock;
      global.console.log = logMock;
    });

    describe("when new chain is not longer", () => {
      beforeEach(() => {
        newChain.chain[0] = { new: "chain" } as any;

        blockchain.replaceChain(newChain.chain);
      });

      it("should not replace the chain", function () {
        expect(blockchain.chain).toEqual(originalChain);
      });

      it("logs and error", function () {
        expect(errorMock).toHaveBeenCalled();
      });
    });

    describe("when the chain is longer", () => {
      beforeEach(() => {
        newChain.addBlock("FakeData1");
        newChain.addBlock("FakeData2");
        newChain.addBlock("FakeData3");
      });

      describe("and chain is invalid", () => {
        beforeEach(() => {
          newChain.chain[2].hash = "fake-hash";

          blockchain.replaceChain(newChain.chain);
        });

        it("should not replace the chain", function () {
          expect(blockchain.chain).toEqual(originalChain);
        });

        it("logs and error", function () {
          expect(errorMock).toHaveBeenCalled();
        });
      });

      describe("and chain is valid", () => {
        beforeEach(() => {
          blockchain.replaceChain(newChain.chain);
        });

        it("should replace the chain", function () {
          expect(blockchain.chain).toEqual(newChain.chain);
        });

        it("logs about the chain replacement ", function () {
          expect(logMock).toHaveBeenCalled();
        });
      });
    });

    describe("validate transaction flag is true", () => {
      it("should call valid transaction data", function () {
        const validTransactionDataMock = jest.fn();
        blockchain.validTransactionData = validTransactionDataMock;

        newChain.addBlock("fake data");

        blockchain.replaceChain(newChain.chain, true);

        expect(validTransactionDataMock).toHaveBeenCalled();
      });
    });
  });

  describe("validTransactionData", () => {
    let transaction: Transaction,
      rewardTransaction: Transaction,
      wallet: Wallet;

    beforeEach(() => {
      wallet = new Wallet();
      transaction = wallet.createTransaction({
        recipient: "foo-address",
        amount: 60,
      });
      rewardTransaction = Transaction.rewardTransaction({
        minerWallet: wallet,
      });
    });

    describe("transaction data is valid", () => {
      it("should return true", function () {
        newChain.addBlock([transaction, rewardTransaction]);

        expect(
          blockchain.validTransactionData({ chain: newChain.chain })
        ).toEqual(true);
      });
    });

    describe("transaction data has multiple rewards", () => {
      it("should return false", function () {
        newChain.addBlock([transaction, rewardTransaction, rewardTransaction]);

        expect(
          blockchain.validTransactionData({ chain: newChain.chain })
        ).toEqual(false);
      });
    });

    describe("transaction data has at least one malformed outputMap", () => {
      describe("and the transaction is not a reward transaction", () => {
        it("should return false", function () {
          transaction.outputMap[wallet.publicKey] = 99999;

          newChain.addBlock([transaction, rewardTransaction]);

          expect(
            blockchain.validTransactionData({ chain: newChain.chain })
          ).toEqual(false);
        });
      });

      describe("transaction is a reward transaction", () => {
        it("should return false", function () {
          rewardTransaction.outputMap[wallet.publicKey] = 9999;
          newChain.addBlock([transaction, rewardTransaction]);

          expect(
            blockchain.validTransactionData({ chain: newChain.chain })
          ).toEqual(false);
        });
      });
    });

    describe("transaction data has at least one malformed input", () => {
      it("should return false", function () {
        wallet.balance = 9000;

        const evilOutputMap = {
          [wallet.publicKey]: 8900,
          fooRecipient: 100,
        };

        const evilTransaction = {
          input: {
            timestamp: Date.now(),
            amount: wallet.balance,
            address: wallet.publicKey,
            signature: wallet.sign(evilOutputMap),
          },
          outputMap: evilOutputMap,
        };

        newChain.addBlock([evilTransaction, rewardTransaction]);

        expect(
          blockchain.validTransactionData({ chain: newChain.chain })
        ).toEqual(false);
      });
    });

    describe("a block contains multiple identical transactions", () => {
      it("should return false", function () {
        newChain.addBlock([transaction, transaction, transaction]);

        expect(
          blockchain.validTransactionData({ chain: newChain.chain })
        ).toEqual(false);
      });
    });
  });
});
