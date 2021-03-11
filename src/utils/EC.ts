import { ec as EC } from "elliptic";
import toHash from "./hash/hash";

export const ec = new EC("secp256k1");

interface Options {
  data: any;
  publicKey: string;
  signature: any;
}
export const verifySignature = ({ data, publicKey, signature }: Options) => {
  const keyFromPublic = ec.keyFromPublic(publicKey, "hex");
  return keyFromPublic.verify(toHash(data), signature);
};
