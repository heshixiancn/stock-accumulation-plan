import { Router } from "express";
import { getDashboardSummary } from "../services/dashboard-service.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (_req, res, next) => {
  try {
    const summary = await getDashboardSummary();
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

