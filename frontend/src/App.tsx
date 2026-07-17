import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "./components/layout/app-shell";
import { Card, CardContent } from "./components/ui/card";
import { Tabs } from "./components/ui/tabs";
import { api } from "./api/client";
import { useDashboard } from "./hooks/use-dashboard";
import { useDividends } from "./hooks/use-dividends";
import { useOtherInvestments } from "./hooks/use-other-investments";
import { useStocks } from "./hooks/use-stocks";
import { useTrades } from "./hooks/use-trades";
import "./index.css";
import { DashboardPage } from "./pages/dashboard-page";
import { OtherInvestmentsPage } from "./pages/other-investments-page";
import { SetupPage } from "./pages/setup-page";
import { SettingsPage } from "./pages/settings-page";
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
  const trades = useTrades(isInitialized);
  const otherInvestments = useOtherInvestments(isInitialized);

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
        trades.query.refetch(),
        otherInvestments.query.refetch(),
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
      <div className="mb-6">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { label: "总览", value: "dashboard" },
            { label: "攒股计划", value: "stocks" },
            { label: "其他投资", value: "other-investments" },
            { label: "设置", value: "settings" },
          ]}
        />
      </div>

      {tab === "dashboard" && dashboard.data && <DashboardPage data={dashboard.data} />}
      {tab === "stocks" && (
        <StocksPage
          stocks={stocks.query.data ?? []}
          trades={trades.query.data ?? []}
          dividends={dividends.query.data ?? []}
          submitting={stocks.createMutation.isPending || stocks.updateMutation.isPending}
          tradeSubmitting={
            trades.createMutation.isPending || trades.updateMutation.isPending || trades.deleteMutation.isPending
          }
          dividendSubmitting={
            dividends.createMutation.isPending || dividends.updateMutation.isPending || dividends.deleteMutation.isPending
          }
          marketSubmitting={stocks.syncMarketMutation.isPending || stocks.syncMarketsMutation.isPending}
          onCreate={async (payload) => {
            await stocks.createMutation.mutateAsync(payload);
          }}
          onUpdate={async (id, payload) => {
            await stocks.updateMutation.mutateAsync({ id, payload });
          }}
          onDelete={async (id) => {
            await stocks.deleteMutation.mutateAsync(id);
          }}
          onCreateTrade={async (payload) => {
            await trades.createMutation.mutateAsync(payload);
          }}
          onUpdateTrade={async (id, payload) => {
            await trades.updateMutation.mutateAsync({ id, payload });
          }}
          onDeleteTrade={async (id) => {
            await trades.deleteMutation.mutateAsync(id);
          }}
          onCreateDividend={async (payload) => {
            await dividends.createMutation.mutateAsync(payload);
          }}
          onUpdateDividend={async (id, payload) => {
            await dividends.updateMutation.mutateAsync({ id, payload });
          }}
          onDeleteDividend={async (id) => {
            await dividends.deleteMutation.mutateAsync(id);
          }}
          onSyncMarkets={async (ids) => {
            return stocks.syncMarketsMutation.mutateAsync(ids);
          }}
        />
      )}
      {tab === "other-investments" && (
        <OtherInvestmentsPage
          data={otherInvestments.query.data}
          submitting={
            otherInvestments.createMutation.isPending ||
            otherInvestments.updateMutation.isPending ||
            otherInvestments.updateAssetMutation.isPending ||
            otherInvestments.deleteMutation.isPending ||
            otherInvestments.deleteAssetMutation.isPending
          }
          marketSubmitting={otherInvestments.syncMarketsMutation.isPending}
          onCreate={async (payload) => {
            await otherInvestments.createMutation.mutateAsync(payload);
          }}
          onUpdate={async (id, payload) => {
            await otherInvestments.updateMutation.mutateAsync({ id, payload });
          }}
          onUpdateAsset={async (id, payload) => {
            await otherInvestments.updateAssetMutation.mutateAsync({ id, payload });
          }}
          onDelete={async (id) => {
            await otherInvestments.deleteMutation.mutateAsync(id);
          }}
          onDeleteAsset={async (id) => {
            await otherInvestments.deleteAssetMutation.mutateAsync(id);
          }}
          onSyncMarkets={async (assets) => {
            return otherInvestments.syncMarketsMutation.mutateAsync(assets);
          }}
        />
      )}
      {tab === "settings" && (
        <SettingsPage
          initMessage={initMessage}
          isInitializing={isInitializing}
          onInitialize={() => void initializeDatabases(true)}
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
