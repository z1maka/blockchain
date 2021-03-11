import TransactionPool from "./Transaction-pool";
import BlockChain from "../BlockChain/BlockChain";
import Wallet from "../Wallet/Wallet";
import PubSub from "../../network/pubsub";
import Transaction from "./Transaction";

interface TransactionMinerOption {
  transactionPool: TransactionPool;
  blockchain: BlockChain;
  wallet: Wallet;
  pubSub: PubSub;
}

export default class TransactionMiner {
  blockchain: BlockChain;
  transactionPool: TransactionPool;
  wallet: Wallet;
  pubSub: PubSub;

  constructor(config: TransactionMinerOption) {
    this.blockchain = config.blockchain;
    this.transactionPool = config.transactionPool;
    this.wallet = config.wallet;
    this.pubSub = config.pubSub;
  }

  mineTransactions = () => {
    // get the transaction pool is valid transaction
    const validTransaction = this.transactionPool.validTransactions();
    // generate miner's reward
    validTransaction.push(
      Transaction.rewardTransaction({ minerWallet: this.wallet })
    );
    // add a block consisting of these transaction to blockchain
    this.blockchain.addBlock(validTransaction);
    // broadcast the updated blockchain
    this.pubSub.broadcastChain();
    // clear the pool
    this.transactionPool.clear();
  };
}
