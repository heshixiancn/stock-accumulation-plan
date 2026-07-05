import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardSummary } from "../../types";
import { formatCurrency } from "../../lib/utils";

export const DividendYearChart = ({ data }: { data: DashboardSummary["dividendsByYear"] }) => (
  <div className="h-72">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="year" />
        <YAxis tickFormatter={(value) => `${value}`} />
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Legend />
        <Bar dataKey="grossDividend" name="税前股息" fill="#c58a2f" radius={[10, 10, 0, 0]} />
        <Bar dataKey="netDividend" name="税后股息" fill="#20725c" radius={[10, 10, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

