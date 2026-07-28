import { Router } from "express";
import { z } from "zod";
import { getEnv, getSetupStatus, saveEmailReportConfig, saveNotionConfig } from "../config/env.js";
import { ensureDatabases, validateNotionAccess } from "../lib/notion.js";

const setupPayloadSchema = z.object({
  notionToken: z.string().trim().min(1, "NOTION_TOKEN 不能为空"),
  notionParentPageId: z.string().trim().min(1, "NOTION_PARENT_PAGE_ID 不能为空"),
});

const emailReportPayloadSchema = z.object({
  enabled: z.boolean(),
  time: z.string().regex(/^\d{2}:\d{2}$/, "发送时间格式应为 HH:mm"),
  timezone: z.string().trim().min(1, "时区不能为空"),
  smtpHost: z.string().trim(),
  smtpPort: z.coerce.number().int().positive(),
  smtpSecure: z.boolean(),
  smtpUser: z.string().trim(),
  smtpPassword: z.string().optional(),
  emailFrom: z.string().trim(),
  emailTo: z.string().trim(),
});

export const setupRouter = Router();

const normalizePageId = (value: string) => {
  const compact = value.replace(/-/g, "");
  const match = compact.match(/[0-9a-fA-F]{32}/);
  return match?.[0] ?? value.trim();
};

setupRouter.get("/status", (_req, res) => {
  const status = getSetupStatus();
  res.json({
    configured: status.configured,
    missing: status.missing,
  });
});

setupRouter.get("/email-report", (_req, res) => {
  const env = getEnv();
  res.json({
    enabled: env.DAILY_EMAIL_REPORT_ENABLED,
    time: env.DAILY_EMAIL_REPORT_TIME,
    timezone: env.DAILY_EMAIL_REPORT_TIMEZONE,
    smtpHost: env.SMTP_HOST,
    smtpPort: env.SMTP_PORT,
    smtpSecure: env.SMTP_SECURE,
    smtpUser: env.SMTP_USER,
    smtpPasswordConfigured: Boolean(env.SMTP_PASSWORD),
    emailFrom: env.EMAIL_FROM,
    emailTo: env.EMAIL_TO,
  });
});

setupRouter.post("/email-report", (req, res, next) => {
  try {
    const payload = emailReportPayloadSchema.parse(req.body);
    saveEmailReportConfig({
      ...payload,
      smtpPassword: payload.smtpPassword?.trim() ? payload.smtpPassword : undefined,
    });
    res.json({ message: "邮件报告配置已保存" });
  } catch (error) {
    next(error);
  }
});

setupRouter.post("/", async (req, res, next) => {
  const previousToken = process.env.NOTION_TOKEN;
  const previousParentPageId = process.env.NOTION_PARENT_PAGE_ID;
  const previousStockDatabaseId = process.env.NOTION_STOCK_DATABASE_ID;
  const previousDividendDatabaseId = process.env.NOTION_DIVIDEND_DATABASE_ID;
  const previousTradeDatabaseId = process.env.NOTION_TRADE_DATABASE_ID;
  const previousOtherInvestmentAssetDatabaseId = process.env.NOTION_OTHER_INVESTMENT_ASSET_DATABASE_ID;
  const previousOtherInvestmentDatabaseId = process.env.NOTION_OTHER_INVESTMENT_DATABASE_ID;

  try {
    const payload = setupPayloadSchema.parse(req.body);
    const config = {
      notionToken: payload.notionToken,
      notionParentPageId: normalizePageId(payload.notionParentPageId),
    };

    await validateNotionAccess(config);
    process.env.NOTION_TOKEN = config.notionToken;
    process.env.NOTION_PARENT_PAGE_ID = config.notionParentPageId;
    process.env.NOTION_STOCK_DATABASE_ID = "";
    process.env.NOTION_DIVIDEND_DATABASE_ID = "";
    process.env.NOTION_TRADE_DATABASE_ID = "";
    process.env.NOTION_OTHER_INVESTMENT_ASSET_DATABASE_ID = "";
    process.env.NOTION_OTHER_INVESTMENT_DATABASE_ID = "";

    const databases = await ensureDatabases();
    saveNotionConfig({
      ...config,
      stockDatabaseId: databases.stockDbId,
      dividendDatabaseId: databases.dividendDbId,
      tradeDatabaseId: databases.tradeDbId,
      otherInvestmentAssetDatabaseId: databases.otherInvestmentAssetDbId,
      otherInvestmentDatabaseId: databases.otherInvestmentDbId,
    });

    res.json({
      message: "Notion 配置已保存，数据库已初始化",
      databases,
    });
  } catch (error) {
    if (previousToken === undefined) {
      delete process.env.NOTION_TOKEN;
    } else {
      process.env.NOTION_TOKEN = previousToken;
    }

    if (previousParentPageId === undefined) {
      delete process.env.NOTION_PARENT_PAGE_ID;
    } else {
      process.env.NOTION_PARENT_PAGE_ID = previousParentPageId;
    }

    if (previousStockDatabaseId === undefined) {
      delete process.env.NOTION_STOCK_DATABASE_ID;
    } else {
      process.env.NOTION_STOCK_DATABASE_ID = previousStockDatabaseId;
    }

    if (previousDividendDatabaseId === undefined) {
      delete process.env.NOTION_DIVIDEND_DATABASE_ID;
    } else {
      process.env.NOTION_DIVIDEND_DATABASE_ID = previousDividendDatabaseId;
    }

    if (previousTradeDatabaseId === undefined) {
      delete process.env.NOTION_TRADE_DATABASE_ID;
    } else {
      process.env.NOTION_TRADE_DATABASE_ID = previousTradeDatabaseId;
    }

    if (previousOtherInvestmentAssetDatabaseId === undefined) {
      delete process.env.NOTION_OTHER_INVESTMENT_ASSET_DATABASE_ID;
    } else {
      process.env.NOTION_OTHER_INVESTMENT_ASSET_DATABASE_ID = previousOtherInvestmentAssetDatabaseId;
    }

    if (previousOtherInvestmentDatabaseId === undefined) {
      delete process.env.NOTION_OTHER_INVESTMENT_DATABASE_ID;
    } else {
      process.env.NOTION_OTHER_INVESTMENT_DATABASE_ID = previousOtherInvestmentDatabaseId;
    }

    next(error);
  }
});
