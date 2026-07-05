import { Router } from "express";
import {
  createDividend,
  deleteDividendById,
  listDividends,
  updateDividendById,
} from "../services/dividend-service.js";
import { dividendPayloadSchema } from "../services/validation.js";

export const dividendsRouter = Router();

dividendsRouter.get("/", async (_req, res, next) => {
  try {
    const items = await listDividends();
    res.json(items);
  } catch (error) {
    next(error);
  }
});

dividendsRouter.post("/", async (req, res, next) => {
  try {
    const payload = dividendPayloadSchema.parse(req.body);
    await createDividend(payload);
    res.status(201).json({ message: "created" });
  } catch (error) {
    next(error);
  }
});

dividendsRouter.put("/:id", async (req, res, next) => {
  try {
    const payload = dividendPayloadSchema.parse(req.body);
    await updateDividendById(req.params.id, payload);
    res.json({ message: "updated" });
  } catch (error) {
    next(error);
  }
});

dividendsRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteDividendById(req.params.id);
    res.json({ message: "deleted" });
  } catch (error) {
    next(error);
  }
});

