import express from "express";
import request from "request";
import path from "path";
import bodyParser from "body-parser";

import BlockChain from "./core/BlockChain/BlockChain";
import PubSub from "./network/pubsub";
import TransactionPool from "./core/Transaction/Transaction-pool";
import Wallet from "./core/Wallet/Wallet";
import TransactionMiner from "./core/Transaction/Transaction-miner";

const app = express();
const blockchain = new BlockChain();
const transactionPool = new TransactionPool();
const wallet = new Wallet();
const pubSub = new PubSub({ blockchain, transactionPool });
const transactionMiner = new TransactionMiner({
  blockchain,
  transactionPool,
  wallet,
  pubSub,
});

const DEFAULT_PORT = process.env.PORT || 3000;
const ROOT_NODE_ADDRESS = `http://localhost:${DEFAULT_PORT}`;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "client")));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/api/blocks", (req, res) => {
  res.json(blockchain.chain);
});

app.post("/api/transact", (req, res) => {
  const { amount, recipient } = req.body;
  let transaction = transactionPool.existingTransaction({
    inputAddress: wallet.publicKey,
  });

  try {
    if (transaction) {
      transaction.update({ senderWallet: wallet, recipient, amount });
    } else {
      transaction = wallet.createTransaction({
        amount,
        recipient,
        chain: blockchain.chain,
      });
    }
  } catch (err) {
    return res.status(400).json({ type: "error", message: err.message });
  }

  transactionPool.setTransaction(transaction);

  pubSub.broadcastTransaction(transaction);

  res.json({ type: "success", transaction });
});

app.get("/api/transaction-pool-map", (req, res) => {
  res.json(transactionPool.transactionMap);
});

app.post("/api/mine", (req, res) => {
  const { data } = req.body;
  blockchain.addBlock(data);
  pubSub.broadcastChain();
  res.redirect("/api/blocks");
});

app.get("/api/mine-transaction", (req, res) => {
  transactionMiner.mineTransactions();
  res.redirect("/api/blocks");
});

app.get("/api/wallet-info", (req, res) => {
  const address = wallet.publicKey;
  res.json({
    address,
    balance: Wallet.calculateBalance({
      chain: blockchain.chain,
      address,
    }),
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "client", "index.html"));
});

const syncWithRootState = () => {
  request({ url: `${ROOT_NODE_ADDRESS}/api/blocks` }, (err, res, body) => {
    if (!err && res.statusCode === 200) {
      const rootChain = JSON.parse(body);
      console.log("Replace chain on sync with", rootChain);
      blockchain.replaceChain(rootChain);
    }
  });

  request(
    { url: `${ROOT_NODE_ADDRESS}/api/transaction-pool-map` },
    (err, res, body) => {
      if (!err && res.statusCode === 200) {
        const transactionMap = JSON.parse(body);
        console.log("Replacing transaction pool map", transactionMap);

        transactionPool.setMap(transactionMap);
      }
    }
  );
};

let PEER_PORT;
if (process.env.GENERATE_PEER_PORT === "true") {
  PEER_PORT = +DEFAULT_PORT + Math.ceil(Math.random() * 1000);
}

const PORT = PEER_PORT || DEFAULT_PORT;
app.listen(PORT, () => {
  console.log(`Server is listening on [${PORT}] port`);
  if (PORT !== DEFAULT_PORT) {
    syncWithRootState();
  }
});
