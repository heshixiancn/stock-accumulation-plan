import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { DividendFormDialog } from "../components/forms/dividend-form-dialog";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { formatCurrency } from "../lib/utils";
import type { DividendRecord } from "../types";

interface Props {
  dividends: DividendRecord[];
  onCreate: (payload: Omit<DividendRecord, "id">) => Promise<void>;
  onUpdate: (id: string, payload: Omit<DividendRecord, "id">) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  submitting?: boolean;
}

export const DividendsPage = ({ dividends, onCreate, onUpdate, onDelete, submitting }: Props) => {
  const [yearFilter, setYearFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DividendRecord | null>(null);

  const filtered = useMemo(
    () =>
      dividends.filter((item) => {
        const yearMatch = !yearFilter || String(item.year) === yearFilter;
        const stockMatch =
          !stockFilter ||
          item.stockCode.toLowerCase().includes(stockFilter.toLowerCase()) ||
          item.stockName.toLowerCase().includes(stockFilter.toLowerCase());
        return yearMatch && stockMatch;
      }),
    [dividends, stockFilter, yearFilter],
  );

  const yearlyTotal = filtered.reduce((sum, item) => sum + item.netDividend, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>股息收入记录</CardTitle>
            <p className="text-sm text-muted-foreground">按年份、股票筛选记录，并统计年度和个股累计股息。</p>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            新增股息记录
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="按年份筛选，如 2026" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} />
            <Input placeholder="按股票代码或名称筛选" value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} />
            <div className="rounded-2xl bg-secondary/70 px-4 py-3 text-sm">
              本次筛选税后股息合计：<span className="font-semibold">{formatCurrency(yearlyTotal)}</span>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border/60 bg-white/70 p-4">
                <div>
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.stockName} ({item.stockCode})
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">年份</div>
                    <div className="font-medium">{item.year}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">每股分红</div>
                    <div className="font-medium">{formatCurrency(item.dividendPerShare)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">税前股息</div>
                    <div className="font-medium">{formatCurrency(item.grossDividend)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">税后股息</div>
                    <div className="font-medium">{formatCurrency(item.netDividend)}</div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
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
                      if (window.confirm(`确认删除股息记录“${item.title}”吗？`)) {
                        await onDelete(item.id);
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    删除
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="pb-3">记录</th>
                  <th className="pb-3">年份</th>
                  <th className="pb-3">每股分红</th>
                  <th className="pb-3">税前股息</th>
                  <th className="pb-3">税后股息</th>
                  <th className="pb-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-t border-border/60">
                    <td className="py-4">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-muted-foreground">
                        {item.stockName} ({item.stockCode})
                      </div>
                    </td>
                    <td className="py-4">{item.year}</td>
                    <td className="py-4">{formatCurrency(item.dividendPerShare)}</td>
                    <td className="py-4">{formatCurrency(item.grossDividend)}</td>
                    <td className="py-4">{formatCurrency(item.netDividend)}</td>
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
                            if (window.confirm(`确认删除股息记录“${item.title}”吗？`)) {
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

      <DividendFormDialog
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
