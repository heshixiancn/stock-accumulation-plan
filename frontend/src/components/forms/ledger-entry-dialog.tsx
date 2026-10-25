import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { DividendRecord, StockPlan, TradeRecord, TradeType } from "../../types";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";

type EntryType = TradeType | "分红";
type TradeFormValues = Omit<TradeRecord, "id"> & { tradeDate: string };
type DividendFormValues = Omit<DividendRecord, "id">;

const today = () => new Date().toISOString().slice(0, 10);
const currentYear = () => new Date().getFullYear();

const emptyTradeValues: TradeFormValues = {
  title: "",
  stockCode: "",
  stockName: "",
  tradeDate: today(),
  tradeType: "买入",
  price: 0,
  shares: 0,
  fee: 0,
  tax: 0,
  notes: "",
};

const emptyDividendValues: DividendFormValues = {
  title: "",
  stockCode: "",
  stockName: "",
  year: currentYear(),
  exDividendDate: "",
  paymentDate: "",
  dividendPerShare: 0,
  holdingShares: 0,
  grossDividend: 0,
  netDividend: 0,
  notes: "",
};

const getTradePreset = (stock: StockPlan | null, tradeType: TradeType): TradeFormValues => ({
  ...emptyTradeValues,
  stockCode: stock?.stockCode ?? "",
  stockName: stock?.stockName ?? "",
  tradeDate: today(),
  tradeType,
  price: stock?.currentPrice ?? 0,
  shares: tradeType === "卖出" ? Math.max(stock?.holdingShares ?? 1, 1) : 100,
});

const getDividendPreset = (stock: StockPlan | null): DividendFormValues => {
  const dividend = (stock?.holdingShares ?? 0) * (stock?.dividendPerShare ?? 0);

  return {
    ...emptyDividendValues,
    title: `${currentYear()}-${stock?.stockName ?? ""}-分红`,
    stockCode: stock?.stockCode ?? "",
    stockName: stock?.stockName ?? "",
    year: currentYear(),
    holdingShares: stock?.holdingShares ?? 0,
    dividendPerShare: stock?.dividendPerShare ?? 0,
    grossDividend: dividend,
    netDividend: dividend,
  };
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stock: StockPlan | null;
  initialTrade?: TradeRecord | null;
  initialDividend?: DividendRecord | null;
  onCreateTrade: (payload: TradeFormValues) => Promise<void>;
  onCreateDividend: (payload: DividendFormValues) => Promise<void>;
  onUpdateTrade?: (id: string, payload: TradeFormValues) => Promise<void>;
  onUpdateDividend?: (id: string, payload: DividendFormValues) => Promise<void>;
  submitting?: boolean;
}

export const LedgerEntryDialog = ({
  open,
  onOpenChange,
  stock,
  initialTrade,
  initialDividend,
  onCreateTrade,
  onCreateDividend,
  onUpdateTrade,
  onUpdateDividend,
  submitting,
}: Props) => {
  const [entryType, setEntryType] = useState<EntryType>("买入");
  const [errorMessage, setErrorMessage] = useState("");
  const tradeForm = useForm<TradeFormValues>({ defaultValues: emptyTradeValues });
  const dividendForm = useForm<DividendFormValues>({ defaultValues: emptyDividendValues });
  const isEditing = Boolean(initialTrade || initialDividend);
  const lockStockFields = Boolean(stock);

  useEffect(() => {
    if (!open) return;
    setErrorMessage("");

    if (initialDividend) {
      setEntryType("分红");
      dividendForm.reset({
        ...initialDividend,
        exDividendDate: initialDividend.exDividendDate ?? "",
        paymentDate: initialDividend.paymentDate ?? "",
      });
      return;
    }

    if (initialTrade) {
      setEntryType(initialTrade.tradeType);
      tradeForm.reset({ ...initialTrade, tradeDate: initialTrade.tradeDate ?? today() });
      return;
    }

    setEntryType("买入");
    tradeForm.reset(getTradePreset(stock, "买入"));
    dividendForm.reset(getDividendPreset(stock));
  }, [dividendForm, initialDividend, initialTrade, open, stock, tradeForm]);

  const handleEntryTypeChange = (value: EntryType) => {
    setEntryType(value);
    if (value === "分红") {
      dividendForm.reset(getDividendPreset(stock));
      return;
    }
    tradeForm.reset(getTradePreset(stock, value));
  };

  const renderEntryTypeField = () => (
    <label className="space-y-2">
      <span className="text-sm font-medium">记录类型</span>
      {isEditing ? (
        <div className="flex h-10 items-center rounded-xl border border-border bg-secondary/70 px-3 text-sm">{entryType}</div>
      ) : (
        <Select value={entryType} onValueChange={(value) => handleEntryTypeChange(value as EntryType)}>
          <SelectTrigger>
            <SelectValue placeholder="选择记录类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="买入">买入</SelectItem>
            <SelectItem value="卖出">卖出</SelectItem>
            <SelectItem value="分红">分红</SelectItem>
          </SelectContent>
        </Select>
      )}
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {stock ? `${stock.stockName}（${stock.stockCode}）${isEditing ? "编辑记录" : "记一笔"}` : isEditing ? "编辑记录" : "记一笔"}
          </DialogTitle>
          <DialogDescription>选择买入、卖出或分红；买卖写入交易记录，分红写入股息记录。</DialogDescription>
        </DialogHeader>

        {entryType === "分红" ? (
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={dividendForm.handleSubmit(async (values) => {
              setErrorMessage("");
              try {
                if (initialDividend && onUpdateDividend) {
                  await onUpdateDividend(initialDividend.id, values);
                } else {
                  await onCreateDividend(values);
                }
                onOpenChange(false);
              } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : "保存失败");
              }
            })}
          >
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">记录标题</span>
              <Input {...dividendForm.register("title", { required: true })} />
            </label>
            {lockStockFields ? (
              <>
                <input type="hidden" {...dividendForm.register("stockCode", { required: true })} />
                <input type="hidden" {...dividendForm.register("stockName", { required: true })} />
              </>
            ) : (
              <>
                <label className="space-y-2">
                  <span className="text-sm font-medium">股票代码</span>
                  <Input {...dividendForm.register("stockCode", { required: true })} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">股票名称</span>
                  <Input {...dividendForm.register("stockName", { required: true })} />
                </label>
              </>
            )}
            <label className="space-y-2">
              <span className="text-sm font-medium">年份</span>
              <Input type="number" {...dividendForm.register("year", { valueAsNumber: true })} />
            </label>
            {renderEntryTypeField()}
            <label className="space-y-2">
              <span className="text-sm font-medium">每股分红</span>
              <Input type="number" step="0.01" {...dividendForm.register("dividendPerShare", { valueAsNumber: true })} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">持仓股数</span>
              <Input type="number" {...dividendForm.register("holdingShares", { valueAsNumber: true })} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">税前股息</span>
              <Input type="number" step="0.01" {...dividendForm.register("grossDividend", { valueAsNumber: true })} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">税后股息</span>
              <Input type="number" step="0.01" {...dividendForm.register("netDividend", { valueAsNumber: true })} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">除权除息日</span>
              <Input type="date" {...dividendForm.register("exDividendDate")} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">到账日期</span>
              <Input type="date" {...dividendForm.register("paymentDate")} />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">备注</span>
              <Textarea {...dividendForm.register("notes")} />
            </label>
            {errorMessage && <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive md:col-span-2">{errorMessage}</div>}
            <div className="flex justify-end gap-3 md:col-span-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button disabled={submitting} type="submit">
                {submitting ? "保存中..." : "保存"}
              </Button>
            </div>
          </form>
        ) : (
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={tradeForm.handleSubmit(async (values) => {
              setErrorMessage("");
              try {
                const payload = { ...values, tradeType: entryType as TradeType };
                if (initialTrade && onUpdateTrade) {
                  await onUpdateTrade(initialTrade.id, payload);
                } else {
                  await onCreateTrade(payload);
                }
                onOpenChange(false);
              } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : "保存失败");
              }
            })}
          >
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">记录标题（可留空）</span>
              <Input placeholder={`如 ${today()}-${stock?.stockName ?? "股票"}-${entryType}`} {...tradeForm.register("title")} />
            </label>
            {lockStockFields ? (
              <>
                <input type="hidden" {...tradeForm.register("stockCode", { required: true })} />
                <input type="hidden" {...tradeForm.register("stockName", { required: true })} />
              </>
            ) : (
              <>
                <label className="space-y-2">
                  <span className="text-sm font-medium">股票代码</span>
                  <Input {...tradeForm.register("stockCode", { required: true })} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">股票名称</span>
                  <Input {...tradeForm.register("stockName", { required: true })} />
                </label>
              </>
            )}
            <label className="space-y-2">
              <span className="text-sm font-medium">交易日期</span>
              <Input type="date" {...tradeForm.register("tradeDate", { required: true })} />
            </label>
            {renderEntryTypeField()}
            <label className="space-y-2">
              <span className="text-sm font-medium">成交价格</span>
              <Input type="number" step="0.001" min="0.001" {...tradeForm.register("price", { valueAsNumber: true })} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">股数</span>
              <Input type="number" step="1" min="1" {...tradeForm.register("shares", { valueAsNumber: true })} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">手续费</span>
              <Input type="number" step="0.01" min="0" {...tradeForm.register("fee", { valueAsNumber: true })} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">税费</span>
              <Input type="number" step="0.01" min="0" {...tradeForm.register("tax", { valueAsNumber: true })} />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">备注</span>
              <Textarea {...tradeForm.register("notes")} />
            </label>
            {errorMessage && <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive md:col-span-2">{errorMessage}</div>}
            <div className="flex justify-end gap-3 md:col-span-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button disabled={submitting} type="submit">
                {submitting ? "保存中..." : "保存"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
