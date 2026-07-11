import { Router } from "express";
import {
  createOtherInvestmentRecord,
  deleteOtherInvestmentAssetById,
  deleteOtherInvestmentRecordById,
  getOtherInvestmentOverview,
  syncOtherInvestmentMarketData,
  updateOtherInvestmentAssetById,
  updateOtherInvestmentRecordById,
} from "../services/other-investment-service.js";
import { otherInvestmentAssetPayloadSchema, otherInvestmentPayloadSchema } from "../services/validation.js";

export const otherInvestmentsRouter = Router();

otherInvestmentsRouter.get("/", async (_req, res, next) => {
  try {
    const overview = await getOtherInvestmentOverview();
    res.json(overview);
  } catch (error) {
    next(error);
  }
});

otherInvestmentsRouter.post("/", async (req, res, next) => {
  try {
    const payload = otherInvestmentPayloadSchema.parse(req.body);
    await createOtherInvestmentRecord(payload);
    res.status(201).json({ message: "created" });
  } catch (error) {
    next(error);
  }
});

otherInvestmentsRouter.post("/sync-market", async (req, res, next) => {
  try {
    const assets = Array.isArray(req.body?.assets)
      ? req.body.assets.filter(
          (item: unknown): item is { assetCode: string; assetName: string; market: "A股" | "美股" | "港股"; currency: "CNY" | "USD" | "HKD" } =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as { assetCode?: unknown }).assetCode === "string" &&
            typeof (item as { assetName?: unknown }).assetName === "string" &&
            typeof (item as { market?: unknown }).market === "string" &&
            typeof (item as { currency?: unknown }).currency === "string",
        )
      : undefined;
    const result = await syncOtherInvestmentMarketData(assets);
    res.json({ message: "synced", ...result });
  } catch (error) {
    next(error);
  }
});

otherInvestmentsRouter.put("/assets/:id", async (req, res, next) => {
  try {
    const payload = otherInvestmentAssetPayloadSchema.parse(req.body);
    await updateOtherInvestmentAssetById(req.params.id, payload);
    res.json({ message: "updated" });
  } catch (error) {
    next(error);
  }
});

otherInvestmentsRouter.delete("/assets/:id", async (req, res, next) => {
  try {
    await deleteOtherInvestmentAssetById(req.params.id);
    res.json({ message: "deleted" });
  } catch (error) {
    next(error);
  }
});

otherInvestmentsRouter.put("/:id", async (req, res, next) => {
  try {
    const payload = otherInvestmentPayloadSchema.parse(req.body);
    await updateOtherInvestmentRecordById(req.params.id, payload);
    res.json({ message: "updated" });
  } catch (error) {
    next(error);
  }
});

otherInvestmentsRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteOtherInvestmentRecordById(req.params.id);
    res.json({ message: "deleted" });
  } catch (error) {
    next(error);
  }
});
