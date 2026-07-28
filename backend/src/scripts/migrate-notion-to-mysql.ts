import fs from "node:fs";
import path from "node:path";
import { exportPortableData, importPortableData } from "./data-portability.js";

const snapshotPath =
  process.env.MIGRATION_SNAPSHOT_FILE ??
  path.resolve(process.cwd(), `backups/notion-to-mysql-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);

const data = await exportPortableData("notion");
fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
fs.writeFileSync(snapshotPath, `${JSON.stringify(data, null, 2)}\n`);

const result = await importPortableData("mysql", data);
console.log(JSON.stringify({ snapshotPath, imported: result }, null, 2));

