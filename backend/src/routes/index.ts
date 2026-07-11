import { Router } from "express";
import { dashboardRouter } from "./dashboard.js";
import { dividendsRouter } from "./dividends.js";
import { initRouter } from "./init.js";
import { otherInvestmentsRouter } from "./other-investments.js";
import { setupRouter } from "./setup.js";
import { stocksRouter } from "./stocks.js";
import { tradesRouter } from "./trades.js";

export const apiRouter = Router();

apiRouter.use("/setup", setupRouter);
apiRouter.use("/init", initRouter);
apiRouter.use("/stocks", stocksRouter);
apiRouter.use("/dividends", dividendsRouter);
apiRouter.use("/trades", tradesRouter);
apiRouter.use("/other-investments", otherInvestmentsRouter);
apiRouter.use("/dashboard", dashboardRouter);
