import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { AppShell } from "./components/layout/app-shell";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Tabs } from "./components/ui/tabs";
import { api } from "./api/client";
import { useDashboard } from "./hooks/use-dashboard";
import { useDividends } from "./hooks/use-dividends";
import { useStocks } from "./hooks/use-stocks";
import "./index.css";
import { DashboardPage } from "./pages/dashboard-page";
import { DividendsPage } from "./pages/dividends-page";
import { SetupPage } from "./pages/setup-page";
import { StocksPage } from "./pages/stocks-page";

const queryClient = new QueryClient();

const ConfiguredApp = () => {
  const [tab, setTab] = useState("dashboard");
  const [initMessage, setInitMessage] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const dashboard = useDashboard(isInitialized);
  const stocks = useStocks(isInitialized);
  const dividends = useDividends(isInitialized);

  const initializeDatabases = async (manual = false) => {
    setIsInitializing(true);
    setInitMessage(manual ? "正在重新初始化 Notion 数据库..." : "正在检查 Notion 数据库...");

    try {
      const response = await api.init();
      setIsInitialized(true);
      await Promise.all([
        dashboard.refetch(),
        stocks.query.refetch(),
        dividends.query.refetch(),
      ]);
      const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
      setInitMessage(`${response.message}（${time}）`);
    } catch (error) {
      setIsInitialized(false);
      setInitMessage(error instanceof Error ? `初始化失败：${error.message}` : "初始化失败");
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    void initializeDatabases();
  }, []);

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { label: "Dashboard", value: "dashboard" },
            { label: "攒股计划", value: "stocks" },
            { label: "股息记录", value: "dividends" },
          ]}
        />
        <Button
          variant="secondary"
          disabled={isInitializing}
          onClick={() => void initializeDatabases(true)}
        >
          {isInitializing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {isInitializing ? "初始化中..." : "重新初始化 Notion 数据库"}
        </Button>
      </div>

      <Card className="mb-6 border-primary/15 bg-white/75">
        <CardContent className="flex items-center justify-between gap-3 p-4 text-sm">
          <span>启动状态：{initMessage || "正在检查 Notion 数据库..."}</span>
          <span className="text-muted-foreground">删除操作均带二次确认</span>
        </CardContent>
      </Card>

      {tab === "dashboard" && dashboard.data && <DashboardPage data={dashboard.data} />}
      {tab === "stocks" && (
        <StocksPage
          stocks={stocks.query.data ?? []}
          submitting={stocks.createMutation.isPending || stocks.updateMutation.isPending}
          onCreate={async (payload) => {
            await stocks.createMutation.mutateAsync(payload);
          }}
          onUpdate={async (id, payload) => {
            await stocks.updateMutation.mutateAsync({ id, payload });
          }}
          onDelete={async (id) => {
            await stocks.deleteMutation.mutateAsync(id);
          }}
        />
      )}
      {tab === "dividends" && (
        <DividendsPage
          dividends={dividends.query.data ?? []}
          submitting={dividends.createMutation.isPending || dividends.updateMutation.isPending}
          onCreate={async (payload) => {
            await dividends.createMutation.mutateAsync(payload);
          }}
          onUpdate={async (id, payload) => {
            await dividends.updateMutation.mutateAsync({ id, payload });
          }}
          onDelete={async (id) => {
            await dividends.deleteMutation.mutateAsync(id);
          }}
        />
      )}
    </>
  );
};

const AppContent = () => {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [setupError, setSetupError] = useState("");

  const refreshSetupStatus = async () => {
    try {
      const status = await api.getSetupStatus();
      setConfigured(status.configured);
      setSetupError("");
    } catch (error) {
      setConfigured(false);
      setSetupError(error instanceof Error ? error.message : "读取配置状态失败");
    }
  };

  useEffect(() => {
    void refreshSetupStatus();
  }, []);

  return (
    <AppShell>
      {configured === null && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">正在读取 Notion 配置状态...</CardContent>
        </Card>
      )}
      {configured === false && (
        <div className="space-y-4">
          {setupError && <div className="rounded-lg bg-destructive p-3 text-sm text-destructive-foreground">{setupError}</div>}
          <SetupPage onConfigured={refreshSetupStatus} />
        </div>
      )}
      {configured === true && <ConfiguredApp />}
    </AppShell>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
