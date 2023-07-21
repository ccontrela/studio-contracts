import { resolve } from "path";
import { readFile } from "fs/promises";

import { Row, writeToPath } from "@fast-csv/format";
import createKeccakHash from "keccak";

async function readJsonFile(path: string) {
  const file = await readFile(path, "utf8");
  return JSON.parse(file);
}

async function writeCSVFile(path: string, data: Row[]) {
  const filePath = resolve(__dirname, "errorCodes.csv");

  writeToPath(filePath, data, { headers: true })
    .on("error", (err) => console.error(err))
    .on("finish", async () => {
      console.log("File Contents:");
      console.log((await readFile(filePath)).toString());
    });
}

async function main(path: string) {
  console.log(`Artifact: ${path}`);
  const artifact = await readJsonFile(path);

  if (!artifact.abi) {
    return console.log(`Error: ${path} is an invalid artifact`);
  }

  let errorCodes = [];

  for (let value of artifact.abi) {
    if (value.type === "error") {
      let name = value.name;
      name += "(";
      let length = value.inputs?.length;
      if (length && length > 0) {
        for (let i = 0; i < length - 1; i++) {
          name += value.inputs[i].type + ",";
        }
        name += value.inputs[length - 1].type;
      }
      name += ")";
      const code =
        "0x" +
        createKeccakHash("keccak256").update(name).digest("hex").slice(0, 8);
      errorCodes.push({
        code: code,
        name: name,
      });
    }
  }

  await writeCSVFile("errorCodes.csv", errorCodes);
}

main(process.argv[2])
  .then()
  .catch((e) => console.log(e));
