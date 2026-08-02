import fs from "node:fs";
import { importPortableData, type PortableData } from "./data-portability.js";

const inputPath = process.env.IMPORT_FILE;
if (!inputPath) {
  throw new Error("IMPORT_FILE is required.");
}

const target = process.env.IMPORT_TARGET === "notion" ? "notion" : "mysql";
const data = JSON.parse(fs.readFileSync(inputPath, "utf8")) as PortableData;
const result = await importPortableData(target, data);

console.log(JSON.stringify({ target, imported: result }, null, 2));

