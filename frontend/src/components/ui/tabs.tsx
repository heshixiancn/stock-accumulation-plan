import { cn } from "../../lib/utils";

interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  items: Array<{ label: string; value: string }>;
}

export const Tabs = ({ value, onChange, items }: TabsProps) => (
  <div className="inline-flex flex-wrap rounded-2xl border border-white/50 bg-white/70 p-1 shadow-soft">
    {items.map((item) => (
      <button
        key={item.value}
        type="button"
        onClick={() => onChange(item.value)}
        className={cn(
          "rounded-2xl px-4 py-2 text-sm font-medium transition sm:min-w-[120px]",
          value === item.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {item.label}
      </button>
    ))}
  </div>
);
