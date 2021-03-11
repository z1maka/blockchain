import Transaction from "../Transaction/Transaction";
import { STARTING_BALANCE } from "../../../config/wallet";
import toHash from "../../utils/hash/hash";
import { ec } from "../../utils/EC";
import Block from "../Block/Block";

interface ICreateTransaction {
  amount: number;
  recipient: string;
  chain?: Block[];
}

export default class Wallet {
  public balance: number;
  public publicKey: string;
  private keyPare: any;

  constructor() {
    this.balance = STARTING_BALANCE;

    this.keyPare = ec.genKeyPair();
    this.publicKey = this.keyPare.getPublic().encode("hex");
  }

  createTransaction = ({
    amount,
    recipient,
    chain,
  }: ICreateTransaction): Transaction => {
    if (chain) {
      this.balance = Wallet.calculateBalance({
        chain,
        address: this.publicKey,
      });
    }

    if (amount > this.balance) throw new Error("Amount exceeds balance");

    return new Transaction({ senderWallet: this, amount, recipient });
  };

  public sign = (data: any) => {
    const hex = toHash(data);
    return this.keyPare.sign(hex).toDER("hex");
  };

  static calculateBalance = ({
    chain,
    address,
  }: {
    chain: Block[];
    address: string;
  }) => {
    let hasConductedTransaction = false;
    let outputsTotal = 0;

    for (let i = chain.length - 1; i > 0; i--) {
      const block = chain[i];

      for (const transaction of block.data) {
        const _transaction = transaction as Transaction;
        if (_transaction.input.address === address) {
          hasConductedTransaction = true;
        }

        const addressOutput = _transaction.outputMap[address];
        if (addressOutput) outputsTotal += addressOutput;
      }

      if (hasConductedTransaction) {
        break;
      }
    }

    return hasConductedTransaction
      ? outputsTotal
      : STARTING_BALANCE + outputsTotal;
  };
}
