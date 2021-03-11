import { IBlock } from "../src/core/Block/Block.type";

const INITIAL_DIFFICULTY = 3;

export const MINE_RATE = 1000; // 1s
export const GENESIS_BLOCK: IBlock<[]> = {
  timestamp: 1,
  lastHash: "------",
  hash: "1",
  difficulty: INITIAL_DIFFICULTY,
  nonce: 0,
  data: [],
};
