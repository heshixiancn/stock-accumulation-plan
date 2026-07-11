import { useState } from "react";
import { ExternalLink, KeyRound, Loader2, NotebookTabs, ShieldCheck } from "lucide-react";
import { api } from "../api/client";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";

interface Props {
  onConfigured: () => Promise<void> | void;
}

export const SetupPage = ({ onConfigured }: Props) => {
  const [notionToken, setNotionToken] = useState("");
  const [notionParentPageId, setNotionParentPageId] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openExternal = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>首次接入 Notion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="flex gap-3 rounded-lg border border-border/70 bg-white/70 p-4">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <div className="font-medium text-foreground">创建 Integration Token</div>
              <p className="mt-1 leading-6">
                打开 Notion 官方 Integration 页面，新建 Internal Integration，并复制生成的 token。
              </p>
              <Button className="mt-3 w-full sm:w-auto" type="button" onClick={() => openExternal("https://www.notion.so/my-integrations")}>
                <ExternalLink className="mr-2 h-4 w-4" />
                打开 Notion My Integrations
              </Button>
            </div>
          </div>

          <div className="flex gap-3 rounded-lg border border-border/70 bg-white/70 p-4">
            <NotebookTabs className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <div className="font-medium text-foreground">创建承载数据库的页面</div>
              <p className="mt-1 leading-6">
                在 Notion 中新建一个页面，例如“蓝筹攒股计划助手”，将页面分享给刚创建的 Integration，然后复制页面链接或页面 ID。
              </p>
              <Button className="mt-3 w-full sm:w-auto" variant="outline" type="button" onClick={() => openExternal("https://www.notion.so")}>
                <ExternalLink className="mr-2 h-4 w-4" />
                打开 Notion
              </Button>
            </div>
          </div>

          <div className="flex gap-3 rounded-lg border border-border/70 bg-white/70 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <div className="font-medium text-foreground">自动校验并初始化</div>
              <p className="mt-1 leading-6">
                提交后，后端会验证 token 是否能访问该页面，写入运行配置，并自动创建“攒股计划”“交易记录”“股息收入记录”“其他投资标的”和“其他投资记录”五个数据库。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>填写 Notion 配置</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setSubmitting(true);
              setMessage("");

              try {
                const response = await api.saveSetup({ notionToken, notionParentPageId });
                setMessage(response.message);
                await onConfigured();
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "配置失败");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <label className="block space-y-2">
              <span className="text-sm font-medium">NOTION_TOKEN</span>
              <Input
                autoComplete="off"
                inputMode="text"
                placeholder="secret_xxx"
                type="password"
                value={notionToken}
                onChange={(event) => setNotionToken(event.target.value)}
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">NOTION_PARENT_PAGE_ID 或页面链接</span>
              <Input
                autoComplete="off"
                inputMode="text"
                placeholder="可粘贴 Notion 页面 URL"
                value={notionParentPageId}
                onChange={(event) => setNotionParentPageId(event.target.value)}
                required
              />
            </label>
            <Button className="w-full" disabled={submitting} type="submit">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              保存配置并初始化数据库
            </Button>
            {message && <div className="rounded-lg bg-secondary/70 p-3 text-sm text-secondary-foreground">{message}</div>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
