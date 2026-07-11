import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { History, Pencil, Plus, RefreshCw, Search, Trash2, WalletCards } from "lucide-react";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { cn, formatPercent, profitToneClass } from "../lib/utils";
import type {
  OtherInvestmentAssetType,
  OtherInvestmentCurrency,
  OtherInvestmentMarketSyncResult,
  OtherInvestmentMarket,
  OtherInvestmentOverview,
  OtherInvestmentPosition,
  OtherInvestmentRecord,
  OtherInvestmentRecordType,
} from "../types";

const marketOptions: OtherInvestmentMarket[] = ["A股", "美股", "港股"];
const assetTypeOptions: OtherInvestmentAssetType[] = ["股票", "基金", "ETF", "可转债", "其他"];
const currencyOptions: OtherInvestmentCurrency[] = ["CNY", "USD", "HKD"];
const tradeTypeOptions: OtherInvestmentRecordType[] = ["买入", "卖出", "分红"];

type OtherInvestmentPayload = Omit<OtherInvestmentRecord, "id">;
type OtherInvestmentFormValues = OtherInvestmentPayload & { tradeDate: string };
type AssetEditFormValues = {
  assetCode: string;
  assetName: string;
  market: OtherInvestmentMarket;
  assetType: OtherInvestmentAssetType;
  currentPrice: number;
  currency: OtherInvestmentCurrency;
  notes: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyValues: OtherInvestmentFormValues = {
  title: "",
  assetCode: "",
  assetName: "",
  market: "A股",
  assetType: "股票",
  tradeDate: today(),
  tradeType: "买入",
  price: 0,
  quantity: 0,
  fee: 0,
  tax: 0,
  currentPrice: 0,
  currency: "CNY",
  notes: "",
};

const formatMoney = (value: number, currency = "CNY") =>
  new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);

const formatLedgerPrice = (value: number, currency = "CNY") =>
  new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value || 0);

const formatSignedMoney = (value: number, currency = "CNY") => {
  const formatted = formatMoney(Math.abs(value || 0), currency);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
};

const formatQuantity = (value: number, market?: OtherInvestmentMarket) =>
  new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: market === "美股" ? 4 : 0,
    maximumFractionDigits: market === "美股" ? 4 : 0,
  }).format(market === "美股" ? value || 0 : Math.round(value || 0));

const assetTypeBadgeClass = (assetType: OtherInvestmentAssetType) =>
  ({
    股票: "bg-red-50 text-red-700",
    基金: "bg-sky-50 text-sky-700",
    ETF: "bg-amber-50 text-amber-700",
    可转债: "bg-violet-50 text-violet-700",
    其他: "bg-stone-100 text-stone-700",
  })[assetType];

const recordAssetKey = (item: Pick<OtherInvestmentRecord, "market" | "assetCode" | "assetName">) =>
  `${item.market}:${item.assetCode || item.assetName}`;

const positionAssetKey = (item: Pick<OtherInvestmentPosition, "market" | "assetCode" | "assetName">) =>
  `${item.market}:${item.assetCode || item.assetName}`;

const recordDefaultsFromPosition = (position: OtherInvestmentPosition): Partial<OtherInvestmentFormValues> => ({
  title: "",
  assetCode: position.assetCode,
  assetName: position.assetName,
  market: position.market,
  assetType: position.assetType,
  tradeDate: today(),
  tradeType: "买入",
  price: position.currentPrice,
  quantity: 0,
  fee: 0,
  tax: 0,
  currentPrice: position.currentPrice,
  currency: position.currency,
  notes: "",
});

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: OtherInvestmentRecord | null;
  defaults?: Partial<OtherInvestmentFormValues> | null;
  lockAssetFields?: boolean;
  submitting?: boolean;
  onSubmit: (values: OtherInvestmentPayload) => Promise<void>;
}

const OtherInvestmentFormDialog = ({
  open,
  onOpenChange,
  initialData,
  defaults,
  lockAssetFields,
  submitting,
  onSubmit,
}: FormDialogProps) => {
  const [errorMessage, setErrorMessage] = useState("");
  const form = useForm<OtherInvestmentFormValues>({ defaultValues: emptyValues });
  const assetName = form.watch("assetName");
  const assetCode = form.watch("assetCode");
  const market = form.watch("market");
  const recordType = form.watch("tradeType");
  const isDividend = recordType === "分红";
  const quantityStep = market === "美股" ? "0.0001" : "1";
  const quantityMin = market === "美股" ? "0.0001" : "1";
  const assetLabel = [assetName || "当前标的", assetCode ? `(${assetCode})` : ""].join(" ");
  const dialogTitle = initialData
    ? lockAssetFields
      ? `编辑 ${assetLabel} 流水`
      : "编辑交易记录"
    : lockAssetFields
      ? `为 ${assetLabel} 记一笔`
      : "记一笔其他投资";

  useEffect(() => {
    const nextValues = initialData
      ? { ...initialData, tradeDate: initialData.tradeDate ?? today() }
      : { ...emptyValues, ...defaults, tradeDate: defaults?.tradeDate ?? today() };

    form.reset(nextValues);
    setErrorMessage("");
  }, [defaults, form, initialData, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {lockAssetFields
              ? "该流水会归集到当前标的，只需要填写交易或分红信息。"
              : "记录蓝筹攒股计划之外的买入、卖出或分红流水，系统会按标的自动汇总盈亏。"}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit(
            async (values) => {
              setErrorMessage("");
              try {
                await onSubmit(values);
                onOpenChange(false);
              } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : "保存失败");
              }
            },
            () => setErrorMessage(lockAssetFields ? "请填写日期、金额和数量。" : "请填写资产名称、日期、金额和数量。"),
          )}
        >
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">记录标题（可留空）</span>
            <Input placeholder="留空时系统自动生成" {...form.register("title")} />
          </label>
          {!lockAssetFields ? (
            <>
              <label className="space-y-2">
                <span className="text-sm font-medium">资产代码</span>
                <Input placeholder="如 510300 / AAPL / 00700" {...form.register("assetCode")} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">资产名称</span>
                <Input {...form.register("assetName", { required: true })} />
              </label>
              <div className="space-y-2">
                <span className="text-sm font-medium">市场</span>
                <Select
                  value={form.watch("market")}
                  onValueChange={(value) => {
                    form.setValue("market", value as OtherInvestmentMarket);
                    if (value !== "美股") {
                      const quantity = form.getValues("quantity");
                      if (Number.isFinite(quantity)) {
                        form.setValue("quantity", Math.round(quantity || 0));
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择市场" />
                  </SelectTrigger>
                  <SelectContent>
                    {marketOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">资产类型</span>
                <Select
                  value={form.watch("assetType")}
                  onValueChange={(value) => form.setValue("assetType", value as OtherInvestmentAssetType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetTypeOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}
          <label className="space-y-2">
            <span className="text-sm font-medium">{isDividend ? "到账日期" : "交易日期"}</span>
            <Input type="date" {...form.register("tradeDate", { required: true })} />
          </label>
          <div className="space-y-2">
            <span className="text-sm font-medium">记录类型</span>
            <Select value={recordType} onValueChange={(value) => form.setValue("tradeType", value as OtherInvestmentRecordType)}>
              <SelectTrigger>
                <SelectValue placeholder="选择记录类型" />
              </SelectTrigger>
              <SelectContent>
                {tradeTypeOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="space-y-2">
            <span className="text-sm font-medium">{isDividend ? "每份分红" : "成交价格"}</span>
            <Input type="number" step="0.0001" min="0.0001" {...form.register("price", { valueAsNumber: true })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">{isDividend ? "持有数量" : "数量"}</span>
            <Input type="number" step={quantityStep} min={quantityMin} {...form.register("quantity", { valueAsNumber: true })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">手续费</span>
            <Input type="number" step="0.0001" min="0" {...form.register("fee", { valueAsNumber: true })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">税费</span>
            <Input type="number" step="0.0001" min="0" {...form.register("tax", { valueAsNumber: true })} />
          </label>
          {!lockAssetFields ? (
            <>
              <label className="space-y-2">
                <span className="text-sm font-medium">当前价格</span>
                <Input type="number" step="0.0001" min="0" {...form.register("currentPrice", { valueAsNumber: true })} />
              </label>
              <div className="space-y-2">
                <span className="text-sm font-medium">币种</span>
                <Select value={form.watch("currency")} onValueChange={(value) => form.setValue("currency", value as OtherInvestmentCurrency)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择币种" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">备注</span>
            <Textarea {...form.register("notes")} />
          </label>
          {errorMessage ? (
            <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive md:col-span-2">
              {errorMessage}
            </div>
          ) : null}
          <div className="flex justify-end gap-3 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button disabled={submitting} type="submit">
              {submitting ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface AssetEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position?: OtherInvestmentPosition | null;
  submitting?: boolean;
  onSubmit: (values: AssetEditFormValues) => Promise<void>;
}

const AssetEditDialog = ({ open, onOpenChange, position, submitting, onSubmit }: AssetEditDialogProps) => {
  const [errorMessage, setErrorMessage] = useState("");
  const form = useForm<AssetEditFormValues>({
    defaultValues: {
      assetCode: "",
      assetName: "",
      market: "A股",
      assetType: "股票",
      currentPrice: 0,
      currency: "CNY",
      notes: "",
    },
  });

  useEffect(() => {
    form.reset({
      assetCode: position?.assetCode ?? "",
      assetName: position?.assetName ?? "",
      market: position?.market ?? "A股",
      assetType: position?.assetType ?? "股票",
      currentPrice: position?.currentPrice ?? 0,
      currency: position?.currency ?? "CNY",
      notes: position?.notes ?? "",
    });
    setErrorMessage("");
  }, [form, open, position]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑标的信息</DialogTitle>
          <DialogDescription>会同步更新该标的下所有交易流水的基础信息，不会改动成交价格、数量和费用。</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit(
            async (values) => {
              setErrorMessage("");
              try {
                await onSubmit(values);
                onOpenChange(false);
              } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : "保存失败");
              }
            },
            () => setErrorMessage("请填写资产名称。"),
          )}
        >
          <label className="space-y-2">
            <span className="text-sm font-medium">资产代码</span>
            <Input placeholder="如 510300 / AAPL / 00700" {...form.register("assetCode")} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">资产名称</span>
            <Input {...form.register("assetName", { required: true })} />
          </label>
          <div className="space-y-2">
            <span className="text-sm font-medium">市场</span>
            <Select value={form.watch("market")} onValueChange={(value) => form.setValue("market", value as OtherInvestmentMarket)}>
              <SelectTrigger>
                <SelectValue placeholder="选择市场" />
              </SelectTrigger>
              <SelectContent>
                {marketOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">资产类型</span>
            <Select
              value={form.watch("assetType")}
              onValueChange={(value) => form.setValue("assetType", value as OtherInvestmentAssetType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                {assetTypeOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="space-y-2">
            <span className="text-sm font-medium">当前价格</span>
            <Input type="number" step="0.0001" min="0" {...form.register("currentPrice", { valueAsNumber: true })} />
          </label>
          <div className="space-y-2">
            <span className="text-sm font-medium">币种</span>
            <Select value={form.watch("currency")} onValueChange={(value) => form.setValue("currency", value as OtherInvestmentCurrency)}>
              <SelectTrigger>
                <SelectValue placeholder="选择币种" />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">备注</span>
            <Textarea {...form.register("notes")} />
          </label>
          {errorMessage ? (
            <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive md:col-span-2">
              {errorMessage}
            </div>
          ) : null}
          <div className="flex justify-end gap-3 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button disabled={submitting} type="submit">
              {submitting ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface Props {
  data?: OtherInvestmentOverview;
  submitting?: boolean;
  marketSubmitting?: boolean;
  onCreate: (payload: OtherInvestmentPayload) => Promise<void>;
  onUpdate: (id: string, payload: OtherInvestmentPayload) => Promise<void>;
  onUpdateAsset: (id: string, payload: AssetEditFormValues) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDeleteAsset: (id: string) => Promise<void>;
  onSyncMarkets: (
    assets: Array<Pick<OtherInvestmentPosition, "assetCode" | "assetName" | "market" | "currency">>,
  ) => Promise<OtherInvestmentMarketSyncResult>;
}

export const OtherInvestmentsPage = ({
  data,
  submitting,
  marketSubmitting,
  onCreate,
  onUpdate,
  onUpdateAsset,
  onDelete,
  onDeleteAsset,
  onSyncMarkets,
}: Props) => {
  const [search, setSearch] = useState("");
  const [market, setMarket] = useState<(typeof marketOptions)[number]>("A股");
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OtherInvestmentRecord | null>(null);
  const [recordDefaults, setRecordDefaults] = useState<Partial<OtherInvestmentFormValues> | null>(null);
  const [recordAssetLocked, setRecordAssetLocked] = useState(false);
  const [ledgerPosition, setLedgerPosition] = useState<OtherInvestmentPosition | null>(null);
  const [ledgerTab, setLedgerTab] = useState("trades");
  const [assetEditPosition, setAssetEditPosition] = useState<OtherInvestmentPosition | null>(null);
  const [actionMessage, setActionMessage] = useState("");

  const positions = data?.positions ?? [];
  const records = data?.records ?? [];
  const normalizedSearch = search.trim().toLowerCase();

  const recordsByAssetKey = useMemo(() => {
    const grouped = new Map<string, OtherInvestmentRecord[]>();

    for (const record of records) {
      const key = recordAssetKey(record);
      grouped.set(key, [...(grouped.get(key) ?? []), record]);
    }

    return grouped;
  }, [records]);

  const filteredPositions = useMemo(
    () =>
      positions.filter((item) => {
        const keywordMatch =
          !normalizedSearch ||
          item.assetCode.toLowerCase().includes(normalizedSearch) ||
          item.assetName.toLowerCase().includes(normalizedSearch);
        const marketMatch = item.market === market;
        return keywordMatch && marketMatch;
      }),
    [market, normalizedSearch, positions],
  );

  const ledgerRecords = useMemo(() => {
    if (!ledgerPosition) return [];
    return recordsByAssetKey.get(positionAssetKey(ledgerPosition)) ?? [];
  }, [ledgerPosition, recordsByAssetKey]);
  const ledgerTradeRecords = useMemo(() => ledgerRecords.filter((item) => item.tradeType !== "分红"), [ledgerRecords]);
  const ledgerDividendRecords = useMemo(() => ledgerRecords.filter((item) => item.tradeType === "分红"), [ledgerRecords]);

  const openBlankRecordDialog = () => {
    setEditingRecord(null);
    setRecordDefaults(null);
    setRecordAssetLocked(false);
    setRecordDialogOpen(true);
  };

  const openRecordDialogForPosition = (position: OtherInvestmentPosition) => {
    setEditingRecord(null);
    setRecordDefaults(recordDefaultsFromPosition(position));
    setRecordAssetLocked(true);
    setRecordDialogOpen(true);
  };

  const deletePositionRecords = async (position: OtherInvestmentPosition) => {
    const positionRecords = recordsByAssetKey.get(positionAssetKey(position)) ?? [];

    if (window.confirm(`确认删除 ${position.assetName} 的标的信息和全部 ${positionRecords.length} 条流水吗？该操作不可恢复。`)) {
      await onDeleteAsset(position.id);
    }
  };

  const handleSyncMarketList = async () => {
    if (filteredPositions.length === 0) {
      setActionMessage(`当前 ${market} 列表没有可同步的标的。`);
      return;
    }

    setActionMessage(`正在同步当前 ${market} 列表 ${filteredPositions.length} 个标的最近收盘价...`);
    try {
      const result = await onSyncMarkets(
        filteredPositions.map((item) => ({
          assetCode: item.assetCode,
          assetName: item.assetName,
          market: item.market,
          currency: item.currency,
        })),
      );
      const failedText =
        result.failedCount > 0
          ? `，失败 ${result.failedCount} 个：${result.results
              .filter((item) => !item.ok)
              .map((item) => `${item.assetName || item.assetCode}${item.message ? `(${item.message})` : ""}`)
              .join("、")}`
          : "";
      const successText = result.successCount > 0 ? "，成功标的当前价格已刷新" : "";
      setActionMessage(`同步完成：成功 ${result.successCount}/${result.total} 个${successText}${failedText}`);
    } catch (error) {
      setActionMessage(error instanceof Error ? `同步失败：${error.message}` : "同步价格失败");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">其他投资</h2>
          <p className="text-sm text-muted-foreground">按市场管理蓝筹攒股计划之外的 A 股、美股、港股交易和盈亏。</p>
        </div>
        <Button onClick={openBlankRecordDialog}>
          <Plus className="mr-2 h-4 w-4" />
          新增投资记录
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-white/75">
        <div className="border-b border-border/60 bg-white/85 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="inline-flex w-full rounded-2xl bg-secondary/55 p-1 sm:w-auto">
              {marketOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMarket(item)}
                  className={cn(
                    "flex-1 rounded-xl px-5 py-2 text-sm font-semibold transition sm:min-w-[96px]",
                    market === item ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row xl:min-w-[560px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder={`搜索${market}资产代码或名称`} value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
              <Button variant="secondary" disabled={marketSubmitting} onClick={() => void handleSyncMarketList()}>
                <RefreshCw className={cn("mr-2 h-4 w-4", marketSubmitting && "animate-spin")} />
                同步价格
              </Button>
            </div>
          </div>
          {actionMessage ? <div className="mt-3 rounded-2xl bg-secondary/70 px-4 py-3 text-sm text-muted-foreground">{actionMessage}</div> : null}
        </div>

            <div className="hidden border-b border-border/60 bg-secondary/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:grid lg:grid-cols-[1.05fr_0.8fr_0.85fr_0.95fr_1.05fr_1.1fr_96px_104px] lg:items-center lg:gap-4">
              <div>标的</div>
              <div>类型</div>
              <div>现价 / 成本</div>
              <div>持仓</div>
              <div>持仓市值</div>
              <div>盈亏</div>
              <div>状态</div>
              <div className="text-right">操作</div>
            </div>

            <div className="divide-y divide-border/60">
              {filteredPositions.map((item) => {
                const positionRecords = recordsByAssetKey.get(positionAssetKey(item)) ?? [];

                return (
                  <div
                    key={positionAssetKey(item)}
                    className="grid gap-4 px-4 py-4 text-sm lg:grid-cols-[1.05fr_0.8fr_0.85fr_0.95fr_1.05fr_1.1fr_96px_104px] lg:items-center lg:gap-4"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{item.assetName}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>{item.assetCode || "-"}</span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{item.currency}</span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{positionRecords.length} 笔流水</span>
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 text-xs text-muted-foreground lg:hidden">类型</div>
                      <span className={cn("rounded-full px-2 py-1 text-xs font-semibold", assetTypeBadgeClass(item.assetType))}>
                        {item.assetType}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 lg:block">
                      <div className="text-xs text-muted-foreground lg:hidden">现价 / 成本</div>
                      <div className="font-medium">{formatLedgerPrice(item.currentPrice, item.currency)}</div>
                      <div className="text-xs text-muted-foreground lg:mt-1">成本 {formatLedgerPrice(item.costPrice, item.currency)}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 lg:block">
                      <div className="text-xs text-muted-foreground lg:hidden">持仓</div>
                      <div className="font-medium">{formatQuantity(item.holdingQuantity, item.market)}</div>
                      <div className="text-xs text-muted-foreground lg:mt-1">最新 {item.latestTradeDate ?? "-"}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 lg:block">
                      <div className="text-xs text-muted-foreground lg:hidden">持仓市值</div>
                      <div className="font-medium">{formatMoney(item.marketValue, item.currency)}</div>
                      <div className="text-xs text-muted-foreground lg:mt-1">成本 {formatMoney(item.costBasis, item.currency)}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 lg:block">
                      <div className="text-xs text-muted-foreground lg:hidden">盈亏</div>
                      <div className={cn("font-medium", profitToneClass(item.unrealizedProfitLoss))}>
                        持仓 {formatSignedMoney(item.unrealizedProfitLoss, item.currency)}
                      </div>
                      <div className={cn("text-xs lg:mt-1", profitToneClass(item.totalProfitLoss))}>
                        总计 {formatSignedMoney(item.totalProfitLoss, item.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground lg:mt-1">
                        收益率 {formatPercent(item.totalProfitLossRate)}
                      </div>
                    </div>

                    <div className="lg:min-w-[86px]">
                      <div className="mb-1 text-xs text-muted-foreground lg:hidden">状态</div>
                      <div
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                          item.isClosed
                            ? "border-stone-200 bg-stone-50 text-stone-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700",
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", item.isClosed ? "bg-stone-500" : "bg-emerald-500")} />
                        {item.isClosed ? "已清仓" : "持有中"}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 lg:w-[88px] lg:grid-cols-2 lg:justify-self-end">
                      <Button
                        aria-label={`给 ${item.assetName} 记一笔`}
                        className="h-9 w-9 p-0"
                        title="记一笔"
                        variant="secondary"
                        size="sm"
                        onClick={() => openRecordDialogForPosition(item)}
                      >
                        <WalletCards className="h-4 w-4" />
                      </Button>
                      <Button
                        aria-label={`查看 ${item.assetName} 流水`}
                        className="h-9 w-9 p-0"
                        title="流水"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setLedgerTab("trades");
                          setLedgerPosition(item);
                        }}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        aria-label={`编辑 ${item.assetName} 标的信息`}
                        className="h-9 w-9 p-0"
                        title="编辑标的"
                        variant="outline"
                        size="sm"
                        onClick={() => setAssetEditPosition(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        aria-label={`删除 ${item.assetName}`}
                        className="h-9 w-9 p-0"
                        title="删除"
                        variant="destructive"
                        size="sm"
                        onClick={() => void deletePositionRecords(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {filteredPositions.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">没有匹配的其他投资标的。</div>
              ) : null}
            </div>
          </div>

      <OtherInvestmentFormDialog
        open={recordDialogOpen}
        onOpenChange={(open) => {
          setRecordDialogOpen(open);
          if (!open) {
            setEditingRecord(null);
            setRecordDefaults(null);
            setRecordAssetLocked(false);
          }
        }}
        initialData={editingRecord}
        defaults={recordDefaults}
        lockAssetFields={recordAssetLocked}
        submitting={submitting}
        onSubmit={async (values) => {
          if (editingRecord) {
            await onUpdate(editingRecord.id, values);
          } else {
            await onCreate(values);
          }
        }}
      />

      <AssetEditDialog
        open={!!assetEditPosition}
        onOpenChange={(open) => {
          if (!open) {
            setAssetEditPosition(null);
          }
        }}
        position={assetEditPosition}
        submitting={submitting}
        onSubmit={async (values) => {
          if (!assetEditPosition) return;
          await onUpdateAsset(assetEditPosition.id, values);
        }}
      />

      <Dialog open={!!ledgerPosition} onOpenChange={(open) => !open && setLedgerPosition(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {ledgerPosition?.assetName} {ledgerPosition?.assetCode ? `(${ledgerPosition.assetCode})` : ""} 流水
            </DialogTitle>
            <DialogDescription>查看该标的的买入、卖出和分红记录。新增记录可在列表点击“记一笔”。</DialogDescription>
          </DialogHeader>
          <Tabs
            value={ledgerTab}
            onChange={setLedgerTab}
            items={[
              { label: `交易记录 ${ledgerTradeRecords.length}`, value: "trades" },
              { label: `分红记录 ${ledgerDividendRecords.length}`, value: "dividends" },
            ]}
          />

          <div className="mt-4 max-h-[72vh] overflow-y-auto pr-1">
            {ledgerTab === "trades" ? (
              <div className="space-y-2">
                {ledgerTradeRecords.map((item) => (
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
                          aria-label={`编辑 ${item.title}`}
                          title="编辑"
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setEditingRecord(item);
                            setRecordDefaults(null);
                            setRecordAssetLocked(true);
                            setRecordDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          aria-label={`删除 ${item.title}`}
                          title="删除"
                          variant="destructive"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={async () => {
                            if (window.confirm(`确认删除交易记录“${item.title}”吗？删除后盈亏会重新计算。`)) {
                              await onDelete(item.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 grid gap-x-3 gap-y-1 text-xs text-muted-foreground sm:grid-cols-3">
                      <span>价格：{formatLedgerPrice(item.price, ledgerPosition?.currency ?? item.currency)}</span>
                      <span>数量：{formatQuantity(item.quantity, item.market)}</span>
                      <span>费用：{formatMoney(item.fee + item.tax, ledgerPosition?.currency ?? item.currency)}</span>
                    </div>
                    {item.notes ? <div className="mt-1 text-xs text-muted-foreground">备注：{item.notes}</div> : null}
                  </div>
                ))}
                {ledgerTradeRecords.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-white/60 p-4 text-sm text-muted-foreground">暂无交易记录。</div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                {ledgerDividendRecords.map((item) => {
                  const currency = ledgerPosition?.currency ?? item.currency;
                  const netDividend = item.price * item.quantity - item.fee - item.tax;
                  return (
	                    <div key={item.id} className="rounded-xl bg-secondary/45 px-3 py-2.5 text-sm">
	                      <div className="flex items-start justify-between gap-3">
	                        <div className="min-w-0">
	                          <div className="truncate font-medium">{item.title}</div>
	                          <div className="text-xs text-muted-foreground">{item.tradeDate ?? "-"}</div>
	                        </div>
	                        <div className="flex shrink-0 items-center gap-2">
	                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">分红</span>
	                          <Button
	                            aria-label={`编辑 ${item.title}`}
	                            title="编辑"
	                            variant="outline"
	                            size="sm"
	                            className="h-8 w-8 p-0"
	                            onClick={() => {
	                              setEditingRecord(item);
	                              setRecordDefaults(null);
	                              setRecordAssetLocked(true);
	                              setRecordDialogOpen(true);
	                            }}
	                          >
	                            <Pencil className="h-4 w-4" />
	                          </Button>
	                          <Button
	                            aria-label={`删除 ${item.title}`}
	                            title="删除"
	                            variant="destructive"
	                            size="sm"
	                            className="h-8 w-8 p-0"
	                            onClick={async () => {
	                              if (window.confirm(`确认删除分红记录“${item.title}”吗？删除后盈亏会重新计算。`)) {
	                                await onDelete(item.id);
	                              }
	                            }}
	                          >
	                            <Trash2 className="h-4 w-4" />
	                          </Button>
	                        </div>
	                      </div>
	                      <div className="mt-2 grid gap-x-3 gap-y-1 text-xs text-muted-foreground sm:grid-cols-3">
	                        <span>每份：{formatLedgerPrice(item.price, currency)}</span>
	                        <span>持有：{formatQuantity(item.quantity, item.market)}</span>
	                        <span>税后：{formatMoney(netDividend, currency)}</span>
	                      </div>
	                      {item.notes ? <div className="mt-1 text-xs text-muted-foreground">备注：{item.notes}</div> : null}
	                    </div>
	                  );
	                })}
	                {ledgerDividendRecords.length === 0 ? (
	                  <div className="rounded-xl border border-dashed border-border bg-white/60 p-4 text-sm text-muted-foreground">暂无分红记录。</div>
	                ) : null}
	              </div>
	            )}
	          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
