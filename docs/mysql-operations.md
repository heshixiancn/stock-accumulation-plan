# MySQL 运维说明

目标实例：`10.126.126.10:3306`

本项目建议使用独立 schema：`stock_accumulation_plan`。共享 MySQL 实例中，不同项目使用不同 schema 和不同应用用户，避免权限交叉。

## 1. 建库、建用户、授权

使用管理员账号执行：

```bash
mysql -h 10.126.126.10 -P 3306 -u root -p < ops/mysql/00-create-database-user.sql
```

执行前请把脚本中的 `CHANGE_ME_STRONG_PASSWORD` 改成真实强密码。

授权策略：

- 应用用户：`stock_accumulation_plan_app`
- 权限范围：仅 `stock_accumulation_plan.*`
- 权限内容：`SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX`

`CREATE/ALTER/INDEX` 是为了允许应用启动时通过 `/api/init` 自动补齐表结构。若生产环境希望更严格，可以由 DBA 先执行 `ops/mysql/01-schema.sql`，然后把应用用户权限收敛为 `SELECT, INSERT, UPDATE, DELETE`。

## 2. 创建应用表

管理员或具备 schema DDL 权限的账号执行：

```bash
mysql -h 10.126.126.10 -P 3306 -u stock_accumulation_plan_app -p stock_accumulation_plan < ops/mysql/01-schema.sql
```

也可以配置应用为 MySQL 数据源后，在前端初始化或调用 `POST /api/init` 自动建表。

`ops/mysql/01-schema.sql` 包含表级和字段级 COMMENT。若表已经在旧版本脚本下创建过，需要额外执行：

```bash
mysql -h 10.126.126.10 -P 3306 -u stock_accumulation_plan_app -p stock_accumulation_plan < ops/mysql/02-add-comments.sql
```

## 3. 应用配置

```env
DATA_SOURCE=mysql
MYSQL_HOST=10.126.126.10
MYSQL_PORT=3306
MYSQL_DATABASE=stock_accumulation_plan
MYSQL_USER=stock_accumulation_plan_app
MYSQL_PASSWORD=真实密码
```

## 4. 备份

脚本会读取环境变量，默认连接 `10.126.126.10:3306` 和 `stock_accumulation_plan`：

```bash
MYSQL_PASSWORD=真实密码 ./scripts/mysql-backup.sh
```

输出文件默认位于 `./backups/mysql/*.sql.gz`。

也可以覆盖备份目录：

```bash
MYSQL_PASSWORD=真实密码 BACKUP_DIR=/data/backups/stock ./scripts/mysql-backup.sh
```

## 5. 恢复

先确认目标 schema 已存在，再执行：

```bash
MYSQL_PASSWORD=真实密码 ./scripts/mysql-restore.sh ./backups/mysql/stock_accumulation_plan-YYYYMMDD-HHMMSS.sql.gz
```

恢复会把 dump 中的数据导入当前 `MYSQL_DATABASE`。跨环境迁移时，建议先在空 schema 中恢复并验证应用页面，再切换正式配置。

## 6. Notion 与 MySQL 数据迁移

脚本按“导入到空目标库/空目标 Notion 页面”设计，不做去重和覆盖。迁移前建议先备份目标数据源。

Notion 导入 MySQL：

```bash
npm --workspace backend run data:migrate:notion-to-mysql
```

MySQL 导出到 Notion：

```bash
npm --workspace backend run data:migrate:mysql-to-notion
```

两种迁移都会先生成一份 JSON 快照到 `./backups/`，再写入目标数据源。

也可以只做 JSON 备份：

```bash
EXPORT_SOURCE=mysql npm --workspace backend run data:export
EXPORT_SOURCE=notion npm --workspace backend run data:export
```

从 JSON 恢复到指定数据源：

```bash
IMPORT_TARGET=mysql IMPORT_FILE=backups/data-mysql-xxx.json npm --workspace backend run data:import
IMPORT_TARGET=notion IMPORT_FILE=backups/data-notion-xxx.json npm --workspace backend run data:import
```
