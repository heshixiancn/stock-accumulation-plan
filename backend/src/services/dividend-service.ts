import { archivePage, createPage, ensureDatabases, isPageObject, queryDatabase, updatePage } from "../lib/notion.js";
import { mapDividendPage } from "./notion-mappers.js";
import { normalizeDividendPayload, type DividendPayload } from "./validation.js";
import {
  dateProperty,
  numberProperty,
  richText,
  title,
} from "../utils/notion-helpers.js";

export const listDividends = async () => {
  const { dividendDbId } = await ensureDatabases();
  const response = await queryDatabase(dividendDbId);
  return response.results.filter(isPageObject).map(mapDividendPage);
};

export const createDividend = async (payload: DividendPayload) => {
  const { dividendDbId } = await ensureDatabases();
  const data = normalizeDividendPayload(payload);

  await createPage(dividendDbId, {
    记录标题: title(data.title),
    股票代码: richText(data.stockCode),
    股票名称: richText(data.stockName),
    年份: numberProperty(data.year),
    除权除息日: dateProperty(data.exDividendDate),
    到账日期: dateProperty(data.paymentDate),
    每股分红: numberProperty(data.dividendPerShare),
    持仓股数: numberProperty(data.holdingShares),
    税前股息: numberProperty(data.grossDividend),
    税后股息: numberProperty(data.netDividend),
    备注: richText(data.notes),
  });
};

export const updateDividendById = async (id: string, payload: DividendPayload) => {
  const data = normalizeDividendPayload(payload);

  await updatePage(id, {
    记录标题: title(data.title),
    股票代码: richText(data.stockCode),
    股票名称: richText(data.stockName),
    年份: numberProperty(data.year),
    除权除息日: dateProperty(data.exDividendDate),
    到账日期: dateProperty(data.paymentDate),
    每股分红: numberProperty(data.dividendPerShare),
    持仓股数: numberProperty(data.holdingShares),
    税前股息: numberProperty(data.grossDividend),
    税后股息: numberProperty(data.netDividend),
    备注: richText(data.notes),
  });
};

export const deleteDividendById = async (id: string) => {
  await archivePage(id);
};

