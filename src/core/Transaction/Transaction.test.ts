import Transaction from "./Transaction";
import Wallet from "../Wallet/Wallet";
import { verifySignature } from "../../utils/EC";
import { MINING_REWARD, REWARD_INPUT } from "../../../config/transaction";

describe("[TRANSACTION]", () => {
  let transaction: Transaction,
    senderWallet: Wallet,
    recipient: string,
    amount: number;

  beforeEach(() => {
    senderWallet = new Wallet();
    recipient = "recipient-public-key";
    amount = 50;
    transaction = new Transaction({ senderWallet, recipient, amount });
  });

  it("должен иметь поле `id`", function () {
    expect(transaction).toHaveProperty("id");
  });

  describe("outputMap", () => {
    it("должно быть свойство `outputMap`", function () {
      expect(transaction).toHaveProperty("outputMap");
    });

    it("должен показыватб количество монет отправленных получателю", function () {
      expect(transaction.outputMap[recipient]).toEqual(amount);
    });

    it("должен показывать оставшийся баланс `senderWallet`", function () {
      expect(transaction.outputMap[senderWallet.publicKey]).toEqual(
        senderWallet.balance - amount
      );
    });
  });

  describe("input", () => {
    it("должно быть свойство `input`", function () {
      expect(transaction).toHaveProperty("input");
    });

    it("должен быть `timestamp` в входной транзакции(`input`)", () => {
      expect(transaction.input).toHaveProperty("timestamp");
    });

    it("должен синхронизировать баланс на кошельке отправителе", () => {
      expect(transaction.input.amount).toEqual(senderWallet.balance);
    });

    it("should set `address` to the `senderWallet` publicKey", function () {
      expect(transaction.input.address).toEqual(senderWallet.publicKey);
    });

    it("should sign the input", function () {
      expect(
        verifySignature({
          publicKey: senderWallet.publicKey,
          data: transaction.outputMap,
          signature: transaction.input.signature,
        })
      ).toEqual(true);
    });
  });

  describe("validTransaction", () => {
    let errorMock: () => void;

    beforeEach(() => {
      errorMock = jest.fn();
      global.console.error = errorMock;
    });

    describe("when transaction is valid", function () {
      it("should return true", function () {
        expect(Transaction.validTransaction(transaction)).toEqual(true);
      });
    });

    describe("when transaction is invalid", function () {
      describe("transaction outputMap value is invalid", () => {
        it("should return false and logs an error", function () {
          transaction.outputMap[senderWallet.publicKey] = 99999;
          expect(Transaction.validTransaction(transaction)).toEqual(false);
          expect(errorMock).toHaveBeenCalled();
        });
      });

      describe("transaction input signature is invalid", () => {
        it("should return false and logs an error", function () {
          transaction.input.signature = new Wallet().sign("fake_data");
          expect(Transaction.validTransaction(transaction)).toEqual(false);
          expect(errorMock).toHaveBeenCalled();
        });
      });
    });
  });

  describe("update", () => {
    let originalSignature: string,
      originalSenderOutput: number,
      nextRecipient: string,
      nextAmount: number;

    describe("and the amount is valid", () => {
      beforeEach(() => {
        originalSignature = transaction.input.signature;
        originalSenderOutput = transaction.outputMap[senderWallet.publicKey];
        nextRecipient = "next-recipient";
        nextAmount = 50;

        transaction.update({
          senderWallet,
          recipient: nextRecipient,
          amount: nextAmount,
        });
      });
    });

    describe("and the amount is not valid", () => {
      it("should throw an error", function () {
        expect(() => {
          transaction.update({
            senderWallet,
            recipient: "foo",
            amount: 999999,
          });
        }).toThrow("Amount exceeds balance");
      });
    });

    beforeEach(() => {
      originalSignature = transaction.input.signature;
      originalSenderOutput = transaction.outputMap[senderWallet.publicKey];
      nextRecipient = "next-recipient";
      nextAmount = 50;

      transaction.update({
        senderWallet,
        recipient: nextRecipient,
        amount: nextAmount,
      });
    });

    it("should output the amount to the next recipient", function () {
      expect(transaction.outputMap[nextRecipient]).toEqual(nextAmount);
    });

    it("should subtracts the amount from the original sender output amount", function () {
      expect(transaction.outputMap[senderWallet.publicKey]).toEqual(
        originalSenderOutput - nextAmount
      );
    });

    it("should maintain a total output that matches the input amount", function () {
      const mainAmount = Object.values(transaction.outputMap).reduce(
        (total, amount) => total + amount
      );

      expect(mainAmount).toEqual(transaction.input.amount);
    });

    it("should re-signs the transaction", function () {
      expect(transaction.input.signature).not.toEqual(originalSignature);
    });

    describe("and another update for the same recipient", () => {
      let addedAmount: number;

      beforeEach(() => {
        addedAmount = 80;
        transaction.update({
          senderWallet,
          recipient: nextRecipient,
          amount: addedAmount,
        });
      });

      it("should add to the recipient amount", function () {
        expect(transaction.outputMap[nextRecipient]).toEqual(
          nextAmount + addedAmount
        );
      });

      it("should subtract the amount from the original sender output amount", function () {
        expect(transaction.outputMap[senderWallet.publicKey]).toEqual(
          originalSenderOutput - nextAmount - addedAmount
        );
      });
    });
  });

  describe("rewardTransaction", () => {
    let rewardTransaction: Transaction, minerWallet: Wallet;

    beforeEach(() => {
      minerWallet = new Wallet();
      rewardTransaction = Transaction.rewardTransaction({ minerWallet });
    });

    it("should create a transaction with the reward input", function () {
      expect(rewardTransaction.input).toEqual(REWARD_INPUT);
    });

    it("should create ones transaction for the miner with the `MINING_REWARDS`", function () {
      expect(rewardTransaction.outputMap[minerWallet.publicKey]).toEqual(
        MINING_REWARD
      );
    });
  });
});
