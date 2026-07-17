import { Database, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

interface SettingsPageProps {
  initMessage: string;
  isInitializing: boolean;
  onInitialize: () => void;
}

export const SettingsPage = ({ initMessage, isInitializing, onInitialize }: SettingsPageProps) => (
  <div className="space-y-5">
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">设置</h2>
      <p className="mt-1 text-sm text-muted-foreground">集中放置低频维护操作，避免在日常记账时误触。</p>
    </div>

    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
            <Database className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <CardTitle>Notion 数据库维护</CardTitle>
            <p className="text-sm text-muted-foreground">
              用于检查并补齐项目需要的 Notion 数据库。日常同步行情、记账、查看收益不需要执行这个操作。
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-4 w-4" />
            适用场景
          </div>
          <ul className="space-y-1">
            <li>首次配置 Notion 后需要创建数据库。</li>
            <li>新增功能后需要补建新的数据库。</li>
            <li>更换 Notion Token 或承载页面后需要重新检查。</li>
            <li>本地保存的数据库 ID 失效时用于修复。</li>
          </ul>
        </div>

        {initMessage && (
          <div className="rounded-2xl border border-border bg-white/70 p-4 text-sm text-muted-foreground">
            最近状态：{initMessage}
          </div>
        )}

        <Button className="w-full sm:w-auto" variant="secondary" disabled={isInitializing} onClick={onInitialize}>
          {isInitializing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {isInitializing ? "检查中..." : "检查并修复 Notion 数据库"}
        </Button>
      </CardContent>
    </Card>
  </div>
);
