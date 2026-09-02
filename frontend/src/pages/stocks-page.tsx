import { useMemo, useState } from "react";
import { ExternalLink, History, LayoutDashboard, Pencil, Plus, RefreshCw, Search, Trash2, WalletCards } from "lucide-react";
import { LedgerEntryDialog } from "../components/forms/ledger-entry-dialog";
import { InvestmentPerformanceCharts } from "../components/charts/investment-performance-charts";
import { ListInvestmentDashboard } from "../components/charts/list-investment-dashboard";
import { StockFormDialog } from "../components/forms/stock-form-dialog";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs } from "../components/ui/tabs";
import {
  cn,
  formatCostPrice,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatPrice,
  formatSignedCurrency,
  profitToneClass,
} from "../lib/utils";
import type { DividendRecord, MarketSyncResult, StockPlan, StockStatus, TradeRecord } from "../types";
import { aggregateDividendHistory, formatHoldingPeriod, getCurrentHoldingSince } from "../lib/investment";

const statusFilters = ["全部", "观察中", "建仓中", "持有中", "已暂停"] as const;

const getTonghuashunStockUrl = (stockCode: string) =>
  `https://stockpage.10jqka.com.cn/${encodeURIComponent(stockCode.trim())}/`;

const calculateReturnRate = (profitLoss: number, cost: number) => (cost > 0 ? (profitLoss / cost) * 100 : 0);

const getStatusBadge = (stock: StockPlan) => {
  const statusMap: Record<
    StockStatus,
    {
      className: string;
      dotClassName: string;
    }
  > = {
    观察中: {
      className: "border-sky-200 bg-sky-50 text-sky-700",
      dotClassName: "bg-sky-500",
    },
    建仓中: {
      className: "border-amber-200 bg-amber-50 text-amber-700",
      dotClassName: "bg-amber-500",
    },
    持有中: {
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      dotClassName: "bg-emerald-500",
    },
    已暂停: {
      className: "border-stone-200 bg-stone-100 text-stone-700",
      dotClassName: "bg-stone-500",
    },
  };

  return {
    label: stock.status,
    ...statusMap[stock.status],
  };
};

type StockPayload = Omit<
  StockPlan,
  | "id"
  | "totalHoldingCost"
  | "marketValue"
  | "estimatedTargetCapital"
  | "remainingTargetCapital"
  | "unrealizedProfitLoss"
  | "unrealizedProfitLossRate"
  | "realizedProfitLoss"
  | "dividendIncome"
  | "totalProfitLoss"
  | "isClosed"
  | "hasTradeLedger"
  | "estimatedDividend"
  | "estimatedDividendYieldOnCost"
  | "estimatedDividendYieldOnMarket"
  | "estimatedDividendAtTarget"
  | "estimatedDividendAtTargetYieldOnCapital"
  | "progress"
>;

type TradePayload = Omit<TradeRecord, "id"> & { tradeDate: string };
type DividendPayload = Omit<DividendRecord, "id">;

interface Props {
  stocks: StockPlan[];
  trades: TradeRecord[];
  dividends: DividendRecord[];
  onCreate: (payload: StockPayload) => Promise<void>;
  onUpdate: (id: string, payload: StockPayload) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateTrade: (payload: TradePayload) => Promise<void>;
  onUpdateTrade: (id: string, payload: TradePayload) => Promise<void>;
  onDeleteTrade: (id: string) => Promise<void>;
  onCreateDividend: (payload: DividendPayload) => Promise<void>;
  onUpdateDividend: (id: string, payload: DividendPayload) => Promise<void>;
  onDeleteDividend: (id: string) => Promise<void>;
  onSyncMarkets: (ids: string[]) => Promise<MarketSyncResult>;
  submitting?: boolean;
  tradeSubmitting?: boolean;
  dividendSubmitting?: boolean;
  marketSubmitting?: boolean;
}

export const StocksPage = ({
  stocks,
  trades,
  dividends,
  onCreate,
  onUpdate,
  onDelete,
  onCreateTrade,
  onUpdateTrade,
  onDeleteTrade,
  onCreateDividend,
  onUpdateDividend,
  onDeleteDividend,
  onSyncMarkets,
  submitting,
  tradeSubmitting,
  dividendSubmitting,
  marketSubmitting,
}: Props) => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof statusFilters)[number]>("全部");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StockPlan | null>(null);
  const [ledgerEntryStock, setLedgerEntryStock] = useState<StockPlan | null>(null);
  const [editingTrade, setEditingTrade] = useState<TradeRecord | null>(null);
  const [editingDividend, setEditingDividend] = useState<DividendRecord | null>(null);
  const [ledgerStockId, setLedgerStockId] = useState<string | null>(null);
  const [ledgerTab, setLedgerTab] = useState("trades");
  const [actionMessage, setActionMessage] = useState("");
  const [dashboardOpen, setDashboardOpen] = useState(false);

  const filtered = useMemo(
    () =>
      stocks
        .filter((item) => {
          const keywordMatch =
            item.stockCode.toLowerCase().includes(search.toLowerCase()) ||
            item.stockName.toLowerCase().includes(search.toLowerCase());
          const statusMatch = status === "全部" || item.status === status;
          return keywordMatch && statusMatch;
        })
        .sort(
          (a, b) =>
            b.marketValue - a.marketValue ||
            b.totalHoldingCost - a.totalHoldingCost ||
            a.stockCode.localeCompare(b.stockCode),
        ),
    [search, status, stocks],
  );
  const ledgerStock = useMemo(
    () => stocks.find((item) => item.id === ledgerStockId) ?? null,
    [ledgerStockId, stocks],
  );

  const ledgerTrades = useMemo(
    () => trades.filter((item) => ledgerStock && item.stockCode === ledgerStock.stockCode),
    [ledgerStock, trades],
  );
  const ledgerDividends = useMemo(
    () => dividends.filter((item) => ledgerStock && item.stockCode === ledgerStock.stockCode),
    [dividends, ledgerStock],
  );

  const handleSyncMarketList = async () => {
    if (filtered.length === 0) {
      setActionMessage("当前列表没有可同步的股票。");
      return;
    }

    setActionMessage(`正在同步当前列表 ${filtered.length} 只股票最近收盘价和股息率...`);
    try {
      const result = await onSyncMarkets(filtered.map((item) => item.id));
      const failedText =
        result.failedCount > 0
          ? `，失败 ${result.failedCount} 只：${result.results
              .filter((item) => !item.ok)
              .map((item) => `${item.stockName || item.stockCode}${item.message ? `(${item.message})` : ""}`)
              .join("、")}`
          : "";
      const latestQuote = result.results.find((item) => item.ok && item.quote)?.quote;
      const sourceText = latestQuote
        ? `；行情日期 ${latestQuote.updatedAt || "未知"}，来源 ${latestQuote.provider}`
        : "";
      setActionMessage(
        `同步完成：成功 ${result.successCount}/${result.total} 只，价格更新 ${result.changedCount} 只、未变化 ${result.unchangedCount} 只${failedText}${sourceText}`,
      );
    } catch (error) {
      setActionMessage(error instanceof Error ? `同步失败：${error.message}` : "同步收盘价失败");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>攒股计划管理</CardTitle>
            <p className="text-sm text-muted-foreground">支持搜索、状态筛选、持仓进度、个股流水和预计股息查看。</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setDashboardOpen((open) => !open)}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              {dashboardOpen ? "收起 Dashboard" : "Dashboard"}
            </Button>
            <Button variant="secondary" disabled={marketSubmitting} onClick={() => void handleSyncMarketList()}>
              <RefreshCw className={cn("mr-2 h-4 w-4", marketSubmitting && "animate-spin")} />
              同步当前列表
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              新增股票计划
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {dashboardOpen && (
            <ListInvestmentDashboard
              title="攒股计划整体投资状况"
              currency="CNY"
              positions={filtered.map((item) => ({
                key: item.id,
                name: item.stockName,
                currency: "CNY",
                marketValue: item.marketValue,
                costBasis: item.totalHoldingCost,
                unrealizedProfitLoss: item.unrealizedProfitLoss,
                realizedProfitLoss: item.realizedProfitLoss,
                dividendIncome: item.dividendIncome,
              }))}
              estimatedAnnualDividend={filtered.reduce((sum, item) => sum + item.estimatedDividend, 0)}
            />
          )}
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
          {actionMessage ? (
            <div className="rounded-2xl bg-secondary/70 px-4 py-3 text-sm text-muted-foreground">{actionMessage}</div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-border/60 bg-white/75">
            <div className="hidden border-b border-border/60 bg-secondary/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:grid lg:grid-cols-[1.1fr_1.05fr_1fr_1.1fr_1fr_1fr_0.9fr_96px_104px] lg:items-center lg:gap-4">
              <div>股票</div>
              <div>进度</div>
              <div>现价 / 持仓均价</div>
              <div>持仓市值 / 成本</div>
              <div>持仓盈亏</div>
              <div>历史盈亏</div>
              <div>股息</div>
              <div>状态</div>
              <div className="text-right">操作</div>
            </div>

            <div className="divide-y divide-border/60">
              {filtered.map((item) => {
                const statusBadge = getStatusBadge(item);

                return (
                  <div
                    key={item.id}
                    className="grid gap-4 px-4 py-4 text-sm lg:grid-cols-[1.1fr_1.05fr_1fr_1.1fr_1fr_1fr_0.9fr_96px_104px] lg:items-center lg:gap-4"
                  >
                    <div className="min-w-0">
                      <a
                        className="group inline-flex max-w-full items-center gap-1 truncate font-semibold transition-colors hover:text-primary"
                        href={getTonghuashunStockUrl(item.stockCode)}
                        target="_blank"
                        rel="noreferrer"
                        title={`打开同花顺行情：${item.stockName}（${item.stockCode}）`}
                      >
                        <span className="truncate">{item.stockName}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-70" />
                      </a>
                      <div className="mt-1 text-sm text-muted-foreground">
                        <a
                          className="transition-colors hover:text-primary hover:underline"
                          href={getTonghuashunStockUrl(item.stockCode)}
                          target="_blank"
                          rel="noreferrer"
                          title={`打开同花顺行情：${item.stockName}（${item.stockCode}）`}
                        >
                          {item.stockCode}
                        </a>
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold">{formatNumber(item.holdingShares)} 股</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        目标 {formatNumber(item.targetShares)} 股
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-secondary">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(item.progress, 100)}%` }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 lg:block">
                      <div className="text-sm lg:hidden">现价 / 持仓均价</div>
                      <div>
                        <div className="font-semibold">{formatPrice(item.currentPrice)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">成本 {formatPrice(item.costPrice)}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 lg:block">
                      <div className="text-sm lg:hidden">持仓市值 / 成本</div>
                      <div>
                        <div className="font-semibold">{formatCurrency(item.marketValue)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">成本 {formatCurrency(item.totalHoldingCost)}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 lg:block">
                      <div className="text-sm lg:hidden">持仓盈亏</div>
                      <div>
                        <div className={cn("font-semibold", profitToneClass(item.unrealizedProfitLoss))}>
                          {formatSignedCurrency(item.unrealizedProfitLoss)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          收益率 <span className={profitToneClass(item.unrealizedProfitLossRate)}>{formatPercent(item.unrealizedProfitLossRate)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 lg:block">
                      <div className="text-sm lg:hidden">历史盈亏</div>
                      <div>
                        <div className={cn("font-semibold", profitToneClass(item.realizedProfitLoss))}>
                          {formatSignedCurrency(item.realizedProfitLoss)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          收益率 <span className={profitToneClass(item.realizedProfitLoss)}>{formatPercent(calculateReturnRate(item.realizedProfitLoss,
                            trades
                              .filter((trade) => trade.stockCode.trim() === item.stockCode.trim() && trade.tradeType === "买入")
                              .reduce((sum, trade) => sum + trade.price * trade.shares + trade.fee + trade.tax, 0) - item.totalHoldingCost,
                          ))}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 lg:block">
                      <div className="text-sm lg:hidden">股息</div>
                      <div>
                        <div className="font-semibold">{formatCurrency(item.estimatedDividend)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          历史 <span className="text-red-600">{formatCurrency(item.dividendIncome)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="lg:min-w-[86px]">
                      <div className="mb-1 text-xs text-muted-foreground lg:hidden">状态</div>
                      <div
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                          statusBadge.className,
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", statusBadge.dotClassName)} />
                        {statusBadge.label}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 lg:w-[88px] lg:grid-cols-2 lg:justify-self-end">
                      <Button
                        aria-label={`给 ${item.stockName} 记一笔`}
                        className="h-9 w-9 p-0"
                        title="记一笔"
                        variant="secondary"
                        size="sm"
                        onClick={() => setLedgerEntryStock(item)}
                      >
                        <WalletCards className="h-4 w-4" />
                      </Button>
                      <Button
                        aria-label={`查看 ${item.stockName} 流水`}
                        className="h-9 w-9 p-0"
                        title="流水"
                        variant="secondary"
                        size="sm"
                        onClick={() => setLedgerStockId(item.id)}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        aria-label={`编辑 ${item.stockName}`}
                        className="h-9 w-9 p-0"
                        title="编辑"
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
                        aria-label={`删除 ${item.stockName}`}
                        className="h-9 w-9 p-0"
                        title="删除"
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
                  </div>
                );
              })}

              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">没有匹配的股票计划。</div>
              ) : null}
            </div>
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
      <LedgerEntryDialog
        open={!!ledgerEntryStock}
        onOpenChange={(open) => {
          if (!open) {
            setLedgerEntryStock(null);
            setEditingTrade(null);
            setEditingDividend(null);
          }
        }}
        stock={ledgerEntryStock}
        initialTrade={editingTrade}
        initialDividend={editingDividend}
        submitting={tradeSubmitting || dividendSubmitting}
        onCreateTrade={async (values) => {
          await onCreateTrade(values);
          setLedgerEntryStock(null);
        }}
        onUpdateTrade={async (id, values) => {
          await onUpdateTrade(id, values);
          setEditingTrade(null);
          setLedgerEntryStock(null);
        }}
        onCreateDividend={async (values) => {
          await onCreateDividend(values);
          setLedgerEntryStock(null);
        }}
        onUpdateDividend={async (id, values) => {
          await onUpdateDividend(id, values);
          setEditingDividend(null);
          setLedgerEntryStock(null);
        }}
      />
      <Dialog open={!!ledgerStock} onOpenChange={(open) => !open && setLedgerStockId(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {ledgerStock?.stockName} {ledgerStock ? `(${ledgerStock.stockCode})` : ""} 投资详情
            </DialogTitle>
            <DialogDescription>查看当前投资、收益概况及对应的买卖和分红明细。</DialogDescription>
          </DialogHeader>
          {ledgerStock ? (
            <InvestmentPerformanceCharts
              holdingPeriod={formatHoldingPeriod(
                getCurrentHoldingSince(ledgerTrades.map((item) => ({
                  date: item.tradeDate,
                  type: item.tradeType === "买入" ? "buy" : "sell",
                  quantity: item.shares,
                  createdAt: item.createdAt,
                }))),
                ledgerStock.holdingShares,
              )}
              holdingQuantity={`${formatNumber(ledgerStock.holdingShares)} 股`}
              costPrice={formatCostPrice(ledgerStock.costPrice)}
              currentPrice={formatPrice(ledgerStock.currentPrice)}
              costBasis={ledgerStock.totalHoldingCost}
              marketValue={ledgerStock.marketValue}
              unrealizedProfitLoss={ledgerStock.unrealizedProfitLoss}
              realizedProfitLoss={ledgerStock.realizedProfitLoss}
              dividendIncome={ledgerStock.dividendIncome}
              totalProfitLoss={ledgerStock.totalProfitLoss}
              dividendHistory={aggregateDividendHistory(ledgerDividends.map((item) => ({
                year: item.year,
                value: item.netDividend,
              })))}
              formatValue={formatCurrency}
            />
          ) : null}
          <Tabs
            value={ledgerTab}
            onChange={setLedgerTab}
            items={[
              { label: `交易记录 ${ledgerTrades.length}`, value: "trades" },
              { label: `分红记录 ${ledgerDividends.length}`, value: "dividends" },
            ]}
          />

          <div className="mt-4 max-h-[45vh] overflow-y-auto pr-1">
            {ledgerTab === "trades" ? (
              <div className="space-y-2">
                {ledgerTrades.map((item) => (
                  <div key={item.id} className="rounded-xl bg-secondary/45 px-3 py-2.5 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{item.title}</div>
                        <div className="text-xs text-muted-foreground">{item.tradeDate ?? "-"}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-semibold",
                            item.tradeType === "买入" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700",
                          )}
                        >
                          {item.tradeType}
                        </span>
                        <Button
                          aria-label={`编辑交易记录 ${item.title}`}
                          title="编辑"
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setEditingTrade(item);
                            setEditingDividend(null);
                            setLedgerEntryStock(ledgerStock);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          aria-label={`删除交易记录 ${item.title}`}
                          title="删除"
                          variant="destructive"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={async () => {
                            if (window.confirm(`确认删除交易记录“${item.title}”吗？删除后成本和盈亏会重新计算。`)) {
                              await onDeleteTrade(item.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 grid gap-x-3 gap-y-1 text-xs text-muted-foreground sm:grid-cols-3">
                      <span>价格：{formatCurrency(item.price)}</span>
                      <span>股数：{formatNumber(item.shares)}</span>
                      <span>费用：{formatCurrency(item.fee + item.tax)}</span>
                    </div>
                  </div>
                ))}
                {ledgerTrades.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-white/60 p-4 text-sm text-muted-foreground">
                    暂无交易记录。
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                {ledgerDividends.map((item) => (
                  <div key={item.id} className="rounded-xl bg-secondary/45 px-3 py-2.5 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{item.title}</div>
                        <div className="text-xs text-muted-foreground">年份：{item.year}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">分红</span>
                        <Button
                          aria-label={`编辑分红记录 ${item.title}`}
                          title="编辑"
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setEditingDividend(item);
                            setEditingTrade(null);
                            setLedgerEntryStock(ledgerStock);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          aria-label={`删除分红记录 ${item.title}`}
                          title="删除"
                          variant="destructive"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={async () => {
                            if (window.confirm(`确认删除股息记录“${item.title}”吗？`)) {
                              await onDeleteDividend(item.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 grid gap-x-3 gap-y-1 text-xs text-muted-foreground sm:grid-cols-3">
                      <span>每股：{formatCurrency(item.dividendPerShare)}</span>
                      <span>持仓：{formatNumber(item.holdingShares)}</span>
                      <span>税后：{formatCurrency(item.netDividend)}</span>
                    </div>
                  </div>
                ))}
                {ledgerDividends.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-white/60 p-4 text-sm text-muted-foreground">
                    暂无分红记录。
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
