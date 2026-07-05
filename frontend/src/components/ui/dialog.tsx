import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent = ({ children, className }: { children: ReactNode; className?: string }) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-sm" />
    <DialogPrimitive.Content
      className={cn(
        "fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-1rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/60 bg-white p-5 shadow-soft sm:w-[calc(100%-2rem)] sm:p-6",
        className,
      )}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-secondary">
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
);

export const DialogHeader = ({ children }: { children: ReactNode }) => <div className="mb-4 space-y-1">{children}</div>;
export const DialogTitle = ({ children }: { children: ReactNode }) => <h3 className="text-lg font-semibold">{children}</h3>;
export const DialogDescription = ({ children }: { children: ReactNode }) => (
  <p className="text-sm text-muted-foreground">{children}</p>
);
