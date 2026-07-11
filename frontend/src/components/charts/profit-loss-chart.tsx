import { Bar, BarChart, CartesianGrid, Cell, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardSummary } from "../../types";
import { formatCurrency, profitToneFill } from "../../lib/utils";

export const ProfitLossChart = ({ data }: { data: DashboardSummary["profitLossByStock"] }) => (
  <div className="h-80">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: 8, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="stockName" tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(value) => `${value}`} />
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Legend />
        <ReferenceLine y={0} stroke="#8a7b68" />
        <Bar dataKey="unrealizedProfitLoss" name="浮动盈亏" radius={[8, 8, 0, 0]}>
          {data.map((item) => (
            <Cell key={`unrealized-${item.stockCode}`} fill={profitToneFill(item.unrealizedProfitLoss)} />
          ))}
        </Bar>
        <Bar dataKey="realizedProfitLoss" name="已实现盈亏" radius={[8, 8, 0, 0]}>
          {data.map((item) => (
            <Cell key={`realized-${item.stockCode}`} fill={profitToneFill(item.realizedProfitLoss)} />
          ))}
        </Bar>
        <Bar dataKey="dividendIncome" name="股息收入" radius={[8, 8, 0, 0]}>
          {data.map((item) => (
            <Cell key={`dividend-${item.stockCode}`} fill={profitToneFill(item.dividendIncome)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);
