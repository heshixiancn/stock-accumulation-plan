import { CircleDollarSign, History, Layers3, TrendingUp, Wallet } from "lucide-react";
import { AssetAllocationChart } from "./asset-allocation-chart";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { cn, formatCurrencyByCurrency, formatPercent, formatSignedCurrencyByCurrency, profitToneClass } from "../../lib/utils";

export interface ListDashboardPosition {
  key: string;
  name: string;
  currency: string;
  marketValue: number;
  costBasis: number;
  unrealizedProfitLoss: number;
  realizedProfitLoss: number;
  dividendIncome: number;
}

interface Props {
  title: string;
  currency: string;
  positions: ListDashboardPosition[];
  estimatedAnnualDividend?: number;
}

export const ListInvestmentDashboard = ({ title, currency, positions, estimatedAnnualDividend }: Props) => {
  const marketValue = positions.reduce((sum, item) => sum + item.marketValue, 0);
  const costBasis = positions.reduce((sum, item) => sum + item.costBasis, 0);
  const unrealizedProfitLoss = positions.reduce((sum, item) => sum + item.unrealizedProfitLoss, 0);
  const realizedProfitLoss = positions.reduce((sum, item) => sum + item.realizedProfitLoss, 0);
  const dividendIncome = positions.reduce((sum, item) => sum + item.dividendIncome, 0);
  const totalProfitLoss = unrealizedProfitLoss + realizedProfitLoss + dividendIncome;
  const holdingReturnRate = costBasis > 0 ? (unrealizedProfitLoss / costBasis) * 100 : 0;
  const openPositionCount = positions.filter((item) => item.marketValue > 0).length;
  const stats = [
    { label: "持仓市值", value: formatCurrencyByCurrency(marketValue, currency), detail: `${openPositionCount} 个持仓 / 共 ${positions.length} 个标的`, icon: Wallet },
    { label: "持仓成本", value: formatCurrencyByCurrency(costBasis, currency), detail: `持仓收益率 ${formatPercent(holdingReturnRate)}`, detailClassName: profitToneClass(holdingReturnRate), icon: Layers3 },
    { label: "持仓盈亏", value: formatSignedCurrencyByCurrency(unrealizedProfitLoss, currency), detail: formatPercent(holdingReturnRate), valueClassName: profitToneClass(unrealizedProfitLoss), detailClassName: profitToneClass(unrealizedProfitLoss), icon: TrendingUp },
    { label: "历史盈亏", value: formatSignedCurrencyByCurrency(realizedProfitLoss, currency), detail: "已实现交易盈亏", valueClassName: profitToneClass(realizedProfitLoss), icon: History },
    { label: "历史分红", value: formatCurrencyByCurrency(dividendIncome, currency), detail: estimatedAnnualDividend === undefined ? "累计分红收入" : `预计年股息 ${formatCurrencyByCurrency(estimatedAnnualDividend, currency)}`, valueClassName: dividendIncome > 0 ? "text-red-600" : undefined, icon: CircleDollarSign },
    { label: "累计总盈亏", value: formatSignedCurrencyByCurrency(totalProfitLoss, currency), detail: "持仓 + 历史 + 分红", valueClassName: profitToneClass(totalProfitLoss), icon: TrendingUp },
  ];

  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Dashboard</p>
        <h3 className="mt-1 text-lg font-semibold">{title}</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((item) => (
          <Card key={item.label} className="border-border/50 bg-white/80 shadow-none">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={cn("mt-1 truncate text-lg font-semibold", item.valueClassName)}>{item.value}</p>
                <p className={cn("mt-1 text-xs text-muted-foreground", item.detailClassName)}>{item.detail}</p>
              </div>
              <div className="shrink-0 rounded-xl bg-secondary p-2.5 text-secondary-foreground"><item.icon className="h-4 w-4" /></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-border/50 bg-white/80 shadow-none">
        <CardHeader className="pb-0"><CardTitle className="text-base">持仓市值分布</CardTitle></CardHeader>
        <CardContent>
          <AssetAllocationChart data={positions.map((item) => ({ name: item.name, currency: item.currency, marketValue: item.marketValue }))} />
        </CardContent>
      </Card>
    </section>
  );
};
