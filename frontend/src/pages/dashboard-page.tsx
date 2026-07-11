import { CircleDollarSign, Layers3, PieChart, TrendingUp, Wallet } from "lucide-react";
import { DividendPieChart } from "../components/charts/dividend-pie-chart";
import { DividendYearChart } from "../components/charts/dividend-year-chart";
import { MarketAccountAllocationChart, type MarketAccountAllocationDatum } from "../components/charts/market-account-allocation-chart";
import { ProfitLossChart } from "../components/charts/profit-loss-chart";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  cn,
  formatCurrency,
  formatCurrencyByCurrency,
  formatNumber,
  formatPercent,
  formatSignedCurrencyByCurrency,
  formatSignedPercent,
  profitToneClass,
} from "../lib/utils";
import type { DashboardSummary, OtherInvestmentCurrency } from "../types";

const currencyLabels: Record<OtherInvestmentCurrency, string> = {
  CNY: "人民币",
  USD: "美元",
  HKD: "港币",
};

const fallbackCurrency: DashboardSummary["portfolioByCurrency"][number] = {
  currency: "CNY",
  marketValue: 0,
  costBasis: 0,
  unrealizedProfitLoss: 0,
  unrealizedProfitLossRate: 0,
  realizedProfitLoss: 0,
  totalProfitLoss: 0,
  totalProfitLossRate: 0,
  positionCount: 0,
  openPositionCount: 0,
  closedPositionCount: 0,
};

const currencyLabel = (currency: OtherInvestmentCurrency) => currencyLabels[currency] ?? currency;

const allocationName = (item: { name: string; currency: OtherInvestmentCurrency }) =>
  `${item.name}${item.currency === "CNY" ? "" : ` · ${item.currency}`}`;

const getPrimaryCurrency = (data: DashboardSummary) =>
  data.portfolioByCurrency.find((item) => item.currency === "CNY") ?? data.portfolioByCurrency[0] ?? fallbackCurrency;

const getOtherInvestmentModule = (data: DashboardSummary, currency: OtherInvestmentCurrency) =>
  data.moduleAllocation.find((item) => item.name === "其他投资" && item.currency === currency) ??
  data.moduleAllocation.find((item) => item.name === "其他投资") ?? {
    name: "其他投资",
    currency,
    marketValue: 0,
    costBasis: 0,
    unrealizedProfitLoss: 0,
    realizedProfitLoss: 0,
    totalProfitLoss: 0,
    positionCount: 0,
  };

const buildMarketAccountAllocation = (data: DashboardSummary): MarketAccountAllocationDatum[] => {
  const stockModule = data.moduleAllocation.find((item) => item.name === "蓝筹攒股" && item.currency === "CNY");
  const items: MarketAccountAllocationDatum[] = [];

  if (stockModule) {
    items.push({
      name: "A股 · 攒股计划",
      market: "A股",
      account: "攒股计划",
      currency: stockModule.currency,
      marketValue: stockModule.marketValue,
      totalProfitLoss: stockModule.totalProfitLoss,
      positionCount: stockModule.positionCount,
    });
  }

  data.otherInvestmentMarketAllocation.forEach((item) => {
    items.push({
      name: `${item.name} · 其他投资`,
      market: item.name,
      account: "其他投资",
      currency: item.currency,
      marketValue: item.marketValue,
      totalProfitLoss: item.totalProfitLoss,
      positionCount: item.positionCount,
    });
  });

  return items;
};

const globalStats = (data: DashboardSummary) => {
  const primary = getPrimaryCurrency(data);
  const otherInvestment = getOtherInvestmentModule(data, primary.currency);

  return [
    {
      label: `${currencyLabel(primary.currency)}持仓市值`,
      value: formatCurrencyByCurrency(primary.marketValue, primary.currency),
      subValue: `${primary.openPositionCount} 个持仓 / ${primary.closedPositionCount} 个清仓`,
      icon: Wallet,
    },
    {
      label: `${currencyLabel(primary.currency)}持仓成本`,
      value: formatCurrencyByCurrency(primary.costBasis, primary.currency),
      subValue: `浮动 ${formatSignedCurrencyByCurrency(primary.unrealizedProfitLoss, primary.currency)}`,
      icon: Layers3,
      subValueClassName: profitToneClass(primary.unrealizedProfitLoss),
    },
    {
      label: `${currencyLabel(primary.currency)}总盈亏`,
      value: formatSignedCurrencyByCurrency(primary.totalProfitLoss, primary.currency),
      subValue: formatSignedPercent(primary.totalProfitLossRate),
      icon: TrendingUp,
      valueClassName: profitToneClass(primary.totalProfitLoss),
    },
    {
      label: "蓝筹攒股市值",
      value: formatCurrency(data.totalMarketValue),
      subValue: `成本 ${formatCurrency(data.totalHoldingCost)}`,
      icon: Wallet,
    },
    {
      label: "其他投资市值",
      value: formatCurrencyByCurrency(otherInvestment.marketValue, otherInvestment.currency),
      subValue: `${otherInvestment.positionCount} 个标的`,
      icon: PieChart,
    },
    {
      label: "预计每年股息",
      value: formatCurrency(data.estimatedAnnualDividend),
      subValue: `达标后 ${formatCurrency(data.estimatedAnnualDividendAtTarget)}`,
      icon: CircleDollarSign,
    },
  ];
};

const AllocationList = ({
  title,
  items,
}: {
  title: string;
  items: Array<{
    name: string;
    currency: OtherInvestmentCurrency;
    marketValue: number;
    totalProfitLoss: number;
    positionCount: number;
  }>;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {items.map((item) => {
        const currencyTotal = items
          .filter((candidate) => candidate.currency === item.currency)
          .reduce((sum, candidate) => sum + candidate.marketValue, 0);
        const progress = currencyTotal > 0 ? (item.marketValue / currencyTotal) * 100 : 0;

        return (
          <div key={`${title}-${item.name}-${item.currency}`} className="rounded-2xl bg-secondary/45 p-3">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <div>
                <div className="font-medium">{allocationName(item)}</div>
                <div className="text-xs text-muted-foreground">{item.positionCount} 个标的</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatCurrencyByCurrency(item.marketValue, item.currency)}</div>
                <div className={cn("text-xs", profitToneClass(item.totalProfitLoss))}>
                  {formatSignedCurrencyByCurrency(item.totalProfitLoss, item.currency)}
                </div>
              </div>
            </div>
            <div className="h-2 rounded-full bg-white">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
          </div>
        );
      })}
      {items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          暂无其他投资持仓。
        </div>
      )}
    </CardContent>
  </Card>
);

export const DashboardPage = ({ data }: { data: DashboardSummary }) => {
  const primary = getPrimaryCurrency(data);
  const plannedStocks = data.stockProgress.filter((item) => item.targetShares > 0);
  const marketAccountAllocation = buildMarketAccountAllocation(data);
  const hasMultipleCurrencies = data.portfolioByCurrency.length > 1;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white/80 p-5 shadow-sm ring-1 ring-border/70 sm:p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/70">Portfolio Overview</p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">全账户总览</h2>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            汇总蓝筹攒股和其他投资。{hasMultipleCurrencies ? "外币资产未做汇率折算，下方按币种分别展示。" : ""}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {globalStats(data).map((item) => (
            <Card key={item.label}>
              <CardContent className="flex items-center justify-between gap-3 p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className={cn("mt-2 break-all text-xl font-semibold", item.valueClassName)}>{item.value}</p>
                  {item.subValue ? (
                    <p className={cn("mt-1 text-sm", item.subValueClassName ?? item.valueClassName)}>{item.subValue}</p>
                  ) : null}
                </div>
                <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                  <item.icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>按币种汇总</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {data.portfolioByCurrency.map((item) => (
              <div key={item.currency} className="rounded-2xl bg-secondary/45 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{currencyLabel(item.currency)}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.openPositionCount} 个持仓 / {item.closedPositionCount} 个清仓
                    </div>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {item.currency}
                  </span>
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <div className="text-muted-foreground">市值</div>
                    <div className="font-semibold">{formatCurrencyByCurrency(item.marketValue, item.currency)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">成本</div>
                    <div className="font-semibold">{formatCurrencyByCurrency(item.costBasis, item.currency)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">浮动盈亏</div>
                    <div className={cn("font-semibold", profitToneClass(item.unrealizedProfitLoss))}>
                      {formatSignedCurrencyByCurrency(item.unrealizedProfitLoss, item.currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">总盈亏</div>
                    <div className={cn("font-semibold", profitToneClass(item.totalProfitLoss))}>
                      {formatSignedCurrencyByCurrency(item.totalProfitLoss, item.currency)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {data.portfolioByCurrency.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                暂无持仓数据。
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>市场账户分布</CardTitle>
          </CardHeader>
          <CardContent>
            <MarketAccountAllocationChart data={marketAccountAllocation} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>蓝筹攒股计划</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>整体攒股进度</span>
                <span>{formatPercent(data.overallProgress)}</span>
              </div>
              <div className="h-4 rounded-full bg-secondary">
                <div className="h-4 rounded-full bg-primary" style={{ width: `${Math.min(data.overallProgress, 100)}%` }} />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">个股进度</span>
                <span className="text-xs text-muted-foreground">按进度从高到低</span>
              </div>
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {plannedStocks.map((item) => (
                  <div key={`overall-${item.stockCode}-${item.stockName}`} className="rounded-2xl bg-white/70 p-3">
                    <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-medium">
                          {item.stockName} <span className="text-muted-foreground">({item.stockCode})</span>
                          {item.isClosed ? <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs">已清仓</span> : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatNumber(item.holdingShares)} / {formatNumber(item.targetShares)} 股
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-primary">{formatPercent(item.progress)}</div>
                    </div>
                    <div className="h-2.5 rounded-full bg-secondary">
                      <div className="h-2.5 rounded-full bg-primary" style={{ width: `${Math.min(item.progress, 100)}%` }} />
                    </div>
                  </div>
                ))}
                {plannedStocks.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border bg-white/70 p-4 text-sm text-muted-foreground">
                    暂无股票计划。
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-secondary/60 p-4">
                <p className="text-sm text-muted-foreground">实际累计股息</p>
                <p className="mt-2 break-all text-2xl font-semibold">{formatCurrency(data.actualTotalDividend)}</p>
              </div>
              <div className="rounded-2xl bg-secondary/60 p-4">
                <p className="text-sm text-muted-foreground">预计达标年股息</p>
                <p className="mt-2 break-all text-2xl font-semibold">{formatCurrency(data.estimatedAnnualDividendAtTarget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>蓝筹股息贡献占比</CardTitle>
          </CardHeader>
          <CardContent>
            <DividendPieChart data={data.dividendContribution} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>蓝筹持仓与清仓盈亏</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitLossChart data={data.profitLossByStock} />
          </CardContent>
        </Card>
        <AllocationList title="其他投资类型分布" items={data.otherInvestmentTypeAllocation} />
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>蓝筹历年股息收入</CardTitle>
          </CardHeader>
          <CardContent>
            <DividendYearChart data={data.dividendsByYear} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
};
