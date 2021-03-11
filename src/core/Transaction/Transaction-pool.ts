import Transaction from "./Transaction";
import Block from "../Block/Block";

interface ITransactionMap {
  [key: string]: Transaction;
}

export default class TransactionPool {
  transactionMap: ITransactionMap;

  constructor() {
    this.transactionMap = {};
  }

  existingTransaction = ({
    inputAddress,
  }: {
    inputAddress: string;
  }): Transaction | undefined => {
    const transactions = Object.values(this.transactionMap);
    return transactions.find((t) => t.input.address === inputAddress);
  };

  setMap = (map: ITransactionMap) => {
    this.transactionMap = map;
  };

  setTransaction = (transaction: Transaction) => {
    this.transactionMap[transaction.id] = transaction;
  };

  validTransactions = () => {
    return Object.values(this.transactionMap).filter((transaction) =>
      Transaction.validTransaction(transaction)
    );
  };

  clear = () => {
    this.transactionMap = {};
  };

  clearBlockchainTransaction = ({ chain }: { chain: Block[] }) => {
    for (let i = 1; i < chain.length; i++) {
      const block = chain[i];

      for (const transaction of block.data) {
        if (this.transactionMap[(transaction as Transaction).id]) {
          delete this.transactionMap[(transaction as Transaction).id];
        }
      }
    }
  };
}
