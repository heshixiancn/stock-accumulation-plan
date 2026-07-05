import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { DividendRecord } from "../../types";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

type DividendFormValues = Omit<DividendRecord, "id">;

const emptyValues: DividendFormValues = {
  title: "",
  stockCode: "",
  stockName: "",
  year: new Date().getFullYear(),
  exDividendDate: "",
  paymentDate: "",
  dividendPerShare: 0,
  holdingShares: 0,
  grossDividend: 0,
  netDividend: 0,
  notes: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: DividendRecord | null;
  onSubmit: (values: DividendFormValues) => Promise<void>;
  submitting?: boolean;
}

export const DividendFormDialog = ({ open, onOpenChange, initialData, onSubmit, submitting }: Props) => {
  const form = useForm<DividendFormValues>({
    defaultValues: emptyValues,
  });

  useEffect(() => {
    form.reset(initialData ? { ...initialData } : emptyValues);
  }, [form, initialData, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "编辑股息记录" : "新增股息记录"}</DialogTitle>
          <DialogDescription>税前股息为空时，系统会自动按每股分红 × 持仓股数计算。</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
            onOpenChange(false);
          })}
        >
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">记录标题</span>
            <Input {...form.register("title", { required: true })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">股票代码</span>
            <Input {...form.register("stockCode", { required: true })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">股票名称</span>
            <Input {...form.register("stockName", { required: true })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">年份</span>
            <Input type="number" {...form.register("year", { valueAsNumber: true })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">每股分红</span>
            <Input type="number" step="0.01" {...form.register("dividendPerShare", { valueAsNumber: true })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">持仓股数</span>
            <Input type="number" {...form.register("holdingShares", { valueAsNumber: true })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">税前股息</span>
            <Input type="number" step="0.01" {...form.register("grossDividend", { valueAsNumber: true })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">税后股息</span>
            <Input type="number" step="0.01" {...form.register("netDividend", { valueAsNumber: true })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">除权除息日</span>
            <Input type="date" {...form.register("exDividendDate")} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">到账日期</span>
            <Input type="date" {...form.register("paymentDate")} />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">备注</span>
            <Textarea {...form.register("notes")} />
          </label>
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

