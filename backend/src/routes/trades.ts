import { Router } from "express";
import { createTrade, deleteTradeById, listTrades, updateTradeById } from "../services/trade-service.js";
import { tradePayloadSchema } from "../services/validation.js";

export const tradesRouter = Router();

tradesRouter.get("/", async (_req, res, next) => {
  try {
    const items = await listTrades();
    res.json(items);
  } catch (error) {
    next(error);
  }
});

tradesRouter.post("/", async (req, res, next) => {
  try {
    const payload = tradePayloadSchema.parse(req.body);
    await createTrade(payload);
    res.status(201).json({ message: "created" });
  } catch (error) {
    next(error);
  }
});

tradesRouter.put("/:id", async (req, res, next) => {
  try {
    const payload = tradePayloadSchema.parse(req.body);
    await updateTradeById(req.params.id, payload);
    res.json({ message: "updated" });
  } catch (error) {
    next(error);
  }
});

tradesRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteTradeById(req.params.id);
    res.json({ message: "deleted" });
  } catch (error) {
    next(error);
  }
});
