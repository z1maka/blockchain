import crypto from "crypto";

const toHash = (...args: any[]) => {
  const hash = crypto.createHash("sha256");
  const hashData = args
    .map((v) => JSON.stringify(v))
    .sort()
    .join(" ");

  hash.update(hashData);
  return hash.digest("hex");
};

export default toHash;
