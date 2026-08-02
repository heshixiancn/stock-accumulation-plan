import { Bar, BarChart, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const mutedProfitFill = (value: number) => (value > 0 ? "#78917e" : value < 0 ? "#a47f79" : "#99958d");

interface Props {
  holdingPeriod: string;
  holdingQuantity: string;
  costPrice: string;
  currentPrice: string;
  costBasis: number;
  marketValue: number;
  unrealizedProfitLoss: number;
  realizedProfitLoss: number;
  dividendIncome: number;
  totalProfitLoss: number;
  dividendHistory: Array<{ year: string; value: number }>;
  formatValue: (value: number) => string;
}

export const InvestmentPerformanceCharts = ({
  holdingPeriod,
  holdingQuantity,
  costPrice,
  currentPrice,
  costBasis,
  marketValue,
  unrealizedProfitLoss,
  realizedProfitLoss,
  dividendIncome,
  totalProfitLoss,
  dividendHistory,
  formatValue,
}: Props) => {
  const investmentData = [
    { name: "持仓成本", value: costBasis, fill: "#9b8f7a" },
    { name: "当前市值", value: marketValue, fill: "#7c8798" },
  ];
  const profitData = [
    { name: "持仓盈亏", value: unrealizedProfitLoss },
    { name: "历史盈亏", value: realizedProfitLoss },
    { name: "分红收入", value: dividendIncome },
  ];
  const facts = [
    { label: "本轮持仓时间", value: holdingPeriod },
    { label: "持仓数量", value: holdingQuantity },
    { label: "持仓成本价", value: costPrice },
    { label: "当前价格", value: currentPrice },
    { label: "历史分红收入", value: formatValue(dividendIncome) },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border/60 py-4 sm:grid-cols-3 lg:grid-cols-5">
        {facts.map((item) => (
          <div key={item.label} className="min-w-0">
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className="mt-1 truncate font-semibold" title={item.value}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-2">
            <h4 className="font-semibold">投资成本与当前市值</h4>
            <p className="text-xs text-muted-foreground">当前持仓口径</p>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={investmentData} margin={{ top: 24, right: 8, left: 8, bottom: 0 }} barCategoryGap="55%">
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip formatter={(value: number) => formatValue(value)} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={38}>
                  {investmentData.map((item) => <Cell key={item.name} fill={item.fill} />)}
                  <LabelList dataKey="value" position="top" formatter={(value: number) => formatValue(value)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <h4 className="font-semibold">收益构成</h4>
              <p className="text-xs text-muted-foreground">持仓、历次卖出和分红分别核算</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">累计总盈亏</div>
              <div className="font-semibold">{formatValue(totalProfitLoss)}</div>
            </div>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitData} margin={{ top: 24, right: 8, left: 8, bottom: 0 }} barCategoryGap="60%">
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip formatter={(value: number) => formatValue(value)} />
                <ReferenceLine y={0} stroke="#8a7b68" />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={32}>
                  {profitData.map((item) => <Cell key={item.name} fill={mutedProfitFill(item.value)} />)}
                  <LabelList dataKey="value" position="top" formatter={(value: number) => formatValue(value)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {dividendHistory.length > 0 ? (
        <section className="border-t border-border/60 pt-4">
          <div className="mb-2">
            <h4 className="font-semibold">历年分红</h4>
            <p className="text-xs text-muted-foreground">按实际到账年份汇总</p>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dividendHistory} margin={{ top: 24, right: 8, left: 8, bottom: 0 }} barCategoryGap="65%">
                <XAxis dataKey="year" tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip formatter={(value: number) => formatValue(value)} />
                <Bar dataKey="value" fill="#a79578" radius={[6, 6, 0, 0]} maxBarSize={28}>
                  <LabelList dataKey="value" position="top" formatter={(value: number) => formatValue(value)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}
    </div>
  );
};
