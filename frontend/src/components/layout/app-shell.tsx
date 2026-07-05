import type { ReactNode } from "react";

export const AppShell = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen">
    <main className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pt-8 lg:px-8">{children}</main>
  </div>
);
