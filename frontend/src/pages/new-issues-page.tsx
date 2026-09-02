import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import type { IpoPayload } from "../hooks/use-new-issues";
import {
  cn,
  formatCurrencyByCurrency,
  formatNumber,
  formatPercent,
  formatSignedCurrencyByCurrency,
  profitToneClass,
} from "../lib/utils";
import type { IpoCurrency, IpoIssueType, IpoMarket, IpoRecord, IpoStatus } from "../types";

const marketOptions: IpoMarket[] = ["A股", "港股"];
const issueTypeOptions: IpoIssueType[] = ["新股", "新债"];
const statusOptions: IpoStatus[] = ["申购中", "未中签", "持有中", "已卖出"];

type MarketFilter = IpoMarket | "全部市场";
type IssueTypeFilter = IpoIssueType | "全部类型";
type StatusFilter = IpoStatus | "全部状态";

type IpoFormValues = Omit<IpoPayload, "subscriptionDate" | "listingDate" | "saleDate"> & {
  subscriptionDate: string;
  listingDate: string;
  saleDate: string;
};

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const emptyValues: IpoFormValues = {
  title: "",
  securityCode: "",
  securityName: "",
  market: "A股",
  issueType: "新股",
  status: "申购中",
  subscriptionDate: today(),
  listingDate: "",
  saleDate: "",
  subscribedQuantity: 0,
  allottedQuantity: 0,
  issuePrice: 0,
  salePrice: 0,
  fees: 0,
  financingInterest: 0,
  currency: "CNY",
  notes: "",
};

const currencyForMarket = (market: IpoMarket): IpoCurrency => (market === "港股" ? "HKD" : "CNY");
const quantityUnit = (issueType: IpoIssueType) => (issueType === "新债" ? "张" : "股");

const issueTypeBadgeClass = (market: IpoMarket, issueType: IpoIssueType) => {
  if (market === "港股") return "bg-sky-50 text-sky-700";
  return issueType === "新债" ? "bg-violet-50 text-violet-700" : "bg-red-50 text-red-700";
};

const statusBadgeClass = (status: IpoStatus) =>
  ({
    申购中: { wrapper: "border-sky-200 bg-sky-50 text-sky-700", dot: "bg-sky-500" },
    未中签: { wrapper: "border-stone-200 bg-stone-50 text-stone-700", dot: "bg-stone-500" },
    持有中: { wrapper: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
    已卖出: { wrapper: "border-violet-200 bg-violet-50 text-violet-700", dot: "bg-violet-500" },
  })[status];

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: IpoRecord | null;
  submitting?: boolean;
  onSubmit: (payload: IpoPayload) => Promise<void>;
}

const NewIssueFormDialog = ({ open, onOpenChange, initialData, submitting, onSubmit }: FormDialogProps) => {
  const form = useForm<IpoFormValues>({ defaultValues: emptyValues });
  const [errorMessage, setErrorMessage] = useState("");
  const market = form.watch("market");
  const issueType = form.watch("issueType");
  const status = form.watch("status");
  const hasAllotment = status === "持有中" || status === "已卖出";
  const isSold = status === "已卖出";
  const unit = quantityUnit(issueType);

  useEffect(() => {
    if (initialData) {
      const {
        id: _id,
        investedAmount: _investedAmount,
        saleProceeds: _saleProceeds,
        profitLoss: _profitLoss,
        returnRate: _returnRate,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        ...payload
      } = initialData;

      form.reset({
        ...payload,
        subscriptionDate: payload.subscriptionDate ?? today(),
        listingDate: payload.listingDate ?? "",
        saleDate: payload.saleDate ?? "",
      });
    } else {
      form.reset({ ...emptyValues, subscriptionDate: today() });
    }
    setErrorMessage("");
  }, [form, initialData, open]);

  const handleMarketChange = (value: IpoMarket) => {
    const previousIssueType = form.getValues("issueType");
    const previousIssuePrice = form.getValues("issuePrice");
    form.setValue("market", value);
    form.setValue("currency", currencyForMarket(value));
    if (value === "港股") {
      form.setValue("issueType", "新股");
      if (previousIssueType === "新债" && previousIssuePrice === 100) {
        form.setValue("issuePrice", 0);
      }
    } else {
      form.setValue("financingInterest", 0);
    }
  };

  const handleIssueTypeChange = (value: IpoIssueType) => {
    const previousIssueType = form.getValues("issueType");
    const previousIssuePrice = form.getValues("issuePrice");
    form.setValue("issueType", value);
    if (value === "新债") {
      form.setValue("issuePrice", 100);
    } else if (previousIssueType === "新债" && previousIssuePrice === 100) {
      form.setValue("issuePrice", 0);
    }
  };

  const handleStatusChange = (value: IpoStatus) => {
    form.setValue("status", value);
    if (value === "申购中" || value === "未中签") {
      form.setValue("allottedQuantity", 0);
      form.setValue("listingDate", "");
      form.setValue("saleDate", "");
      form.setValue("salePrice", 0);
    } else if (value === "持有中") {
      form.setValue("saleDate", "");
      form.setValue("salePrice", 0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "编辑打新记录" : "新增打新记录"}</DialogTitle>
          <DialogDescription>记录 A 股新股、新债或港股新股的申购、中签和卖出结果，收益由系统自动计算。</DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit(
            async (values) => {
              setErrorMessage("");

              if (values.market === "港股" && values.issueType !== "新股") {
                setErrorMessage("港股打新只支持新股。");
                return;
              }
              if (values.allottedQuantity > values.subscribedQuantity) {
                setErrorMessage("中签数量不能大于申购数量。");
                return;
              }
              if (hasAllotment && values.allottedQuantity <= 0) {
                setErrorMessage("持有中或已卖出的记录必须填写大于 0 的中签数量。");
                return;
              }
              if (isSold && (!values.saleDate || values.salePrice <= 0)) {
                setErrorMessage("已卖出的记录必须填写卖出日期和卖出价格。");
                return;
              }

              const payload: IpoPayload = {
                ...values,
                title: values.title.trim(),
                securityCode: values.securityCode.trim(),
                securityName: values.securityName.trim(),
                issueType: values.market === "港股" ? "新股" : values.issueType,
                subscriptionDate: values.subscriptionDate,
                listingDate: hasAllotment && values.listingDate ? values.listingDate : null,
                saleDate: isSold && values.saleDate ? values.saleDate : null,
                allottedQuantity: hasAllotment ? values.allottedQuantity : 0,
                salePrice: isSold ? values.salePrice : 0,
                financingInterest: values.market === "港股" ? values.financingInterest : 0,
                currency: currencyForMarket(values.market),
                notes: values.notes.trim(),
              };

              try {
                await onSubmit(payload);
                onOpenChange(false);
              } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : "保存失败");
              }
            },
            () => setErrorMessage("请完整填写证券代码、名称、申购日期、申购数量和发行价格。"),
          )}
        >
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">记录标题（可留空）</span>
            <Input placeholder="留空时系统自动生成" {...form.register("title")} />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">证券代码</span>
            <Input
              placeholder={market === "港股" ? "如 02500" : issueType === "新债" ? "如 123456" : "如 301001"}
              {...form.register("securityCode", { required: true })}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">证券名称</span>
            <Input {...form.register("securityName", { required: true })} />
          </label>

          <div className="space-y-2">
            <span className="text-sm font-medium">市场</span>
            <Select value={market} onValueChange={(value) => handleMarketChange(value as IpoMarket)}>
              <SelectTrigger><SelectValue placeholder="选择市场" /></SelectTrigger>
              <SelectContent>
                {marketOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">发行类型</span>
            {market === "港股" ? (
              <div className="flex h-10 items-center rounded-xl border border-border bg-secondary/55 px-3 text-sm">新股</div>
            ) : (
              <Select value={issueType} onValueChange={(value) => handleIssueTypeChange(value as IpoIssueType)}>
                <SelectTrigger><SelectValue placeholder="选择类型" /></SelectTrigger>
                <SelectContent>
                  {issueTypeOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">状态</span>
            <Select value={status} onValueChange={(value) => handleStatusChange(value as IpoStatus)}>
              <SelectTrigger><SelectValue placeholder="选择状态" /></SelectTrigger>
              <SelectContent>
                {statusOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <label className="space-y-2">
            <span className="text-sm font-medium">币种</span>
            <input type="hidden" {...form.register("currency")} />
            <div className="flex h-10 items-center rounded-xl border border-border bg-secondary/55 px-3 text-sm">
              {currencyForMarket(market)}
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">申购日期</span>
            <Input type="date" {...form.register("subscriptionDate", { required: true })} />
          </label>
          {hasAllotment ? (
            <label className="space-y-2">
              <span className="text-sm font-medium">上市日期（可留空）</span>
              <Input type="date" {...form.register("listingDate")} />
            </label>
          ) : <div className="hidden md:block" />}

          <label className="space-y-2">
            <span className="text-sm font-medium">申购数量（{unit}）</span>
            <Input
              type="number"
              min="1"
              step="1"
              {...form.register("subscribedQuantity", { required: true, valueAsNumber: true, min: 1 })}
            />
          </label>
          {hasAllotment ? (
            <label className="space-y-2">
              <span className="text-sm font-medium">{market === "港股" ? "获配" : "中签"}数量（{unit}）</span>
              <Input
                type="number"
                min="1"
                step="1"
                {...form.register("allottedQuantity", { required: true, valueAsNumber: true, min: 1 })}
              />
            </label>
          ) : <div className="hidden md:block" />}

          <label className="space-y-2">
            <span className="text-sm font-medium">发行价格</span>
            <Input
              type="number"
              min="0.0001"
              step="0.0001"
              {...form.register("issuePrice", { required: true, valueAsNumber: true, min: 0.0001 })}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">手续费</span>
            <Input type="number" min="0" step="0.01" {...form.register("fees", { valueAsNumber: true, min: 0 })} />
          </label>

          {market === "港股" ? (
            <label className="space-y-2">
              <span className="text-sm font-medium">融资利息</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                {...form.register("financingInterest", { valueAsNumber: true, min: 0 })}
              />
            </label>
          ) : null}

          {isSold ? (
            <>
              <label className="space-y-2">
                <span className="text-sm font-medium">卖出日期</span>
                <Input type="date" {...form.register("saleDate", { required: true })} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">卖出价格</span>
                <Input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  {...form.register("salePrice", { required: true, valueAsNumber: true, min: 0.0001 })}
                />
              </label>
            </>
          ) : null}

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">备注</span>
            <Textarea placeholder="可记录券商账户、融资方式或其他说明" {...form.register("notes")} />
          </label>

          {errorMessage ? (
            <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive md:col-span-2">{errorMessage}</div>
          ) : null}

          <div className="flex justify-end gap-3 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button disabled={submitting} type="submit">{submitting ? "保存中..." : "保存"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface Props {
  records: IpoRecord[];
  submitting?: boolean;
  onCreate: (payload: IpoPayload) => Promise<void>;
  onUpdate: (id: string, payload: IpoPayload) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const NewIssuesPage = ({ records, submitting, onCreate, onUpdate, onDelete }: Props) => {
  const [search, setSearch] = useState("");
  const [market, setMarket] = useState<MarketFilter>("全部市场");
  const [issueType, setIssueType] = useState<IssueTypeFilter>("全部类型");
  const [status, setStatus] = useState<StatusFilter>("全部状态");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<IpoRecord | null>(null);
  const [actionMessage, setActionMessage] = useState("");

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return records
      .filter((item) => item.market !== "港股" || item.issueType === "新股")
      .filter((item) => market === "全部市场" || item.market === market)
      .filter((item) => issueType === "全部类型" || item.issueType === issueType)
      .filter((item) => status === "全部状态" || item.status === status)
      .filter(
        (item) =>
          !keyword ||
          item.securityCode.toLowerCase().includes(keyword) ||
          item.securityName.toLowerCase().includes(keyword) ||
          item.title.toLowerCase().includes(keyword) ||
          item.notes.toLowerCase().includes(keyword),
      )
      .sort(
        (a, b) =>
          (b.subscriptionDate ?? "").localeCompare(a.subscriptionDate ?? "") ||
          a.securityCode.localeCompare(b.securityCode),
      );
  }, [issueType, market, records, search, status]);

  const summary = useMemo(() => {
    const settled = filtered.filter((item) => item.status !== "申购中");
    const allottedCount = settled.filter((item) => item.allottedQuantity > 0).length;

    return {
      recordCount: filtered.length,
      settledCount: settled.length,
      allottedCount,
      allotmentRate: settled.length > 0 ? (allottedCount / settled.length) * 100 : 0,
      aShareProfit: filtered
        .filter((item) => item.market === "A股")
        .reduce((sum, item) => sum + item.profitLoss, 0),
      hkProfit: filtered
        .filter((item) => item.market === "港股")
        .reduce((sum, item) => sum + item.profitLoss, 0),
    };
  }, [filtered]);

  const summaryCards = [
    {
      label: "记录数",
      value: `${summary.recordCount} 条`,
      detail: "当前筛选范围",
      icon: ClipboardList,
    },
    {
      label: "中签率",
      value: formatPercent(summary.allotmentRate),
      detail: `${summary.allottedCount} 次中签 / ${summary.settledCount} 次已公布`,
      icon: Target,
    },
    {
      label: "A股收益",
      value: formatSignedCurrencyByCurrency(summary.aShareProfit, "CNY"),
      detail: "新股与新债 · CNY",
      valueClassName: profitToneClass(summary.aShareProfit),
      icon: CircleDollarSign,
    },
    {
      label: "港股收益",
      value: formatSignedCurrencyByCurrency(summary.hkProfit, "HKD"),
      detail: "港股新股 · HKD",
      valueClassName: profitToneClass(summary.hkProfit),
      icon: CalendarDays,
    },
  ];

  const handleMarketFilterChange = (value: MarketFilter) => {
    setMarket(value);
    if (value === "港股") {
      setIssueType("新股");
    }
  };

  const openCreateDialog = () => {
    setEditing(null);
    setActionMessage("");
    setDialogOpen(true);
  };

  const handleDelete = async (record: IpoRecord) => {
    if (!window.confirm(`确认删除 ${record.securityName} 的打新记录吗？该操作不可恢复。`)) return;

    setActionMessage("");
    try {
      await onDelete(record.id);
    } catch (error) {
      setActionMessage(error instanceof Error ? `删除失败：${error.message}` : "删除失败");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">打新收益记录</h2>
          <p className="text-sm text-muted-foreground">记录 A 股新股、新债及港股新股的申购、中签、卖出和净收益。</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          新增打新记录
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center justify-between gap-3 p-5">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className={cn("mt-2 truncate text-xl font-semibold", item.valueClassName)}>{item.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
              </div>
              <div className="shrink-0 rounded-2xl bg-secondary p-3 text-secondary-foreground">
                <item.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-white/75">
        <div className="border-b border-border/60 bg-white/85 p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_160px_160px_160px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="搜索证券代码、名称、标题或备注"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={market} onValueChange={(value) => handleMarketFilterChange(value as MarketFilter)}>
              <SelectTrigger><SelectValue placeholder="市场筛选" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="全部市场">全部市场</SelectItem>
                {marketOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={issueType} onValueChange={(value) => setIssueType(value as IssueTypeFilter)}>
              <SelectTrigger><SelectValue placeholder="类型筛选" /></SelectTrigger>
              <SelectContent>
                {market !== "港股" ? <SelectItem value="全部类型">全部类型</SelectItem> : null}
                {(market === "港股" ? issueTypeOptions.filter((item) => item === "新股") : issueTypeOptions).map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
              <SelectTrigger><SelectValue placeholder="状态筛选" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="全部状态">全部状态</SelectItem>
                {statusOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {actionMessage ? (
            <div className="mt-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{actionMessage}</div>
          ) : null}
        </div>

        <div className="hidden border-b border-border/60 bg-secondary/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:grid lg:grid-cols-[1.15fr_0.8fr_0.9fr_1fr_1.1fr_1fr_1fr_96px_88px] lg:items-center lg:gap-4">
          <div>标的</div>
          <div>市场 / 类型</div>
          <div>申购 / 中签</div>
          <div>发行 / 卖出价</div>
          <div>投入 / 回款</div>
          <div>申购 / 上市日</div>
          <div>收益</div>
          <div>状态</div>
          <div className="text-right">操作</div>
        </div>

        <div className="divide-y divide-border/60">
          {filtered.map((item) => {
            const unit = quantityUnit(item.issueType);
            const badge = statusBadgeClass(item.status);
            const totalFees = item.fees + item.financingInterest;

            return (
              <div
                key={item.id}
                className="grid gap-4 px-4 py-4 text-sm lg:grid-cols-[1.15fr_0.8fr_0.9fr_1fr_1.1fr_1fr_1fr_96px_88px] lg:items-center lg:gap-4"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold" title={item.securityName}>{item.securityName}</div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {item.securityCode || "暂无代码"}{item.title ? ` · ${item.title}` : ""}
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-xs text-muted-foreground lg:hidden">市场 / 类型</div>
                  <div className="text-xs text-muted-foreground">{item.market}</div>
                  <span className={cn("mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold", issueTypeBadgeClass(item.market, item.issueType))}>
                    {item.issueType}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 lg:block">
                  <div className="text-xs text-muted-foreground lg:hidden">申购 / 中签</div>
                  <div>
                    <div className="font-semibold">{formatNumber(item.subscribedQuantity)} {unit}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.market === "港股" ? "获配" : "中签"} {formatNumber(item.allottedQuantity)} {unit}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1 lg:block">
                  <div className="text-xs text-muted-foreground lg:hidden">发行 / 卖出价</div>
                  <div>
                    <div className="font-semibold">{formatCurrencyByCurrency(item.issuePrice, item.currency)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      卖出 {item.status === "已卖出" ? formatCurrencyByCurrency(item.salePrice, item.currency) : "—"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1 lg:block">
                  <div className="text-xs text-muted-foreground lg:hidden">投入 / 回款</div>
                  <div>
                    <div className="font-semibold">{formatCurrencyByCurrency(item.investedAmount, item.currency)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.status === "已卖出"
                        ? `回款 ${formatCurrencyByCurrency(item.saleProceeds, item.currency)}`
                        : `费用 ${formatCurrencyByCurrency(totalFees, item.currency)}`}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1 lg:block">
                  <div className="text-xs text-muted-foreground lg:hidden">申购 / 上市日</div>
                  <div>
                    <div className="font-medium">{item.subscriptionDate ?? "—"}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.saleDate ? `卖出 ${item.saleDate}` : `上市 ${item.listingDate ?? "—"}`}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1 lg:block">
                  <div className="text-xs text-muted-foreground lg:hidden">收益</div>
                  <div>
                    <div className={cn("font-semibold", profitToneClass(item.profitLoss))}>
                      {formatSignedCurrencyByCurrency(item.profitLoss, item.currency)}
                    </div>
                    <div className={cn("mt-1 text-xs", profitToneClass(item.returnRate))}>
                      收益率 {item.investedAmount > 0 ? formatPercent(item.returnRate) : "—"}
                    </div>
                  </div>
                </div>

                <div className="lg:min-w-[86px]">
                  <div className="mb-1 text-xs text-muted-foreground lg:hidden">状态</div>
                  <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold", badge.wrapper)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", badge.dot)} />
                    {item.status}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 lg:w-[88px] lg:justify-self-end">
                  <Button
                    aria-label={`编辑 ${item.securityName}`}
                    className="h-9 w-9 p-0"
                    title="编辑"
                    variant="outline"
                    size="sm"
                    disabled={submitting}
                    onClick={() => {
                      setEditing(item);
                      setActionMessage("");
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    aria-label={`删除 ${item.securityName}`}
                    className="h-9 w-9 p-0"
                    title="删除"
                    variant="destructive"
                    size="sm"
                    disabled={submitting}
                    onClick={() => void handleDelete(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              暂无匹配的打新记录，点击“新增打新记录”开始记录。
            </div>
          ) : null}
        </div>
      </div>

      <NewIssueFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        initialData={editing}
        submitting={submitting}
        onSubmit={async (payload) => {
          if (editing) {
            await onUpdate(editing.id, payload);
          } else {
            await onCreate(payload);
          }
        }}
      />
    </div>
  );
};
