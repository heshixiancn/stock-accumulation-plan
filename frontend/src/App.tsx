import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw, Settings } from "lucide-react";
import { AppShell } from "./components/layout/app-shell";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Tabs } from "./components/ui/tabs";
import { api } from "./api/client";
import { useDividends } from "./hooks/use-dividends";
import { useNewIssues } from "./hooks/use-new-issues";
import { useOtherInvestments } from "./hooks/use-other-investments";
import { useStocks } from "./hooks/use-stocks";
import { useTrades } from "./hooks/use-trades";
import "./index.css";
import { NewIssuesPage } from "./pages/new-issues-page";
import { OtherInvestmentsPage } from "./pages/other-investments-page";
import { SetupPage } from "./pages/setup-page";
import { SettingsPage } from "./pages/settings-page";
import { StocksPage } from "./pages/stocks-page";

const queryClient = new QueryClient();

const ConfiguredApp = () => {
  const [tab, setTab] = useState("stocks");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [initMessage, setInitMessage] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState("");
  const stocks = useStocks(isInitialized);
  const dividends = useDividends(isInitialized);
  const trades = useTrades(isInitialized);
  const otherInvestments = useOtherInvestments(isInitialized);
  const newIssues = useNewIssues(isInitialized);

  const initializeDatabases = async (manual = false) => {
    setIsInitializing(true);
    setInitMessage(manual ? "正在重新初始化 Notion 数据库..." : "正在检查 Notion 数据库...");

    try {
      const response = await api.init();
      setIsInitialized(true);
      await Promise.all([
        stocks.query.refetch(),
        dividends.query.refetch(),
        trades.query.refetch(),
        otherInvestments.query.refetch(),
        newIssues.query.refetch(),
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

  const refreshCurrentPage = async () => {
    setIsRefreshing(true);
    setRefreshMessage("");
    if (tab === "stocks") {
      trades.clearRefreshError();
    }

    try {
      if (tab === "stocks") {
        await Promise.all([
          stocks.query.refetch({ throwOnError: true }),
          trades.query.refetch({ throwOnError: true }),
          dividends.query.refetch({ throwOnError: true }),
        ]);
      } else if (tab === "other-investments") {
        await otherInvestments.query.refetch({ throwOnError: true });
      } else {
        await newIssues.query.refetch({ throwOnError: true });
      }

      const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
      setRefreshMessage(`数据已刷新（${time}）`);
    } catch (error) {
      setRefreshMessage(error instanceof Error ? `刷新失败：${error.message}` : "刷新数据失败");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onChange={(value) => {
            setTab(value);
            setSettingsOpen(false);
          }}
          items={[
            { label: "攒股计划", value: "stocks" },
            { label: "其他投资", value: "other-investments" },
            { label: "打新收益", value: "new-issues" },
          ]}
        />
        <div className="flex w-full gap-2 sm:w-auto">
          {!settingsOpen && (
            <Button className="flex-1 sm:flex-none" variant="outline" disabled={isRefreshing} onClick={() => void refreshCurrentPage()}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "查询中" : "刷新数据"}
            </Button>
          )}
          <Button
            className="flex-1 sm:flex-none"
            variant={settingsOpen ? "secondary" : "outline"}
            onClick={() => setSettingsOpen((open) => !open)}
          >
            {settingsOpen ? <ArrowLeft className="mr-2 h-4 w-4" /> : <Settings className="mr-2 h-4 w-4" />}
            {settingsOpen ? "返回" : "设置"}
          </Button>
        </div>
      </div>

      {!settingsOpen && refreshMessage && (
        <div className="mb-4 rounded-2xl bg-secondary/70 px-4 py-3 text-sm text-muted-foreground">{refreshMessage}</div>
      )}
      {!settingsOpen && tab === "stocks" && trades.refreshError && (
        <div role="alert" className="mb-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {trades.refreshError}
        </div>
      )}

      {settingsOpen && (
        <SettingsPage
          initMessage={initMessage}
          isInitializing={isInitializing}
          onInitialize={() => void initializeDatabases(true)}
        />
      )}
      {!settingsOpen && tab === "stocks" && (
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
            setRefreshMessage("");
            await trades.createMutation.mutateAsync(payload);
          }}
          onUpdateTrade={async (id, payload) => {
            setRefreshMessage("");
            await trades.updateMutation.mutateAsync({ id, payload });
          }}
          onDeleteTrade={async (id) => {
            setRefreshMessage("");
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
      {!settingsOpen && tab === "other-investments" && (
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
      {!settingsOpen && tab === "new-issues" && (
        <NewIssuesPage
          records={newIssues.query.data ?? []}
          submitting={
            newIssues.createMutation.isPending ||
            newIssues.updateMutation.isPending ||
            newIssues.deleteMutation.isPending
          }
          onCreate={async (payload) => {
            await newIssues.createMutation.mutateAsync(payload);
          }}
          onUpdate={async (id, payload) => {
            await newIssues.updateMutation.mutateAsync({ id, payload });
          }}
          onDelete={async (id) => {
            await newIssues.deleteMutation.mutateAsync(id);
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
