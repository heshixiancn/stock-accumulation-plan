import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { startDailyEmailReportScheduler } from "./services/daily-email-report-scheduler.js";
import { startAutomaticMarketSyncScheduler } from "./services/market-sync-scheduler.js";
import { HttpError } from "./utils/errors.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");

app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map((item) => item.trim()),
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", apiRouter);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(frontendDistPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Validation failed",
      errors: error.flatten(),
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Unknown server error";
  res.status(500).json({
    message,
  });
});

app.listen(env.PORT, () => {
  console.log(`stock-accumulator-notion server running on port ${env.PORT}`);
  startAutomaticMarketSyncScheduler();
  startDailyEmailReportScheduler();
});
