# stock-accumulator-notion

中文名：蓝筹攒股计划助手

## 技术方案简述

本项目采用前后端分离但统一部署的方案：

- 前端：React + TypeScript + Vite + Tailwind CSS + 自建 shadcn/ui 风格组件
- 图表：Recharts
- 后端：Node.js + Express + TypeScript
- 数据层：Notion SDK（`@notionhq/client`）
- 部署：Docker + docker-compose

生产环境中，后端服务会直接托管前端构建产物，默认通过 `3000` 端口提供完整 Web 服务。

## 项目目录结构

```text
stock-accumulator-notion/
├── frontend/
├── backend/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── README.md
└── docs/
```

## 关键实现说明

### 1. Notion 数据库自动初始化

服务可以在没有 Notion 配置时启动。首次打开页面时，系统会展示 Notion 接入向导，引导你打开 Notion 官方 Integration 页面、创建 token、创建承载数据库的页面，并在粘贴配置后自动校验、保存和初始化数据库。

配置完成后，前端会调用 `POST /api/init`。后端会在 `NOTION_PARENT_PAGE_ID` 指向的父页面下检查是否已有以下数据库：

- `攒股计划`
- `股息收入记录`

如果已存在，则直接复用；如果不存在，则自动创建。识别方式使用数据库标题名称匹配，保证幂等。

### 2. 数据计算策略

以下关键指标由后端与前端同时兜底计算：

- `总持仓成本 = 成本价 × 持仓股数`
- `预计股息 = 持仓股数 × 每股股息`
- `整体进度 = 当前总持仓股数 / 总目标股数`
- 单只股票进度 = `持仓股数 / 目标股数`

这样即使 Notion 内字段被手动修改，也不会影响页面统计结果。

### 3. 首次接入向导

应用提供 `/api/setup/status` 和 `POST /api/setup`：

- 未配置时，首页只显示接入向导，不会请求业务数据。
- 向导提供按钮打开 [Notion My Integrations](https://www.notion.so/my-integrations)。
- 用户创建 Integration Token 后，将 token 粘贴到应用内。
- 用户在 Notion 创建一个页面，并将页面分享给 Integration 后，将页面链接或页面 ID 粘贴到应用内。
- 后端验证 token 对该页面有访问权限后，写入运行配置并自动创建两个数据库。
- 初始化成功后会缓存 `NOTION_STOCK_DATABASE_ID` 和 `NOTION_DIVIDEND_DATABASE_ID`，后续请求直接复用数据库 ID。

Notion 目前不提供让第三方应用直接生成 Internal Integration Token 的公开 API，因此 token 的创建和复制必须由用户在 Notion 官方页面完成。

### 4. 删除保护

前端删除股票计划和股息记录时均使用浏览器二次确认，防止误删。

### 5. Docker 部署

使用多阶段构建：

- 第一阶段安装工作区依赖
- 第二阶段构建前端和后端
- 第三阶段以精简镜像运行服务

## Notion Integration 创建方式

1. 打开 [Notion My Integrations](https://www.notion.so/my-integrations)
2. 点击 `New integration`
3. 输入 Integration 名称，例如：`stock-accumulator-notion`
4. 选择对应 Workspace
5. 创建完成后复制内部 Token

## 如何获取 `NOTION_TOKEN`

在 Integration 详情页复制 `Internal Integration Token`，填入 `.env`：

```env
NOTION_TOKEN=secret_xxx
```

## 如何获取 `NOTION_PARENT_PAGE_ID`

1. 在 Notion 中创建或打开一个用于承载数据库的页面
2. 将该页面共享给刚创建的 Integration
3. 打开页面 URL，例如：

```text
https://www.notion.so/workspace/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=...
```

4. 取其中 32 位页面 ID，作为：

```env
NOTION_PARENT_PAGE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 本地启动方式

1. 复制环境变量文件：

```bash
cp .env.example .env
```

2. 填写你的 Notion 配置：

```env
NOTION_TOKEN=
NOTION_PARENT_PAGE_ID=
NOTION_STOCK_DATABASE_ID=
NOTION_DIVIDEND_DATABASE_ID=
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

3. 安装依赖：

```bash
npm install
```

4. 启动开发环境：

```bash
npm run dev
```

5. 打开：

- 前端开发地址：`http://localhost:5173`
- 后端接口地址：`http://localhost:3000`

## Docker 部署方式

1. 准备 `.env`
2. 执行：

```bash
docker-compose up -d --build
```

3. 访问：

```text
http://localhost:3000
```

也可以不提前创建 `.env`。容器会启动首次接入向导，配置会持久化到宿主机的 `./data/.env`。

## 常见问题

### 1. 为什么初始化失败？

通常是以下原因：

- `NOTION_TOKEN` 错误
- `NOTION_PARENT_PAGE_ID` 错误
- 父页面没有分享给 Integration

### 2. 为什么应用不能自动创建 Notion Token？

Notion 的 Internal Integration Token 属于敏感凭据，必须由 Workspace 用户在 Notion 官方页面创建并复制。当前 Notion 没有提供公开 API 允许第三方应用自动创建该 token。

### 3. 为什么数据库会重复创建？

当前实现通过固定数据库标题检查，正常情况下不会重复创建。若你手动改了数据库标题，系统会将其视为新的数据库。

初始化会优先读取已缓存的数据库 ID；没有缓存时，会在 `NOTION_PARENT_PAGE_ID` 指定页面的直接子数据库中查找标题为 `攒股计划` 和 `股息收入记录` 的数据库。找到后复用，找不到才创建。

### 4. 股息率为什么按小数传值？

后端字段校验使用 `0 ~ 1` 的小数格式，例如：

- `0.045` 表示 `4.5%`

这样可直接映射到 Notion 的 `percent` 数值类型。

## 数据库字段说明

### 攒股计划数据库：`攒股计划`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| 股票代码 | title | 例如 601398 |
| 股票名称 | rich_text | 例如 工商银行 |
| 当前价格 | number | 当前股价 |
| 成本价 | number | 当前持仓平均成本 |
| 目标股数 | number | 计划最终持有股数 |
| 持仓股数 | number | 当前已持有股数 |
| 总持仓成本 | number | 后端计算写入 |
| 股息率 | number(percent) | 小数格式，例如 0.045 |
| 每股股息 | number | 预计每股现金分红 |
| 预计股息 | number | 后端计算写入 |
| 实际股息 | number | 已收到股息 |
| 状态 | select | 观察中 / 建仓中 / 持有中 / 已暂停 |
| 备注 | rich_text | 其他说明 |

### 股息收入记录数据库：`股息收入记录`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| 记录标题 | title | 例如 2026-工商银行-分红 |
| 股票代码 | rich_text | 如 601398 |
| 股票名称 | rich_text | 如 工商银行 |
| 年份 | number | 如 2026 |
| 除权除息日 | date | 可选 |
| 到账日期 | date | 可选 |
| 每股分红 | number | 每股现金分红 |
| 持仓股数 | number | 分红时持有股数 |
| 税前股息 | number | 税前收入 |
| 税后股息 | number | 实际到账 |
| 备注 | rich_text | 其他说明 |

## 接口说明

### 初始化

- `POST /api/init`

### 接入配置

- `GET /api/setup/status`
- `POST /api/setup`

### 攒股计划

- `GET /api/stocks`
- `POST /api/stocks`
- `PUT /api/stocks/:id`
- `DELETE /api/stocks/:id`

### 股息记录

- `GET /api/dividends`
- `POST /api/dividends`
- `PUT /api/dividends/:id`
- `DELETE /api/dividends/:id`

### Dashboard

- `GET /api/dashboard`
