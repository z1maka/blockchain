import Wallet from "./Wallet";
import { verifySignature } from "../../utils/EC";
import Transaction from "../Transaction/Transaction";
import BlockChain from "../BlockChain/BlockChain";
import { STARTING_BALANCE } from "../../../config/wallet";

describe("[WALLET]", () => {
  let wallet: Wallet;

  beforeEach(() => {
    wallet = new Wallet();
  });

  it("should has a `balance`", function () {
    expect(wallet).toHaveProperty("balance");
  });

  it("should has a `publicKey`", function () {
    expect(wallet).toHaveProperty("publicKey");
  });

  describe("signing data", () => {
    const data = "fake_data";

    it("should verify a signature", function () {
      expect(
        verifySignature({
          publicKey: wallet.publicKey,
          signature: wallet.sign(data),
          data,
        })
      ).toBe(true);
    });

    it("should not verify an invalid signature", function () {
      expect(
        verifySignature({
          publicKey: wallet.publicKey,
          signature: new Wallet().sign(data),
          data,
        })
      ).toBe(false);
    });
  });

  describe("createTransaction", () => {
    describe("and the amount exceeds the balance", () => {
      it("should not send the transaction and throws an error", function () {
        expect(() =>
          wallet.createTransaction({ amount: 99999, recipient: "fake-pub-key" })
        ).toThrow("Amount exceeds balance");
      });
    });

    describe("and the amount is valid", () => {
      let transaction: Transaction, amount: number, recipient: string;

      beforeEach(() => {
        amount = 50;
        recipient = "fake_recipient";
        transaction = wallet.createTransaction({ amount, recipient });
      });

      it("should create an instance of `Transaction`", function () {
        expect(transaction instanceof Transaction).toEqual(true);
      });

      it("should match the transaction input with the wallet", function () {
        expect(transaction.input.address).toEqual(wallet.publicKey);
      });

      it("should output the amount the recipient", function () {
        expect(transaction.outputMap[recipient]).toEqual(amount);
      });
    });

    describe("and the chain is passed", () => {
      it("should call `Wallet.calculateBalance`", function () {
        const calculateBalance = jest.fn();
        const originalCalculateBalance = Wallet.calculateBalance;
        Wallet.calculateBalance = calculateBalance;

        wallet.createTransaction({
          recipient: "foo",
          amount: 10,
          chain: new BlockChain().chain,
        });

        expect(calculateBalance).toHaveBeenCalled();

        Wallet.calculateBalance = originalCalculateBalance;
      });
    });
  });

  describe("calculateBalance", () => {
    let blockchain: BlockChain;

    beforeEach(() => {
      blockchain = new BlockChain();
    });

    describe("and there are no outputs for the wallet", () => {
      it("should return `STARTING_BALANCE`", function () {
        expect(
          Wallet.calculateBalance({
            chain: blockchain.chain,
            address: wallet.publicKey,
          })
        ).toEqual(STARTING_BALANCE);
      });
    });

    describe("and there are outputs for the wallet", () => {
      let transaction1: Transaction, transaction2: Transaction;

      beforeEach(() => {
        transaction1 = new Wallet().createTransaction({
          recipient: wallet.publicKey,
          amount: 50,
        });
        transaction2 = new Wallet().createTransaction({
          recipient: wallet.publicKey,
          amount: 60,
        });

        blockchain.addBlock([transaction1, transaction2]);
      });

      it("should add the sum all outputs to the wallet balance", function () {
        expect(
          Wallet.calculateBalance({
            chain: blockchain.chain,
            address: wallet.publicKey,
          })
        ).toEqual(
          STARTING_BALANCE +
            transaction1.outputMap[wallet.publicKey] +
            transaction2.outputMap[wallet.publicKey]
        );
      });

      describe("and wallet has made a transaction", () => {
        let recentTransaction: Transaction;

        beforeEach(() => {
          recentTransaction = wallet.createTransaction({
            recipient: "foo",
            amount: 30,
          });

          blockchain.addBlock([recentTransaction]);
        });

        it("should return the output of recent transaction", function () {
          expect(
            Wallet.calculateBalance({
              chain: blockchain.chain,
              address: wallet.publicKey,
            })
          ).toEqual(recentTransaction.outputMap[wallet.publicKey]);
        });

        describe("and there are outputs next to and after the recent transaction", () => {
          let sameBlockTransaction: Transaction,
            nextBlockTransaction: Transaction;

          beforeEach(() => {
            recentTransaction = wallet.createTransaction({
              recipient: "next-foo-address",
              amount: 60,
            });

            sameBlockTransaction = Transaction.rewardTransaction({
              minerWallet: wallet,
            });

            blockchain.addBlock([recentTransaction, sameBlockTransaction]);

            nextBlockTransaction = new Wallet().createTransaction({
              amount: 40,
              recipient: wallet.publicKey,
            });

            blockchain.addBlock([nextBlockTransaction]);
          });

          it("should include the output amounts in the returned balance", function () {
            expect(
              Wallet.calculateBalance({
                chain: blockchain.chain,
                address: wallet.publicKey,
              })
            ).toEqual(
              recentTransaction.outputMap[wallet.publicKey] +
                sameBlockTransaction.outputMap[wallet.publicKey] +
                nextBlockTransaction.outputMap[wallet.publicKey]
            );
          });
        });
      });
    });
  });
});
