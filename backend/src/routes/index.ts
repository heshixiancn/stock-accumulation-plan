import { Router } from "express";
import { dashboardRouter } from "./dashboard.js";
import { dividendsRouter } from "./dividends.js";
import { initRouter } from "./init.js";
import { setupRouter } from "./setup.js";
import { stocksRouter } from "./stocks.js";

export const apiRouter = Router();

apiRouter.use("/setup", setupRouter);
apiRouter.use("/init", initRouter);
apiRouter.use("/stocks", stocksRouter);
apiRouter.use("/dividends", dividendsRouter);
apiRouter.use("/dashboard", dashboardRouter);
