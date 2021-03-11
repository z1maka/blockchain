import redis, { RedisClient } from "redis";
import BlockChain from "../core/BlockChain/BlockChain";
import TransactionPool from "../core/Transaction/Transaction-pool";
import Transaction from "../core/Transaction/Transaction";

enum CHANNELS {
  BLOCKCHAIN = "BLOCKCHAIN",
  TRANSACTION = "TRANSACTION",
}

const hostConfig = {
  port: 6379,
  host: "localhost",
};

interface IPubSubConfig {
  blockchain: BlockChain;
  transactionPool: TransactionPool;
}

export default class PubSub {
  public blockchain: BlockChain;
  public transactionPool: TransactionPool;

  public publisher: RedisClient;
  public subscriber: RedisClient;

  constructor(config: IPubSubConfig) {
    this.blockchain = config.blockchain;
    this.transactionPool = config.transactionPool;

    this.publisher = redis.createClient(hostConfig);
    this.subscriber = redis.createClient(hostConfig);

    this.subscribeToChannels();

    this.subscriber.on("message", this.handleMessage);
  }

  subscribeToChannels = () => {
    Object.values(CHANNELS).forEach((channel) => {
      this.subscriber.subscribe(channel);
    });
  };

  publish = (channel: CHANNELS, message: string) => {
    this.subscriber.unsubscribe(channel, () => {
      this.publisher.publish(channel, message, () => {
        this.subscriber.subscribe(channel);
      });
    });
  };

  broadcastChain = () => {
    this.publish(CHANNELS.BLOCKCHAIN, JSON.stringify(this.blockchain.chain));
  };

  broadcastTransaction = (transaction: Transaction) => {
    this.publish(CHANNELS.TRANSACTION, JSON.stringify(transaction));
  };

  handleMessage = (channel: CHANNELS, message: any) => {
    console.log(`[MESSAGE]: Channel:${channel} Message:${message}.`);

    const _message = JSON.parse(message);

    switch (channel) {
      case CHANNELS.BLOCKCHAIN:
        this.blockchain.replaceChain(_message, true, () => {
          this.transactionPool.clearBlockchainTransaction({
            chain: _message,
          });
        });
        break;
      case CHANNELS.TRANSACTION:
        this.transactionPool.setTransaction(_message);
        break;
      default:
        return;
    }
  };
}
