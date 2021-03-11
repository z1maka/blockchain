export interface IBlock<T> {
  timestamp: number;
  lastHash: string;
  hash: string;
  nonce: number;
  difficulty: number;
  data: T;
}
