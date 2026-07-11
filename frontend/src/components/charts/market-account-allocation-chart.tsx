import { cn, formatCurrencyByCurrency, formatSignedCurrencyByCurrency, profitToneClass } from "../../lib/utils";

const COLORS = ["#20725c", "#d39f3d", "#5c7c5a", "#e0c08d", "#8c5e34", "#a5b68d"];
const currencyOrder = ["CNY", "HKD", "USD"];

export interface MarketAccountAllocationDatum {
  name: string;
  market: string;
  account: string;
  currency: string;
  marketValue: number;
  totalProfitLoss: number;
  positionCount: number;
}

const sortByCurrencyAndValue = (items: MarketAccountAllocationDatum[]) =>
  [...items].sort((a, b) => {
    const currencyRank = currencyOrder.indexOf(a.currency) - currencyOrder.indexOf(b.currency);
    if (currencyRank !== 0) return currencyRank;
    return b.marketValue - a.marketValue || a.name.localeCompare(b.name, "zh-CN");
  });

const itemKey = (item: MarketAccountAllocationDatum) => `${item.currency}-${item.name}`;

export const MarketAccountAllocationChart = ({ data }: { data: MarketAccountAllocationDatum[] }) => {
  const visibleData = sortByCurrencyAndValue(data.filter((item) => item.marketValue > 0 || item.positionCount > 0));
  const colorByItem = new Map(visibleData.map((item, index) => [itemKey(item), COLORS[index % COLORS.length]]));
  const currencies = [...new Set(visibleData.map((item) => item.currency))].sort(
    (a, b) => currencyOrder.indexOf(a) - currencyOrder.indexOf(b),
  );
  const totalsByCurrency = new Map(
    currencies.map((currency) => [
      currency,
      visibleData.filter((item) => item.currency === currency).reduce((sum, item) => sum + item.marketValue, 0),
    ]),
  );

  if (visibleData.length === 0) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
        暂无可展示的市场分布。
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-secondary/45 p-4">
        <div className="mb-4 flex flex-col gap-1">
          <div className="text-sm font-medium">市场与账户分布</div>
          <div className="text-xs text-muted-foreground">A 股拆分为攒股计划和其他投资；外币按原币展示，未做汇率折算。</div>
        </div>
        <div className="space-y-4">
          {currencies.map((currency) => {
            const currencyItems = visibleData.filter((item) => item.currency === currency);
            const total = totalsByCurrency.get(currency) ?? 0;

            return (
              <div key={currency} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold">{currency}</span>
                  <span className="text-muted-foreground">{formatCurrencyByCurrency(total, currency)}</span>
                </div>
                <div className="flex h-5 overflow-hidden rounded-full bg-white">
                  {currencyItems.map((item) => {
                    const width = total > 0 ? Math.max((item.marketValue / total) * 100, 2) : 100 / currencyItems.length;
                    return (
                      <div
                        key={itemKey(item)}
                        className="h-full"
                        style={{
                          width: `${width}%`,
                          backgroundColor: colorByItem.get(itemKey(item)),
                        }}
                        title={`${item.name} ${formatCurrencyByCurrency(item.marketValue, item.currency)}`}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  {currencyItems.map((item) => (
                    <span key={`${item.currency}-${item.name}-legend`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorByItem.get(itemKey(item)) }} />
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {visibleData.map((item) => (
          <div key={`${item.currency}-${item.name}-detail`} className="rounded-2xl bg-secondary/35 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorByItem.get(itemKey(item)) }} />
                  <span className="truncate text-sm font-semibold">{item.name}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {item.market} / {item.account} / {item.positionCount} 个标的
                </div>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-muted-foreground">{item.currency}</span>
            </div>
            <div className="flex items-end justify-between gap-3">
              <div className="text-base font-semibold">{formatCurrencyByCurrency(item.marketValue, item.currency)}</div>
              <div className={cn("text-sm font-semibold", profitToneClass(item.totalProfitLoss))}>
                {formatSignedCurrencyByCurrency(item.totalProfitLoss, item.currency)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
