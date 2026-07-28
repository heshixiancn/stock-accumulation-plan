import fs from "node:fs";
import path from "node:path";
import { envFilePath, getEnv, getSetupStatus } from "../config/env.js";
import { isDailyEmailReportConfigured, sendDailyEmailReport } from "./daily-email-report-service.js";

interface EmailReportState {
  lastRunDate?: string;
  lastRunAt?: string;
  lastStatus?: "success" | "failed";
  lastMessage?: string;
}

let reportRunning = false;
let schedulerStarted = false;
let lastUnconfiguredLogDate = "";

const parseScheduleMinutes = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};

const getStateFilePath = () => {
  const env = getEnv();
  return env.DAILY_EMAIL_REPORT_STATE_FILE || path.resolve(path.dirname(envFilePath), "daily-email-report-state.json");
};

const readState = (): EmailReportState => {
  const filePath = getStateFilePath();
  if (!fs.existsSync(filePath)) return {};

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as EmailReportState;
  } catch {
    return {};
  }
};

const writeState = (state: EmailReportState) => {
  const filePath = getStateFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`);
};

const getZonedNow = (timeZone: string, now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
};

const runDailyEmailReport = async (dateKey: string) => {
  const setupStatus = getSetupStatus();
  if (!setupStatus.configured || !isDailyEmailReportConfigured()) {
    if (lastUnconfiguredLogDate !== dateKey) {
      console.log("[daily-email-report] skipped: data source or email is not configured.");
      lastUnconfiguredLogDate = dateKey;
    }
    return;
  }

  if (reportRunning) return;
  reportRunning = true;
  const startedAt = new Date().toISOString();

  try {
    await sendDailyEmailReport(dateKey);
    writeState({
      lastRunDate: dateKey,
      lastRunAt: startedAt,
      lastStatus: "success",
      lastMessage: "sent",
    });
    console.log("[daily-email-report] sent.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown daily email report error";
    writeState({
      lastRunDate: dateKey,
      lastRunAt: startedAt,
      lastStatus: "failed",
      lastMessage: message,
    });
    console.error(`[daily-email-report] failed: ${message}`);
  } finally {
    reportRunning = false;
  }
};

const checkDailyEmailReport = async () => {
  const env = getEnv();
  if (!env.DAILY_EMAIL_REPORT_ENABLED) return;

  let now: ReturnType<typeof getZonedNow>;
  try {
    now = getZonedNow(env.DAILY_EMAIL_REPORT_TIMEZONE);
  } catch {
    console.error(`[daily-email-report] invalid timezone: ${env.DAILY_EMAIL_REPORT_TIMEZONE}`);
    return;
  }

  if (now.minutes < parseScheduleMinutes(env.DAILY_EMAIL_REPORT_TIME)) return;

  const state = readState();
  if (state.lastRunDate === now.dateKey) return;

  await runDailyEmailReport(now.dateKey);
};

export const startDailyEmailReportScheduler = () => {
  const env = getEnv();
  if (schedulerStarted) return;

  schedulerStarted = true;
  console.log(
    `[daily-email-report] scheduler started: daily at ${env.DAILY_EMAIL_REPORT_TIME} ${env.DAILY_EMAIL_REPORT_TIMEZONE}.`,
  );

  setTimeout(() => {
    void checkDailyEmailReport();
  }, 8_000);
  setInterval(() => {
    void checkDailyEmailReport();
  }, 60_000);
};
