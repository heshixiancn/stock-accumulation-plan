import fs from "node:fs";
import path from "node:path";
import { envFilePath, getEnv, getSetupStatus } from "../config/env.js";
import { syncOtherInvestmentMarketData } from "./other-investment-service.js";
import { syncStocksMarketData } from "./stock-service.js";

interface MarketSyncState {
  lastRunDate?: string;
  lastRunAt?: string;
  lastStatus?: "success" | "failed";
  lastMessage?: string;
}

interface ZonedNow {
  dateKey: string;
  weekday: string;
  minutes: number;
}

let syncRunning = false;
let schedulerStarted = false;
let lastUnconfiguredLogDate = "";

const parseScheduleMinutes = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};

const getStateFilePath = () => {
  const env = getEnv();
  return env.AUTO_MARKET_SYNC_STATE_FILE || path.resolve(path.dirname(envFilePath), "market-sync-state.json");
};

const readState = (): MarketSyncState => {
  const filePath = getStateFilePath();
  if (!fs.existsSync(filePath)) return {};

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as MarketSyncState;
  } catch {
    return {};
  }
};

const writeState = (state: MarketSyncState) => {
  const filePath = getStateFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`);
};

const getZonedNow = (timeZone: string, now = new Date()): ZonedNow => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: get("weekday"),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
};

const isWeekday = (weekday: string) => !["Sat", "Sun"].includes(weekday);

const runAutomaticMarketSync = async (dateKey: string) => {
  const setupStatus = getSetupStatus();
  if (!setupStatus.configured) {
    if (lastUnconfiguredLogDate !== dateKey) {
      console.log("[market-sync] skipped: Notion is not configured.");
      lastUnconfiguredLogDate = dateKey;
    }
    return;
  }

  if (syncRunning) return;
  syncRunning = true;
  const startedAt = new Date().toISOString();

  try {
    console.log("[market-sync] started automatic market data sync.");
    const [stockResult, otherInvestmentResult] = await Promise.all([
      syncStocksMarketData(),
      syncOtherInvestmentMarketData(),
    ]);
    const message = `stocks ${stockResult.successCount}/${stockResult.total}, other investments ${otherInvestmentResult.successCount}/${otherInvestmentResult.total}`;
    const failedItems = [
      ...stockResult.results
        .filter((item) => !item.ok)
        .map((item) => `${item.stockName}(${item.stockCode}): ${item.message ?? "同步失败"}`),
      ...otherInvestmentResult.results
        .filter((item) => !item.ok)
        .map((item) => `${item.assetName}(${item.assetCode}): ${item.message ?? "同步失败"}`),
    ];
    const stateMessage = failedItems.length > 0 ? `${message}; failed: ${failedItems.join("; ")}` : message;
    writeState({
      lastRunDate: dateKey,
      lastRunAt: startedAt,
      lastStatus: stockResult.failedCount + otherInvestmentResult.failedCount > 0 ? "failed" : "success",
      lastMessage: stateMessage,
    });
    console.log(`[market-sync] completed: ${message}.`);
    if (failedItems.length > 0) {
      console.warn(`[market-sync] failed items: ${failedItems.join("; ")}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown automatic market sync error";
    writeState({
      lastRunDate: dateKey,
      lastRunAt: startedAt,
      lastStatus: "failed",
      lastMessage: message,
    });
    console.error(`[market-sync] failed: ${message}`);
  } finally {
    syncRunning = false;
  }
};

const checkAutomaticMarketSync = async () => {
  const env = getEnv();
  if (!env.AUTO_MARKET_SYNC_ENABLED) return;

  let now: ZonedNow;
  try {
    now = getZonedNow(env.AUTO_MARKET_SYNC_TIMEZONE);
  } catch (error) {
    console.error(`[market-sync] invalid timezone: ${env.AUTO_MARKET_SYNC_TIMEZONE}`);
    return;
  }

  if (!isWeekday(now.weekday)) return;
  if (now.minutes < parseScheduleMinutes(env.AUTO_MARKET_SYNC_TIME)) return;

  const state = readState();
  if (state.lastRunDate === now.dateKey) return;

  await runAutomaticMarketSync(now.dateKey);
};

export const startAutomaticMarketSyncScheduler = () => {
  const env = getEnv();
  if (!env.AUTO_MARKET_SYNC_ENABLED || schedulerStarted) return;

  schedulerStarted = true;
  console.log(
    `[market-sync] enabled: weekdays at ${env.AUTO_MARKET_SYNC_TIME} ${env.AUTO_MARKET_SYNC_TIMEZONE}.`,
  );

  setTimeout(() => {
    void checkAutomaticMarketSync();
  }, 5_000);
  setInterval(() => {
    void checkAutomaticMarketSync();
  }, 60_000);
};
