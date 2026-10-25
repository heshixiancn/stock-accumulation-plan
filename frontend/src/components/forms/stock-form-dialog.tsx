import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { StockPlan, StockStatus } from "../../types";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";

const statusOptions: StockStatus[] = ["观察中", "建仓中", "持有中", "已暂停"];

type StockFormValues = Omit<
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

const emptyValues: StockFormValues = {
  stockCode: "",
  stockName: "",
  currentPrice: 0,
  costPrice: 0,
  targetShares: 0,
  holdingShares: 0,
  dividendYield: 0,
  dividendPerShare: 0,
  actualDividend: 0,
  status: "观察中",
  notes: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: StockPlan | null;
  onSubmit: (values: StockFormValues) => Promise<void>;
  submitting?: boolean;
}

export const StockFormDialog = ({ open, onOpenChange, initialData, onSubmit, submitting }: Props) => {
  const [errorMessage, setErrorMessage] = useState("");
  const form = useForm<StockFormValues>({
    defaultValues: emptyValues,
  });

  useEffect(() => {
    form.reset(
      initialData
        ? {
            ...initialData,
            dividendYield: initialData.dividendYield * 100,
          }
        : emptyValues,
    );
    setErrorMessage("");
  }, [form, initialData, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "编辑攒股计划" : "新增攒股计划"}</DialogTitle>
          <DialogDescription>所有关键指标会在后端和前端双重计算，避免 Notion 公式异常影响展示。</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit(
            async (values) => {
              setErrorMessage("");
              try {
                await onSubmit({
                  ...values,
                  dividendYield: values.dividendYield > 1 ? values.dividendYield / 100 : values.dividendYield,
                });
                onOpenChange(false);
              } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : "保存失败");
              }
            },
            () => {
              setErrorMessage("请先填写股票代码和股票名称。");
            },
          )}
        >
          <label className="space-y-2">
            <span className="text-sm font-medium">股票代码</span>
            <Input {...form.register("stockCode", { required: "股票代码不能为空" })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">股票名称</span>
            <Input {...form.register("stockName", { required: "股票名称不能为空" })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">当前价格</span>
            <Input type="number" step="0.000001" {...form.register("currentPrice", { valueAsNumber: true })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">成本价</span>
            <Input type="number" step="0.01" {...form.register("costPrice", { valueAsNumber: true })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">目标股数</span>
            <Input type="number" {...form.register("targetShares", { valueAsNumber: true })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">持仓股数</span>
            <Input type="number" {...form.register("holdingShares", { valueAsNumber: true })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">股息率（%）</span>
            <Input
              type="number"
              step="0.01"
              placeholder="例如 5 表示 5%"
              {...form.register("dividendYield", { valueAsNumber: true })}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">每股股息</span>
            <Input
              type="number"
              step="0.01"
              placeholder="可不填，未填时按当前价格 × 股息率估算"
              {...form.register("dividendPerShare", { valueAsNumber: true })}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">实际股息</span>
            <Input type="number" step="0.01" {...form.register("actualDividend", { valueAsNumber: true })} />
          </label>
          <div className="space-y-2">
            <span className="text-sm font-medium">状态</span>
            <Select
              value={form.watch("status")}
              onValueChange={(value) => form.setValue("status", value as StockStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">备注</span>
            <Textarea {...form.register("notes")} />
          </label>
          {errorMessage && (
            <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive md:col-span-2">
              {errorMessage}
            </div>
          )}
          <div className="md:col-span-2 flex justify-end gap-3">
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
