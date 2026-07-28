import type { DashboardSummary, OtherInvestmentCurrency } from "../types/domain.js";
import { getEnv } from "../config/env.js";
import { getDashboardSummary } from "./dashboard-service.js";
import { sendMail } from "./smtp-service.js";

const currencySymbols: Record<OtherInvestmentCurrency, string> = {
  CNY: "¥",
  USD: "$",
  HKD: "HK$",
};

const formatMoney = (value: number, currency: OtherInvestmentCurrency) =>
  `${currencySymbols[currency] ?? currency}${value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const buildTextReport = (data: DashboardSummary, dateKey: string) => {
  const currencyLines = data.portfolioByCurrency.map(
    (item) =>
      `${item.currency}: 市值 ${formatMoney(item.marketValue, item.currency)}，成本 ${formatMoney(item.costBasis, item.currency)}，总盈亏 ${formatMoney(item.totalProfitLoss, item.currency)}（${formatPercent(item.totalProfitLossRate)}）`,
  );
  const topStocks = data.profitLossByStock
    .slice(0, 8)
    .map((item) => `${item.stockName}(${item.stockCode}): ${item.totalProfitLoss.toFixed(2)}`);

  return [
    `每日投资报告 ${dateKey}`,
    "",
    "按币种汇总",
    ...currencyLines,
    "",
    `蓝筹攒股市值：${formatMoney(data.totalMarketValue, "CNY")}`,
    `蓝筹攒股成本：${formatMoney(data.totalHoldingCost, "CNY")}`,
    `蓝筹总盈亏：${formatMoney(data.totalProfitLoss, "CNY")}（${formatPercent(data.totalProfitLossRate)}）`,
    `预计每年股息：${formatMoney(data.estimatedAnnualDividend, "CNY")}`,
    `整体进度：${formatPercent(data.overallProgress)}`,
    "",
    "个股盈亏 Top",
    ...(topStocks.length > 0 ? topStocks : ["暂无数据"]),
  ].join("\n");
};

const buildHtmlReport = (data: DashboardSummary, dateKey: string) => {
  const currencyRows = data.portfolioByCurrency
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.currency)}</td>
        <td>${formatMoney(item.marketValue, item.currency)}</td>
        <td>${formatMoney(item.costBasis, item.currency)}</td>
        <td>${formatMoney(item.totalProfitLoss, item.currency)}</td>
        <td>${formatPercent(item.totalProfitLossRate)}</td>
      </tr>`,
    )
    .join("");
  const stockRows = data.profitLossByStock
    .slice(0, 8)
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.stockName)} (${escapeHtml(item.stockCode)})</td>
        <td>${item.unrealizedProfitLoss.toFixed(2)}</td>
        <td>${item.realizedProfitLoss.toFixed(2)}</td>
        <td>${item.dividendIncome.toFixed(2)}</td>
        <td>${item.totalProfitLoss.toFixed(2)}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827;">
    <h2>每日投资报告 ${escapeHtml(dateKey)}</h2>
    <h3>按币种汇总</h3>
    <table cellpadding="8" cellspacing="0" border="1" style="border-collapse: collapse;">
      <thead><tr><th>币种</th><th>市值</th><th>成本</th><th>总盈亏</th><th>收益率</th></tr></thead>
      <tbody>${currencyRows || "<tr><td colspan=\"5\">暂无数据</td></tr>"}</tbody>
    </table>
    <h3>蓝筹攒股</h3>
    <p>市值：${formatMoney(data.totalMarketValue, "CNY")}；成本：${formatMoney(data.totalHoldingCost, "CNY")}；总盈亏：${formatMoney(data.totalProfitLoss, "CNY")}（${formatPercent(data.totalProfitLossRate)}）；预计每年股息：${formatMoney(data.estimatedAnnualDividend, "CNY")}；整体进度：${formatPercent(data.overallProgress)}</p>
    <h3>个股盈亏 Top</h3>
    <table cellpadding="8" cellspacing="0" border="1" style="border-collapse: collapse;">
      <thead><tr><th>股票</th><th>浮动盈亏</th><th>已实现</th><th>股息</th><th>总盈亏</th></tr></thead>
      <tbody>${stockRows || "<tr><td colspan=\"5\">暂无数据</td></tr>"}</tbody>
    </table>
  </body>
</html>`;
};

export const isDailyEmailReportConfigured = () => {
  const env = getEnv();
  const recipients = env.EMAIL_TO.split(",").map((item) => item.trim()).filter(Boolean);
  return Boolean(env.SMTP_HOST && env.EMAIL_FROM && recipients.length > 0);
};

export const sendDailyEmailReport = async (dateKey: string) => {
  const env = getEnv();
  const recipients = env.EMAIL_TO.split(",").map((item) => item.trim()).filter(Boolean);
  if (!isDailyEmailReportConfigured()) {
    throw new Error("daily email report is not configured");
  }

  const dashboard = await getDashboardSummary();
  await sendMail(
    {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
    },
    {
      from: env.EMAIL_FROM,
      to: recipients,
      subject: `每日投资报告 ${dateKey}`,
      text: buildTextReport(dashboard, dateKey),
      html: buildHtmlReport(dashboard, dateKey),
    },
  );
};
