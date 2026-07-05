import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
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

export const formatSignedPercent = (value: number) => {
  const formatted = formatPercent(Math.abs(value || 0));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
};
