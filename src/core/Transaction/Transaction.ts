import Wallet from "../Wallet/Wallet";
import { v1 as uuid } from "uuid";
import { verifySignature } from "../../utils/EC";
import toHash from "../../utils/hash/hash";
import { MINING_REWARD, REWARD_INPUT } from "../../../config/transaction";

interface ITransaction {
  senderWallet?: Wallet;
  recipient?: string;
  amount?: number;
  outputMap?: IOutputMap;
  input?: IInput;
}

type CreateInputParams = Required<
  Pick<ITransaction, "senderWallet" | "outputMap">
>;
type CreateOutPutParams = Required<
  Pick<ITransaction, "senderWallet" | "recipient" | "amount">
>;

interface IOutputMap {
  [key: string]: number;
}

interface IInput {
  timestamp: number;
  amount: number;
  address: string;
  signature: string;
}

export default class Transaction {
  id: string;
  outputMap: IOutputMap;
  input: IInput;

  constructor({
    recipient,
    senderWallet,
    amount,
    outputMap,
    input,
  }: ITransaction) {
    this.id = uuid();

    this.outputMap =
      outputMap ||
      this.createOutputMap({
        recipient: recipient!,
        amount: amount!,
        senderWallet: senderWallet!,
      });

    this.input =
      input ||
      this.createInput({
        senderWallet: senderWallet!,
        outputMap: this.outputMap,
      });
  }

  createOutputMap = ({
    recipient,
    senderWallet,
    amount,
  }: CreateOutPutParams): IOutputMap => {
    const outputMap: IOutputMap = {};
    outputMap[recipient] = amount;
    outputMap[senderWallet.publicKey] = senderWallet.balance - amount;

    return outputMap;
  };

  createInput = ({ senderWallet, outputMap }: CreateInputParams): IInput => {
    return {
      timestamp: Date.now(),
      amount: senderWallet.balance,
      address: senderWallet.publicKey,
      signature: senderWallet.sign(outputMap),
    };
  };

  update = ({ senderWallet, amount, recipient }: CreateOutPutParams) => {
    if (amount > this.outputMap[senderWallet.publicKey]) {
      throw new Error("Amount exceeds balance");
    }

    if (!this.outputMap[recipient]) {
      this.outputMap[recipient] = amount;
    } else {
      this.outputMap[recipient] += amount;
    }

    this.outputMap[senderWallet.publicKey] =
      this.outputMap[senderWallet.publicKey] - amount;
    this.input = this.createInput({ senderWallet, outputMap: this.outputMap });
  };

  static validTransaction = (transaction: Transaction) => {
    const {
      input: { address, amount, signature },
      outputMap,
    } = transaction;

    const outputTotalAmount = Object.values(outputMap).reduce(
      (total, amount) => total + amount
    );

    if (amount !== outputTotalAmount) {
      console.error(`Invalid transaction from ${address}`);
      return false;
    }

    if (!verifySignature({ publicKey: address, data: outputMap, signature })) {
      console.error(`Invalid signature from ${address}`);
      return false;
    }

    return true;
  };

  static rewardTransaction = ({
    minerWallet,
  }: {
    minerWallet: Wallet;
  }): Transaction => {
    return new Transaction({
      input: REWARD_INPUT as IInput,
      outputMap: { [minerWallet.publicKey]: MINING_REWARD },
    });
  };
}
