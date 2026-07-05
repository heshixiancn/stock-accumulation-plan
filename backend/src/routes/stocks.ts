import { Router } from "express";
import { createStock, deleteStockById, listStocks, updateStockById } from "../services/stock-service.js";
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

stocksRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteStockById(req.params.id);
    res.json({ message: "deleted" });
  } catch (error) {
    next(error);
  }
});

