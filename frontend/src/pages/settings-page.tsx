import { useEffect, useState, type ReactNode } from "react";
import { Database, Download, Loader2, Mail, RefreshCw, Save, ShieldAlert, Upload } from "lucide-react";
import { api } from "../api/client";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import type { EmailReportConfigPayload } from "../types";

interface SettingsPageProps {
  initMessage: string;
  isInitializing: boolean;
  onInitialize: () => void;
}

const defaultEmailConfig: EmailReportConfigPayload = {
  enabled: false,
  time: "18:00",
  timezone: "Asia/Shanghai",
  smtpHost: "",
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: "",
  smtpPassword: "",
  emailFrom: "",
  emailTo: "",
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="space-y-1.5 text-sm">
    <span className="font-medium text-foreground">{label}</span>
    {children}
  </label>
);

export const SettingsPage = ({ initMessage, isInitializing, onInitialize }: SettingsPageProps) => {
  const [emailConfig, setEmailConfig] = useState<EmailReportConfigPayload>(defaultEmailConfig);
  const [passwordConfigured, setPasswordConfigured] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [emailLoading, setEmailLoading] = useState(true);
  const [emailSaving, setEmailSaving] = useState(false);
  const [exportSource, setExportSource] = useState<"notion" | "mysql">("mysql");
  const [importTarget, setImportTarget] = useState<"notion" | "mysql">("mysql");
  const [dataMessage, setDataMessage] = useState("");
  const [dataWorking, setDataWorking] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await api.getEmailReportConfig();
        setEmailConfig({
          enabled: config.enabled,
          time: config.time,
          timezone: config.timezone,
          smtpHost: config.smtpHost,
          smtpPort: config.smtpPort,
          smtpSecure: config.smtpSecure,
          smtpUser: config.smtpUser,
          smtpPassword: "",
          emailFrom: config.emailFrom,
          emailTo: config.emailTo,
        });
        setPasswordConfigured(config.smtpPasswordConfigured);
      } catch (error) {
        setEmailMessage(error instanceof Error ? `读取邮件配置失败：${error.message}` : "读取邮件配置失败");
      } finally {
        setEmailLoading(false);
      }
    };

    void loadConfig();
  }, []);

  const updateEmailConfig = <K extends keyof EmailReportConfigPayload>(key: K, value: EmailReportConfigPayload[K]) => {
    setEmailConfig((current) => ({ ...current, [key]: value }));
  };

  const saveEmailConfig = async () => {
    setEmailSaving(true);
    try {
      const payload = {
        ...emailConfig,
        smtpPassword: emailConfig.smtpPassword?.trim() || undefined,
      };
      const response = await api.saveEmailReportConfig(payload);
      setPasswordConfigured(passwordConfigured || Boolean(payload.smtpPassword));
      setEmailConfig((current) => ({ ...current, smtpPassword: "" }));
      setEmailMessage(response.message);
    } catch (error) {
      setEmailMessage(error instanceof Error ? `保存失败：${error.message}` : "保存失败");
    } finally {
      setEmailSaving(false);
    }
  };

  const summarizeImported = (imported: Record<string, number>) =>
    `股票 ${imported.stocks ?? 0}，交易 ${imported.trades ?? 0}，股息 ${imported.dividends ?? 0}，其他标的 ${imported.otherInvestmentAssets ?? 0}，其他流水 ${imported.otherInvestmentRecords ?? 0}，打新 ${imported.newIssueRecords ?? 0}`;

  const exportData = async () => {
    setDataWorking(true);
    try {
      const blob = await api.exportData(exportSource);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `stock-accumulation-${exportSource}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDataMessage(`${exportSource === "mysql" ? "MySQL" : "Notion"} 数据已导出。`);
    } catch (error) {
      setDataMessage(error instanceof Error ? `导出失败：${error.message}` : "导出失败");
    } finally {
      setDataWorking(false);
    }
  };

  const importData = async (file: File | null) => {
    if (!file) return;
    setDataWorking(true);
    try {
      const payload = JSON.parse(await file.text()) as unknown;
      const response = await api.importData(importTarget, payload);
      setDataMessage(`${response.message}：${summarizeImported(response.imported)}`);
    } catch (error) {
      setDataMessage(error instanceof Error ? `导入失败：${error.message}` : "导入失败");
    } finally {
      setDataWorking(false);
    }
  };

  const syncMysqlToNotion = async () => {
    if (!window.confirm("确认将 MySQL 当前数据同步到 Notion 吗？当前同步为追加导入，目标 Notion 已有相同数据时可能重复。")) {
      return;
    }

    setDataWorking(true);
    try {
      const response = await api.syncMysqlToNotion();
      setDataMessage(`${response.message}：${summarizeImported(response.imported)}`);
    } catch (error) {
      setDataMessage(error instanceof Error ? `同步失败：${error.message}` : "同步失败");
    } finally {
      setDataWorking(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">设置</h2>
        <p className="mt-1 text-sm text-muted-foreground">集中放置低频维护操作，避免在日常记账时误触。</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
              <Mail className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>每日邮件报告</CardTitle>
              <p className="text-sm text-muted-foreground">配置 SMTP 后，服务会每天发送一次投资汇总报告。</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailLoading ? (
            <div className="text-sm text-muted-foreground">正在读取邮件配置...</div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="启用状态">
                  <Select
                    value={emailConfig.enabled ? "true" : "false"}
                    onValueChange={(value) => updateEmailConfig("enabled", value === "true")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">关闭</SelectItem>
                      <SelectItem value="true">启用</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="发送时间">
                  <Input
                    type="time"
                    value={emailConfig.time}
                    onChange={(event) => updateEmailConfig("time", event.target.value)}
                  />
                </Field>
                <Field label="时区">
                  <Input value={emailConfig.timezone} onChange={(event) => updateEmailConfig("timezone", event.target.value)} />
                </Field>
                <Field label="SMTP 主机">
                  <Input value={emailConfig.smtpHost} onChange={(event) => updateEmailConfig("smtpHost", event.target.value)} />
                </Field>
                <Field label="SMTP 端口">
                  <Input
                    type="number"
                    value={emailConfig.smtpPort}
                    onChange={(event) => updateEmailConfig("smtpPort", Number(event.target.value))}
                  />
                </Field>
                <Field label="安全连接">
                  <Select
                    value={emailConfig.smtpSecure ? "true" : "false"}
                    onValueChange={(value) => updateEmailConfig("smtpSecure", value === "true")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">STARTTLS / 587</SelectItem>
                      <SelectItem value="true">SSL / 465</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="SMTP 用户">
                  <Input value={emailConfig.smtpUser} onChange={(event) => updateEmailConfig("smtpUser", event.target.value)} />
                </Field>
                <Field label={passwordConfigured ? "SMTP 密码（留空保持不变）" : "SMTP 密码"}>
                  <Input
                    type="password"
                    value={emailConfig.smtpPassword}
                    placeholder={passwordConfigured ? "已保存，留空不修改" : ""}
                    onChange={(event) => updateEmailConfig("smtpPassword", event.target.value)}
                  />
                </Field>
                <Field label="发件人">
                  <Input value={emailConfig.emailFrom} onChange={(event) => updateEmailConfig("emailFrom", event.target.value)} />
                </Field>
                <Field label="收件人">
                  <Input
                    value={emailConfig.emailTo}
                    placeholder="多个收件人用英文逗号分隔"
                    onChange={(event) => updateEmailConfig("emailTo", event.target.value)}
                  />
                </Field>
              </div>

              {emailMessage && (
                <div className="rounded-2xl border border-border bg-white/70 p-4 text-sm text-muted-foreground">
                  {emailMessage}
                </div>
              )}

              <Button className="w-full sm:w-auto" disabled={emailSaving} onClick={saveEmailConfig}>
                {emailSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {emailSaving ? "保存中..." : "保存邮件配置"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
              <Database className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>数据导入导出</CardTitle>
              <p className="text-sm text-muted-foreground">导出 Notion 或 MySQL 为 JSON，也可以从 JSON 导入到指定数据源。</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="导出来源">
              <Select value={exportSource} onValueChange={(value) => setExportSource(value as "notion" | "mysql")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="notion">Notion</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="导入目标">
              <Select value={importTarget} onValueChange={(value) => setImportTarget(value as "notion" | "mysql")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="notion">Notion</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button disabled={dataWorking} onClick={exportData}>
              {dataWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              导出 JSON
            </Button>
            <label className="inline-flex">
              <input
                className="hidden"
                type="file"
                accept="application/json,.json"
                disabled={dataWorking}
                onChange={(event) => {
                  void importData(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
              <span className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90">
                {dataWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                选择 JSON 并导入
              </span>
            </label>
            <Button variant="secondary" disabled={dataWorking} onClick={syncMysqlToNotion}>
              {dataWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              MySQL 同步到 Notion
            </Button>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
            当前导入和同步不会去重。目标数据源已有相同数据时，重复导入会产生重复记录。
          </div>

          {dataMessage && (
            <div className="rounded-2xl border border-border bg-white/70 p-4 text-sm text-muted-foreground">
              {dataMessage}
            </div>
          )}
        </CardContent>
      </Card>

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
};
