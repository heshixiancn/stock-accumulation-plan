export interface HoldingLedgerItem {
  date: string | null;
  type: "buy" | "sell";
  quantity: number;
  createdAt?: string;
}

export const getCurrentHoldingSince = (items: HoldingLedgerItem[]) => {
  const sorted = [...items].sort((a, b) => {
    const dateCompare = (a.date ?? "").localeCompare(b.date ?? "");
    return dateCompare || (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
  });
  let quantity = 0;
  let holdingSince: string | null = null;

  for (const item of sorted) {
    if (item.type === "buy") {
      if (quantity <= 0) holdingSince = item.date;
      quantity += item.quantity;
      continue;
    }

    quantity = Math.max(0, quantity - item.quantity);
    if (quantity === 0) holdingSince = null;
  }

  return quantity > 0 ? holdingSince : null;
};

export const formatHoldingPeriod = (holdingSince: string | null, holdingQuantity: number) => {
  if (holdingQuantity <= 0) return "已清仓";
  if (!holdingSince) return "日期未知";

  const startedAt = new Date(`${holdingSince}T00:00:00`);
  const elapsed = Date.now() - startedAt.getTime();
  const days = Math.max(1, Math.floor(elapsed / 86_400_000) + 1);
  return `${holdingSince} · ${days} 天`;
};

export const aggregateDividendHistory = (items: Array<{ year: string | number | null; value: number }>) => {
  const totals = new Map<string, number>();
  for (const item of items) {
    const year = String(item.year ?? "").slice(0, 4);
    if (!/^\d{4}$/.test(year)) continue;
    totals.set(year, (totals.get(year) ?? 0) + item.value);
  }
  return [...totals.entries()]
    .map(([year, value]) => ({ year, value }))
    .sort((a, b) => a.year.localeCompare(b.year));
};
