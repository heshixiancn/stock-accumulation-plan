import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatCurrencyByCurrency = (value: number, currency = "CNY") =>
  new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value || 0);

export const formatCurrency = (value: number) => formatCurrencyByCurrency(value, "CNY");

export const formatPrice = (value: number) =>
  new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value || 0);

export const formatCostPrice = (value: number) =>
  new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 3,
    maximumFractionDigits: 6,
  }).format(value || 0);

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 2,
  }).format(value || 0);

export const formatPercent = (value: number) => `${(value || 0).toFixed(2)}%`;

export const formatSignedCurrency = (value: number) => {
  const formatted = formatCurrency(Math.abs(value || 0));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
};

export const formatSignedCurrencyByCurrency = (value: number, currency = "CNY") => {
  const formatted = formatCurrencyByCurrency(Math.abs(value || 0), currency);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
};

export const formatSignedPercent = (value: number) => {
  const formatted = formatPercent(Math.abs(value || 0));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
};

export const profitToneClass = (value: number) =>
  value > 0 ? "text-red-600" : value < 0 ? "text-emerald-700" : "text-muted-foreground";

export const profitToneFill = (value: number) => (value > 0 ? "#dc2626" : value < 0 ? "#16a34a" : "#8a7b68");
