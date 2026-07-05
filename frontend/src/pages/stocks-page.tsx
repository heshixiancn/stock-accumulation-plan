import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { StockFormDialog } from "../components/forms/stock-form-dialog";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { cn, formatCurrency, formatNumber, formatPercent, formatSignedCurrency, formatSignedPercent } from "../lib/utils";
import type { StockPlan, StockStatus } from "../types";

const statusFilters = ["全部", "观察中", "建仓中", "持有中", "已暂停"] as const;
type StockPayload = Omit<
  StockPlan,
  | "id"
  | "totalHoldingCost"
  | "marketValue"
  | "estimatedTargetCapital"
  | "remainingTargetCapital"
  | "unrealizedProfitLoss"
  | "unrealizedProfitLossRate"
  | "estimatedDividend"
  | "estimatedDividendYieldOnCost"
  | "estimatedDividendYieldOnMarket"
  | "estimatedDividendAtTarget"
  | "estimatedDividendAtTargetYieldOnCapital"
  | "progress"
>;

const profitTone = (value: number) =>
  value > 0 ? "text-emerald-700" : value < 0 ? "text-red-600" : "text-muted-foreground";

interface Props {
  stocks: StockPlan[];
  onCreate: (payload: StockPayload) => Promise<void>;
  onUpdate: (id: string, payload: StockPayload) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  submitting?: boolean;
}

export const StocksPage = ({ stocks, onCreate, onUpdate, onDelete, submitting }: Props) => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof statusFilters)[number]>("全部");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StockPlan | null>(null);

  const filtered = useMemo(
    () =>
      stocks.filter((item) => {
        const keywordMatch =
          item.stockCode.toLowerCase().includes(search.toLowerCase()) ||
          item.stockName.toLowerCase().includes(search.toLowerCase());
        const statusMatch = status === "全部" || item.status === status;
        return keywordMatch && statusMatch;
      }),
    [search, status, stocks],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>攒股计划管理</CardTitle>
            <p className="text-sm text-muted-foreground">支持搜索、状态筛选、持仓进度和预计股息查看。</p>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            新增股票计划
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="搜索股票代码或名称" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={status} onValueChange={(value) => setStatus(value as StockStatus | "全部")}>
              <SelectTrigger>
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                {statusFilters.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 md:hidden">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border/60 bg-white/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{item.stockName}</div>
                    <div className="text-sm text-muted-foreground">{item.stockCode}</div>
                  </div>
                  <div className="rounded-full bg-secondary px-3 py-1 text-xs">{item.status}</div>
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>
                        {formatNumber(item.holdingShares)} / {formatNumber(item.targetShares)} 股
                      </span>
                      <span>{formatPercent(item.progress)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(item.progress, 100)}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground">现价 / 成本</div>
                      <div className="font-medium">
                        {formatCurrency(item.currentPrice)} / {formatCurrency(item.costPrice)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">持仓市值</div>
                      <div className="font-medium">{formatCurrency(item.marketValue)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">持仓成本</div>
                      <div className="font-medium">{formatCurrency(item.totalHoldingCost)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">目标总资金</div>
                      <div className="font-medium">{formatCurrency(item.estimatedTargetCapital)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">还需资金</div>
                      <div className="font-medium">{formatCurrency(item.remainingTargetCapital)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">持仓盈亏</div>
                      <div className={cn("font-medium", profitTone(item.unrealizedProfitLoss))}>
                        {formatSignedCurrency(item.unrealizedProfitLoss)}
                        <span className="ml-1 text-xs">({formatSignedPercent(item.unrealizedProfitLossRate)})</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">预计年股息</div>
                      <div className="font-medium">
                        {formatCurrency(item.estimatedDividend)}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({formatPercent(item.estimatedDividendYieldOnCost)})
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        达标 {formatCurrency(item.estimatedDividendAtTarget)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setEditing(item);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      编辑
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={async () => {
                        if (window.confirm(`确认删除 ${item.stockName}（${item.stockCode}）吗？`)) {
                          await onDelete(item.id);
                        }
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      删除
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="pb-3">股票</th>
                  <th className="pb-3">状态</th>
                  <th className="pb-3">现价 / 成本</th>
                  <th className="pb-3">进度</th>
                  <th className="pb-3">持仓市值</th>
                  <th className="pb-3">目标资金</th>
                  <th className="pb-3">持仓盈亏</th>
                  <th className="pb-3">预计年股息</th>
                  <th className="pb-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-t border-border/60">
                    <td className="py-4">
                      <div className="font-medium">{item.stockName}</div>
                      <div className="text-muted-foreground">{item.stockCode}</div>
                    </td>
                    <td className="py-4">{item.status}</td>
                    <td className="py-4">
                      <div className="font-medium">{formatCurrency(item.currentPrice)}</div>
                      <div className="text-muted-foreground">{formatCurrency(item.costPrice)}</div>
                    </td>
                    <td className="py-4">
                      <div className="mb-1 flex justify-between text-xs">
                        <span>
                          {formatNumber(item.holdingShares)} / {formatNumber(item.targetShares)}
                        </span>
                        <span>{formatPercent(item.progress)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(item.progress, 100)}%` }} />
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="font-medium">{formatCurrency(item.marketValue)}</div>
                      <div className="text-muted-foreground">成本 {formatCurrency(item.totalHoldingCost)}</div>
                    </td>
                    <td className="py-4">
                      <div className="font-medium">{formatCurrency(item.estimatedTargetCapital)}</div>
                      <div className="text-muted-foreground">还需 {formatCurrency(item.remainingTargetCapital)}</div>
                    </td>
                    <td className={cn("py-4 font-medium", profitTone(item.unrealizedProfitLoss))}>
                      <div>{formatSignedCurrency(item.unrealizedProfitLoss)}</div>
                      <div className="text-xs">{formatSignedPercent(item.unrealizedProfitLossRate)}</div>
                    </td>
                    <td className="py-4">
                      <div className="font-medium">当前 {formatCurrency(item.estimatedDividend)}</div>
                      <div className="text-muted-foreground">达标 {formatCurrency(item.estimatedDividendAtTarget)}</div>
                      <div className="text-muted-foreground">
                        成本收益率 {formatPercent(item.estimatedDividendYieldOnCost)}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditing(item);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            if (window.confirm(`确认删除 ${item.stockName}（${item.stockCode}）吗？`)) {
                              await onDelete(item.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <StockFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={editing}
        submitting={submitting}
        onSubmit={async (values) => {
          if (editing) {
            await onUpdate(editing.id, values);
          } else {
            await onCreate(values);
          }
        }}
      />
    </div>
  );
};
