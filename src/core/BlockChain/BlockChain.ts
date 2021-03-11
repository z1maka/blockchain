import Block from "../Block/Block";
import toHash from "../../utils/hash/hash";
import { IBlock } from "../Block/Block.type";
import Transaction from "../Transaction/Transaction";
import { MINING_REWARD, REWARD_INPUT } from "../../../config/transaction";
import Wallet from "../Wallet/Wallet";

type CallBack = () => void;

export default class BlockChain {
  chain: IBlock<any>[] = [Block.genesis];

  addBlock = (data: any): void => {
    const lastBlock = this.chain[this.chain.length - 1];
    const newBlock = Block.mined_block(lastBlock, data);

    this.chain.push(newBlock);
  };

  replaceChain = (
    chain: IBlock<any>[],
    validateTransaction?: boolean,
    onSuccess?: CallBack
  ) => {
    if (chain.length <= this.chain.length) {
      console.error("[Chain must be longer]");
      return;
    }
    if (!BlockChain.isValidChain(chain)) {
      console.error("[Chain must be valid]");
      return;
    }

    if (validateTransaction && !this.validTransactionData({ chain })) {
      console.error("[The incoming chain has invalid transactions data]");
      return;
    }

    if (onSuccess) onSuccess();
    console.log("[Chain is replaced with]:", chain);
    this.chain = chain;
  };

  validTransactionData = ({ chain }: { chain: Block[] }) => {
    for (let i = 1; i < chain.length; i++) {
      const block = chain[i];
      const transactionSet = new Set();
      let rewardTransactionCount = 0;

      for (let transaction of block.data) {
        const _transaction = transaction as Transaction;

        if (_transaction.input.address === REWARD_INPUT.address) {
          rewardTransactionCount++;

          if (rewardTransactionCount > 1) {
            console.error("Miner rewards exceed limit");
            return false;
          }

          if (Object.values(_transaction.outputMap)[0] !== MINING_REWARD) {
            console.error("Mining reward is invalid");
            return false;
          }
        } else {
          if (!Transaction.validTransaction(_transaction)) {
            console.error("Invalid transaction");
            return false;
          }

          const trueBalance = Wallet.calculateBalance({
            chain: this.chain,
            address: _transaction.input.address,
          });

          if (_transaction.input.amount !== trueBalance) {
            console.error("Invalid input amount");
            return false;
          }

          if (transactionSet.has(_transaction)) {
            console.error("An identical transaction is already exist");
            return false;
          } else {
            transactionSet.add(_transaction);
          }
        }
      }
    }

    return true;
  };

  static isValidChain = (chain: IBlock<any>[]): boolean => {
    if (JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis))
      return false;

    for (let i = 1; i < chain.length; i++) {
      const { lastHash, timestamp, nonce, difficulty, hash, data } = chain[i];
      const prevBlockHash = chain[i - 1].hash;
      const lastDifficulty = chain[i - 1].difficulty;

      if (prevBlockHash !== lastHash) return false;

      const validatedHash = toHash(
        timestamp,
        lastHash,
        data,
        difficulty,
        nonce
      );

      if (hash !== validatedHash) return false;

      if (Math.abs(lastDifficulty - difficulty) > 1) return false;
    }

    return true;
  };
}
