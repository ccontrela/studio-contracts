import keccak256 from "keccak256";

const input = process.argv[2];
const alphaLookup: Record<string, string> = {
  "0": "A",
  "1": "B",
  "2": "C",
  "3": "D",
  "4": "E",
  "5": "F",
  "6": "G",
  "7": "H",
  "8": "I",
  "9": "J",
  a: "K",
  b: "L",
  c: "M",
  d: "N",
  e: "O",
  f: "P",
};

const hash = keccak256(input).toString("hex");
const sig = hash.slice(0, 8).split("");

const output = sig.map((char) => alphaLookup[char]).join("");

console.log(output);
