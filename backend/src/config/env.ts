import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { HttpError } from "../utils/errors.js";

const projectRoot = fs.existsSync(path.resolve(process.cwd(), "backend/package.json"))
  ? process.cwd()
  : path.resolve(process.cwd(), "..");

export const envFilePath = process.env.APP_CONFIG_FILE || path.resolve(projectRoot, ".env");

const applyEnvFile = (filePath: string) => {
  if (!fs.existsSync(filePath)) return;

  const parsed = dotenv.parse(fs.readFileSync(filePath));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = value;
    }
  }
};

applyEnvFile(envFilePath);
applyEnvFile(path.resolve(projectRoot, ".env"));

const booleanEnv = z
  .string()
  .optional()
  .default("true")
  .transform((value) => !["0", "false", "no", "off"].includes(value.trim().toLowerCase()));

const envSchema = z.object({
  DATA_SOURCE: z.enum(["notion", "mysql"]).default("notion"),
  NOTION_TOKEN: z.string().optional().default(""),
  NOTION_PARENT_PAGE_ID: z.string().optional().default(""),
  NOTION_STOCK_DATABASE_ID: z.string().optional().default(""),
  NOTION_DIVIDEND_DATABASE_ID: z.string().optional().default(""),
  NOTION_TRADE_DATABASE_ID: z.string().optional().default(""),
  NOTION_OTHER_INVESTMENT_ASSET_DATABASE_ID: z.string().optional().default(""),
  NOTION_OTHER_INVESTMENT_DATABASE_ID: z.string().optional().default(""),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  APP_CONFIG_FILE: z.string().optional(),
  AUTO_MARKET_SYNC_ENABLED: booleanEnv,
  AUTO_MARKET_SYNC_TIME: z.string().regex(/^\d{2}:\d{2}$/).default("16:10"),
  AUTO_MARKET_SYNC_TIMEZONE: z.string().default("Asia/Shanghai"),
  AUTO_MARKET_SYNC_STATE_FILE: z.string().optional().default(""),
  MYSQL_HOST: z.string().default("127.0.0.1"),
  MYSQL_PORT: z.coerce.number().int().positive().default(3306),
  MYSQL_DATABASE: z.string().default("stock_accumulator"),
  MYSQL_USER: z.string().default("root"),
  MYSQL_PASSWORD: z.string().optional().default(""),
  DAILY_EMAIL_REPORT_ENABLED: booleanEnv.default("false"),
  DAILY_EMAIL_REPORT_TIME: z.string().regex(/^\d{2}:\d{2}$/).default("18:00"),
  DAILY_EMAIL_REPORT_TIMEZONE: z.string().default("Asia/Shanghai"),
  DAILY_EMAIL_REPORT_STATE_FILE: z.string().optional().default(""),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: booleanEnv.default("false"),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASSWORD: z.string().optional().default(""),
  EMAIL_FROM: z.string().optional().default(""),
  EMAIL_TO: z.string().optional().default(""),
});

export type RuntimeEnv = z.infer<typeof envSchema>;

export const getEnv = (): RuntimeEnv => envSchema.parse(process.env);

export const getSetupStatus = () => {
  const env = getEnv();
  if (env.DATA_SOURCE === "mysql") {
    return {
      configured: Boolean(env.MYSQL_HOST && env.MYSQL_DATABASE && env.MYSQL_USER),
      missing: [
        ["MYSQL_HOST", env.MYSQL_HOST],
        ["MYSQL_DATABASE", env.MYSQL_DATABASE],
        ["MYSQL_USER", env.MYSQL_USER],
      ]
        .filter(([, value]) => !value)
        .map(([key]) => key),
      envFilePath,
    };
  }

  const missing = [
    ["NOTION_TOKEN", env.NOTION_TOKEN],
    ["NOTION_PARENT_PAGE_ID", env.NOTION_PARENT_PAGE_ID],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return {
    configured: missing.length === 0,
    missing,
    envFilePath,
  };
};

export const requireNotionConfig = () => {
  const env = getEnv();
  const missing = getSetupStatus().missing;

  if (missing.length > 0) {
    throw new HttpError(409, `Notion is not configured. Missing: ${missing.join(", ")}`);
  }

  return {
    token: env.NOTION_TOKEN,
    parentPageId: env.NOTION_PARENT_PAGE_ID,
    stockDatabaseId: env.NOTION_STOCK_DATABASE_ID,
    dividendDatabaseId: env.NOTION_DIVIDEND_DATABASE_ID,
    tradeDatabaseId: env.NOTION_TRADE_DATABASE_ID,
    otherInvestmentAssetDatabaseId: env.NOTION_OTHER_INVESTMENT_ASSET_DATABASE_ID,
    otherInvestmentDatabaseId: env.NOTION_OTHER_INVESTMENT_DATABASE_ID,
  };
};

const stringifyEnvValue = (value: string) => value.replace(/\r?\n/g, "").trim();

export const saveNotionConfig = (config: {
  notionToken?: string;
  notionParentPageId?: string;
  stockDatabaseId?: string;
  dividendDatabaseId?: string;
  tradeDatabaseId?: string;
  otherInvestmentAssetDatabaseId?: string;
  otherInvestmentDatabaseId?: string;
}) => {
  const updates = {
    ...(config.notionToken !== undefined ? { NOTION_TOKEN: stringifyEnvValue(config.notionToken) } : {}),
    ...(config.notionParentPageId !== undefined
      ? { NOTION_PARENT_PAGE_ID: stringifyEnvValue(config.notionParentPageId) }
      : {}),
    ...(config.stockDatabaseId !== undefined
      ? { NOTION_STOCK_DATABASE_ID: stringifyEnvValue(config.stockDatabaseId) }
      : {}),
    ...(config.dividendDatabaseId !== undefined
      ? { NOTION_DIVIDEND_DATABASE_ID: stringifyEnvValue(config.dividendDatabaseId) }
      : {}),
    ...(config.tradeDatabaseId !== undefined
      ? { NOTION_TRADE_DATABASE_ID: stringifyEnvValue(config.tradeDatabaseId) }
      : {}),
    ...(config.otherInvestmentAssetDatabaseId !== undefined
      ? { NOTION_OTHER_INVESTMENT_ASSET_DATABASE_ID: stringifyEnvValue(config.otherInvestmentAssetDatabaseId) }
      : {}),
    ...(config.otherInvestmentDatabaseId !== undefined
      ? { NOTION_OTHER_INVESTMENT_DATABASE_ID: stringifyEnvValue(config.otherInvestmentDatabaseId) }
      : {}),
  } satisfies Record<string, string>;

  const existing = fs.existsSync(envFilePath) ? fs.readFileSync(envFilePath, "utf8").split(/\r?\n/) : [];
  const seen = new Set<string>();
  const nextLines = existing.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/);
    if (!match) return line;

    const key = match[1] as keyof typeof updates;
    if (!(key in updates)) return line;

    seen.add(key);
    return `${key}=${updates[key]}`;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) {
      nextLines.push(`${key}=${value}`);
    }
  }

  const directory = path.dirname(envFilePath);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(envFilePath, `${nextLines.filter(Boolean).join("\n")}\n`);

  if (updates.NOTION_TOKEN !== undefined) {
    process.env.NOTION_TOKEN = updates.NOTION_TOKEN;
  }
  if (updates.NOTION_PARENT_PAGE_ID !== undefined) {
    process.env.NOTION_PARENT_PAGE_ID = updates.NOTION_PARENT_PAGE_ID;
  }
  if (updates.NOTION_STOCK_DATABASE_ID !== undefined) {
    process.env.NOTION_STOCK_DATABASE_ID = updates.NOTION_STOCK_DATABASE_ID;
  }
  if (updates.NOTION_DIVIDEND_DATABASE_ID !== undefined) {
    process.env.NOTION_DIVIDEND_DATABASE_ID = updates.NOTION_DIVIDEND_DATABASE_ID;
  }
  if (updates.NOTION_TRADE_DATABASE_ID !== undefined) {
    process.env.NOTION_TRADE_DATABASE_ID = updates.NOTION_TRADE_DATABASE_ID;
  }
  if (updates.NOTION_OTHER_INVESTMENT_ASSET_DATABASE_ID !== undefined) {
    process.env.NOTION_OTHER_INVESTMENT_ASSET_DATABASE_ID = updates.NOTION_OTHER_INVESTMENT_ASSET_DATABASE_ID;
  }
  if (updates.NOTION_OTHER_INVESTMENT_DATABASE_ID !== undefined) {
    process.env.NOTION_OTHER_INVESTMENT_DATABASE_ID = updates.NOTION_OTHER_INVESTMENT_DATABASE_ID;
  }
};

export const saveEmailReportConfig = (config: {
  enabled: boolean;
  time: string;
  timezone: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword?: string;
  emailFrom: string;
  emailTo: string;
}) => {
  const updates = {
    DAILY_EMAIL_REPORT_ENABLED: String(config.enabled),
    DAILY_EMAIL_REPORT_TIME: stringifyEnvValue(config.time),
    DAILY_EMAIL_REPORT_TIMEZONE: stringifyEnvValue(config.timezone),
    SMTP_HOST: stringifyEnvValue(config.smtpHost),
    SMTP_PORT: String(config.smtpPort),
    SMTP_SECURE: String(config.smtpSecure),
    SMTP_USER: stringifyEnvValue(config.smtpUser),
    ...(config.smtpPassword !== undefined ? { SMTP_PASSWORD: stringifyEnvValue(config.smtpPassword) } : {}),
    EMAIL_FROM: stringifyEnvValue(config.emailFrom),
    EMAIL_TO: stringifyEnvValue(config.emailTo),
  };

  const existing = fs.existsSync(envFilePath) ? fs.readFileSync(envFilePath, "utf8").split(/\r?\n/) : [];
  const seen = new Set<string>();
  const nextLines = existing.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/);
    if (!match) return line;

    const key = match[1] as keyof typeof updates;
    if (!(key in updates)) return line;

    seen.add(key);
    return `${key}=${updates[key]}`;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) {
      nextLines.push(`${key}=${value}`);
    }
    process.env[key] = value;
  }

  const directory = path.dirname(envFilePath);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(envFilePath, `${nextLines.filter(Boolean).join("\n")}\n`);
};

export const clearNotionDatabaseConfig = () => {
  saveNotionConfig({
    stockDatabaseId: "",
    dividendDatabaseId: "",
    tradeDatabaseId: "",
    otherInvestmentAssetDatabaseId: "",
    otherInvestmentDatabaseId: "",
  });
};

export const env = getEnv();
