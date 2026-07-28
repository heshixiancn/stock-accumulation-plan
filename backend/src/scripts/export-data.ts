import fs from "node:fs";
import path from "node:path";
import { exportPortableData } from "./data-portability.js";

const source = process.env.EXPORT_SOURCE === "mysql" ? "mysql" : "notion";
const outputPath =
  process.env.EXPORT_FILE ??
  path.resolve(process.cwd(), `backups/data-${source}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);

const data = await exportPortableData(source);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`);

console.log(outputPath);

