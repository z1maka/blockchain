import hexToBinary from "hex-to-binary";
import Block from "./Block";
import { GENESIS_BLOCK, MINE_RATE } from "../../../config/genesisBlock";
import toHash from "../../utils/hash/hash";

describe("[BLOCK]", () => {
  const timestamp = 2000;
  const lastHash = "lastHash";
  const hash = "hash";
  const data = ["some", "data"];

  // for mining
  const nonce = 1;
  const difficulty = 1;

  const block = new Block<string[]>({
    timestamp,
    lastHash,
    hash,
    data,
    nonce,
    difficulty,
  });

  it("should has timestamp, lastHash, hash, data", () => {
    expect(block.timestamp).toEqual(timestamp);
    expect(block.lastHash).toEqual(lastHash);
    expect(block.hash).toEqual(hash);
    expect(block.data).toEqual(data);
    expect(block.nonce).toEqual(nonce);
    expect(block.difficulty).toEqual(difficulty);
  });

  describe("GENESIS BLOCK", () => {
    const genesisBlock = Block.genesis;

    it("should return BLOCK instance", () => {
      expect(genesisBlock instanceof Block).toBeTruthy();
    });

    it("should return the genesis data", () => {
      expect(genesisBlock).toEqual(GENESIS_BLOCK);
    });
  });

  describe("MINE_BLOCK", () => {
    const lastBlock = Block.genesis;
    const data = "mined.data";

    const minedBlock = Block.mined_block(lastBlock, data);

    it("should return a Block instance", () => {
      expect(minedBlock instanceof Block).toBeTruthy();
    });

    it("should set `lastHash` to be the `hash` of lastBlock", function () {
      expect(minedBlock.lastHash).toEqual(lastBlock.hash);
    });

    it("should set the data", function () {
      expect(minedBlock.data).toEqual(data);
    });

    it("should set a timestamp", function () {
      expect(minedBlock.timestamp).not.toEqual(undefined);
    });

    it("should create an SHA-256 hash based on passed data", function () {
      expect(minedBlock.hash).toEqual(
        toHash(
          minedBlock.timestamp,
          minedBlock.nonce,
          minedBlock.difficulty,
          lastBlock.hash,
          data
        )
      );
    });

    it("should set a `hash` that matches the difficulty criteria", function () {
      expect(
        hexToBinary(minedBlock.hash).substring(0, minedBlock.difficulty)
      ).toEqual("0".repeat(minedBlock.difficulty));
    });

    it("should adjust the difficulty", function () {
      const possibleResults = [
        lastBlock.difficulty + 1,
        lastBlock.difficulty - 1,
      ];
      expect(possibleResults.includes(minedBlock.difficulty)).toBe(true);
    });
  });

  describe("ADJUST DIFFICULTY", () => {
    it("should rise difficulty for quickly mined block", function () {
      expect(
        Block.adjustDifficulty({
          originalBlock: block,
          timestamp: block.timestamp + MINE_RATE - 100,
        })
      ).toEqual(block.difficulty + 1);
    });

    it("should low difficulty for quickly mined block", function () {
      expect(
        Block.adjustDifficulty({
          originalBlock: block,
          timestamp: block.timestamp + MINE_RATE + 100,
        })
      ).toEqual(block.difficulty - 1);
    });

    it("should have a lower limit of 1", function () {
      block.difficulty = -1;

      expect(
        Block.adjustDifficulty({ originalBlock: block, timestamp: Date.now() })
      ).toEqual(1);
    });
  });
});
