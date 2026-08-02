import { Router } from "express";
import { initializeDataSource } from "../services/data-source.js";

export const initRouter = Router();

initRouter.post("/", async (_req, res, next) => {
  try {
    res.json(await initializeDataSource());
  } catch (error) {
    next(error);
  }
});
