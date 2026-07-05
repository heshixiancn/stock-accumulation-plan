import { Router } from "express";
import { ensureDatabases } from "../lib/notion.js";

export const initRouter = Router();

initRouter.post("/", async (_req, res, next) => {
  try {
    const databases = await ensureDatabases();
    res.json({
      message: "Notion 数据库已初始化",
      databases,
    });
  } catch (error) {
    next(error);
  }
});
