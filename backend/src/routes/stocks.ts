import { Router } from "express";
import {
  createStock,
  deleteStockById,
  listStocks,
  syncStockMarketDataById,
  syncStocksMarketData,
  updateStockById,
} from "../services/stock-service.js";
import { stockPayloadSchema } from "../services/validation.js";

export const stocksRouter = Router();

stocksRouter.get("/", async (_req, res, next) => {
  try {
    const items = await listStocks();
    res.json(items);
  } catch (error) {
    next(error);
  }
});

stocksRouter.post("/", async (req, res, next) => {
  try {
    const payload = stockPayloadSchema.parse(req.body);
    await createStock(payload);
    res.status(201).json({ message: "created" });
  } catch (error) {
    next(error);
  }
});

stocksRouter.put("/:id", async (req, res, next) => {
  try {
    const payload = stockPayloadSchema.parse(req.body);
    await updateStockById(req.params.id, payload);
    res.json({ message: "updated" });
  } catch (error) {
    next(error);
  }
});

stocksRouter.post("/sync-market", async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids.filter((item: unknown): item is string => typeof item === "string")
      : undefined;
    const result = await syncStocksMarketData(ids);
    res.json({ message: "synced", ...result });
  } catch (error) {
    next(error);
  }
});

stocksRouter.post("/:id/sync-market", async (req, res, next) => {
  try {
    const quote = await syncStockMarketDataById(req.params.id);
    res.json({ message: "synced", quote });
  } catch (error) {
    next(error);
  }
});

stocksRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteStockById(req.params.id);
    res.json({ message: "deleted" });
  } catch (error) {
    next(error);
  }
});
