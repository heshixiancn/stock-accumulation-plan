import { getEnv } from "../config/env.js";
import { ensureDatabases } from "../lib/notion.js";
import { initializeMysqlDatabase } from "../lib/mysql.js";

export const getDataSource = () => getEnv().DATA_SOURCE;

export const initializeDataSource = async () => {
  if (getDataSource() === "mysql") {
    await initializeMysqlDatabase();
    return {
      message: "MySQL 数据库已初始化",
      datasource: "mysql" as const,
    };
  }

  const databases = await ensureDatabases();
  return {
    message: "Notion 数据库已初始化",
    datasource: "notion" as const,
    databases,
  };
};
