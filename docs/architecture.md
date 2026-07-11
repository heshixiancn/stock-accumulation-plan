# 架构说明

- `backend/`：负责 Notion API、REST API、统计计算、生产环境静态资源托管
- `frontend/`：负责 Dashboard、攒股计划和其他投资页面；蓝筹交易记录、股息记录在个股页内通过“记一笔”和“流水”弹窗处理，蓝筹以外投资按“其他投资标的 + 其他投资记录”两张 Notion 表维护
- `Dockerfile`：统一构建和部署
- `docker-compose.yml`：一键启动容器服务
