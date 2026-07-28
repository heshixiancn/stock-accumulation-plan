import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { getEnv } from "../config/env.js";

let pool: Pool | null = null;

export const getMysqlPool = () => {
  if (!pool) {
    const env = getEnv();
    pool = mysql.createPool({
      host: env.MYSQL_HOST,
      port: env.MYSQL_PORT,
      database: env.MYSQL_DATABASE,
      user: env.MYSQL_USER,
      password: env.MYSQL_PASSWORD,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
      timezone: "+08:00",
    });
  }

  return pool;
};

export const newId = () => randomUUID();

export const execute = async (sql: string, values: Record<string, unknown> = {}) => {
  const [result] = await getMysqlPool().execute<ResultSetHeader>(sql, values as never);
  return result;
};

export const queryRows = async <T extends RowDataPacket>(sql: string, values: Record<string, unknown> = {}) => {
  const [rows] = await getMysqlPool().execute<T[]>(sql, values as never);
  return rows;
};

export const initializeMysqlDatabase = async () => {
  const schemaPath = path.resolve(process.cwd(), "../ops/mysql/01-schema.sql");
  const fallbackSchemaPath = path.resolve(process.cwd(), "ops/mysql/01-schema.sql");
  const ddl = fs.readFileSync(fs.existsSync(schemaPath) ? schemaPath : fallbackSchemaPath, "utf8");

  for (const statement of ddl.split(/;\s*(?:\r?\n|$)/).map((item) => item.trim()).filter(Boolean)) {
    await execute(statement);
  }
};
