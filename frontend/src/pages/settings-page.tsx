import { useEffect, useState, type ReactNode } from "react";
import { Database, Loader2, Mail, RefreshCw, Save, ShieldAlert } from "lucide-react";
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
