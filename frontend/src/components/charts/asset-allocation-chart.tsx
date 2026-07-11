import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrencyByCurrency } from "../../lib/utils";

const COLORS = ["#20725c", "#d39f3d", "#5c7c5a", "#e0c08d", "#8c5e34", "#a5b68d"];

export interface AssetAllocationDatum {
  name: string;
  currency: string;
  marketValue: number;
}

export const AssetAllocationChart = ({ data }: { data: AssetAllocationDatum[] }) => {
  const visibleData = data.filter((item) => item.marketValue > 0);

  if (visibleData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
        暂无可展示的持仓市值。
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={visibleData} dataKey="marketValue" nameKey="name" innerRadius={52} outerRadius={86} paddingAngle={2}>
            {visibleData.map((entry, index) => (
              <Cell key={`${entry.name}-${entry.currency}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number, _name, item) => formatCurrencyByCurrency(value, item.payload.currency)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
