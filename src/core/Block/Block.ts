import hexToBinary from "hex-to-binary";
import { IBlock } from "./Block.type";
import { GENESIS_BLOCK, MINE_RATE } from "../../../config/genesisBlock";
import toHash from "../../utils/hash/hash";

interface IAdjustDifficultyArg {
  originalBlock: IBlock<any>;
  timestamp: number;
}

export default class Block<T = []> implements IBlock<T> {
  public timestamp: number;
  public lastHash: string;
  public hash: string;
  public nonce: number;
  public difficulty: number;
  public data: T;

  constructor(block: IBlock<T>) {
    this.timestamp = block.timestamp;
    this.lastHash = block.lastHash;
    this.hash = block.hash;
    this.data = block.data;
    this.nonce = block.nonce;
    this.difficulty = block.difficulty;
  }

  static get genesis(): IBlock<[]> {
    return new Block(GENESIS_BLOCK);
  }

  static mined_block = (lastBlock: Block<any>, data: any): IBlock<any> => {
    let hash, timestamp;
    let difficulty = lastBlock.difficulty;
    let nonce = 0;

    const lastHash = lastBlock.hash;

    do {
      nonce++;
      timestamp = Date.now();
      difficulty = Block.adjustDifficulty({
        originalBlock: lastBlock,
        timestamp,
      });
      hash = toHash(timestamp, lastHash, data, nonce, difficulty);
    } while (
      hexToBinary(hash).substring(0, difficulty) !== "0".repeat(difficulty)
    );

    return new Block<any>({
      timestamp,
      lastHash,
      difficulty,
      nonce,
      hash,
      data,
    });
  };

  static adjustDifficulty = ({
    originalBlock,
    timestamp,
  }: IAdjustDifficultyArg): number => {
    const { difficulty } = originalBlock;

    if (difficulty < 1) return 1;

    const difference = timestamp - originalBlock.timestamp;
    return difference > MINE_RATE ? difficulty - 1 : difficulty + 1;
  };
}
