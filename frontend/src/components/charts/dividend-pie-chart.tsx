import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { DashboardSummary } from "../../types";
import { formatCurrency } from "../../lib/utils";

const COLORS = ["#20725c", "#d39f3d", "#5c7c5a", "#e0c08d", "#8c5e34", "#a5b68d"];

export const DividendPieChart = ({ data }: { data: DashboardSummary["dividendContribution"] }) => (
  <div className="h-72">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="amount" nameKey="stockName" innerRadius={56} outerRadius={94} paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={entry.stockCode} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

