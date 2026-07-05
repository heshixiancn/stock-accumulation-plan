import { ArrowRight, CircleDollarSign, Goal, TrendingUp, Wallet } from "lucide-react";
import { DividendPieChart } from "../components/charts/dividend-pie-chart";
import { DividendYearChart } from "../components/charts/dividend-year-chart";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { cn, formatCurrency, formatNumber, formatPercent, formatSignedCurrency, formatSignedPercent } from "../lib/utils";
import type { DashboardSummary } from "../types";

const profitTone = (value: number) =>
  value > 0 ? "text-emerald-700" : value < 0 ? "text-red-600" : "text-muted-foreground";

const stats = (data: DashboardSummary) => [
  { label: "总持仓成本", value: formatCurrency(data.totalHoldingCost), icon: Wallet },
  { label: "总持仓市值", value: formatCurrency(data.totalMarketValue), icon: Wallet },
  {
    label: "预计需要总资金",
    value: formatCurrency(data.totalEstimatedTargetCapital),
    subValue: `还需投入 ${formatCurrency(data.totalRemainingTargetCapital)}`,
    icon: Goal,
  },
  {
    label: "浮动盈亏",
    value: formatSignedCurrency(data.totalUnrealizedProfitLoss),
    subValue: formatSignedPercent(data.totalUnrealizedProfitLossRate),
    icon: TrendingUp,
    valueClassName: profitTone(data.totalUnrealizedProfitLoss),
  },
  {
    label: "预计每年股息收入",
    value: formatCurrency(data.estimatedAnnualDividend),
    subValue: `达标后 ${formatCurrency(data.estimatedAnnualDividendAtTarget)}`,
    icon: CircleDollarSign,
  },
];

export const DashboardPage = ({ data }: { data: DashboardSummary }) => (
  <div className="space-y-6">
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      {stats(data).map((item) => (
        <Card key={item.label}>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className={cn("mt-2 break-all text-xl font-semibold sm:text-2xl", item.valueClassName)}>{item.value}</p>
              {"subValue" in item && item.subValue ? (
                <p className={cn("mt-1 text-sm", item.valueClassName)}>{item.subValue}</p>
              ) : null}
            </div>
            <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
              <item.icon className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </section>

    <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <Card>
        <CardHeader>
          <CardTitle>整体攒股进度</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>累计进度</span>
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
              {data.stockProgress.map((item) => (
                <div key={`overall-${item.stockCode}-${item.stockName}`} className="rounded-2xl bg-white/70 p-3">
                  <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium">
                        {item.stockName} <span className="text-muted-foreground">({item.stockCode})</span>
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
              {data.stockProgress.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-white/70 p-4 text-sm text-muted-foreground">
                  暂无股票计划。
                </div>
              )}
            </div>
          </div>
          <div className="rounded-2xl bg-secondary/60 p-4">
            <p className="text-sm text-muted-foreground">实际累计股息</p>
            <p className="mt-2 break-all text-2xl font-semibold sm:text-3xl">{formatCurrency(data.actualTotalDividend)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>股息贡献占比</CardTitle>
        </CardHeader>
        <CardContent>
          <DividendPieChart data={data.dividendContribution} />
        </CardContent>
      </Card>
    </section>

    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>历年股息收入</CardTitle>
        </CardHeader>
        <CardContent>
          <DividendYearChart data={data.dividendsByYear} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>个股资金与股息明细</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.stockProgress.map((item) => (
            <div key={`${item.stockCode}-${item.stockName}`} className="rounded-2xl bg-secondary/45 p-4">
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">
                    {item.stockName} <span className="text-muted-foreground">({item.stockCode})</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatNumber(item.holdingShares)} / {formatNumber(item.targetShares)} 股
                  </div>
                </div>
                <div className="text-sm sm:text-right">
                  <div>{formatPercent(item.progress)}</div>
                  <div className="text-muted-foreground">预计年股息 {formatCurrency(item.estimatedDividend)}</div>
                </div>
              </div>
              <div className="mb-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  现价 / 成本：
                  <span className="text-foreground">
                    {formatCurrency(item.currentPrice)} / {formatCurrency(item.costPrice)}
                  </span>
                </div>
                <div>
                  持仓市值：
                  <span className="text-foreground">{formatCurrency(item.marketValue)}</span>
                </div>
                <div>
                  预计需要总资金：
                  <span className="text-foreground">{formatCurrency(item.estimatedTargetCapital)}</span>
                </div>
                <div>
                  还需投入：
                  <span className="text-foreground">{formatCurrency(item.remainingTargetCapital)}</span>
                </div>
                <div>
                  持仓盈亏：
                  <span className={cn("font-medium", profitTone(item.unrealizedProfitLoss))}>
                    {formatSignedCurrency(item.unrealizedProfitLoss)}（{formatSignedPercent(item.unrealizedProfitLossRate)}）
                  </span>
                </div>
                <div>
                  预计每年股息收入：
                  <span className="text-foreground">
                    当前 {formatCurrency(item.estimatedDividend)} / 达标 {formatCurrency(item.estimatedDividendAtTarget)}
                  </span>
                </div>
              </div>
              <div className="h-3 rounded-full bg-white">
                <div className="h-3 rounded-full bg-primary" style={{ width: `${Math.min(item.progress, 100)}%` }} />
              </div>
            </div>
          ))}
          {data.stockProgress.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              暂无股票计划，请先在攒股计划页新增数据。 <ArrowRight className="ml-1 inline h-4 w-4" />
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  </div>
);
