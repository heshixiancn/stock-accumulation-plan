-- Application schema for DATA_SOURCE=mysql.
-- Run with a user that has CREATE/ALTER privileges on the target schema.

CREATE TABLE IF NOT EXISTS stocks (
  id varchar(36) NOT NULL COMMENT '主键，应用生成的 UUID',
  stock_code varchar(64) NOT NULL COMMENT '股票代码，例如 600519',
  stock_name varchar(255) NOT NULL COMMENT '股票名称',
  current_price decimal(20,6) NOT NULL DEFAULT 0 COMMENT '当前价格或最近收盘价',
  cost_price decimal(20,6) NOT NULL DEFAULT 0 COMMENT '手工维护成本价；存在交易流水时展示值由流水移动加权计算覆盖',
  target_shares decimal(20,4) NOT NULL DEFAULT 0 COMMENT '目标持仓股数',
  holding_shares decimal(20,4) NOT NULL DEFAULT 0 COMMENT '手工维护持仓股数；存在交易流水时展示值由流水计算覆盖',
  dividend_yield decimal(12,8) NOT NULL DEFAULT 0 COMMENT '股息率，小数格式，例如 0.045 表示 4.5%',
  dividend_per_share decimal(20,6) NOT NULL DEFAULT 0 COMMENT '每股年度股息，用于估算预计股息',
  actual_dividend decimal(20,6) NOT NULL DEFAULT 0 COMMENT '手工维护实际股息；存在股息流水时展示值由流水汇总覆盖',
  status varchar(32) NOT NULL COMMENT '计划状态：观察中、建仓中、持有中、已暂停',
  notes text NULL COMMENT '备注',
  archived tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记，1 表示已归档',
  created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_stocks_code (stock_code)
) COMMENT='蓝筹攒股计划主表，维护目标、价格、股息和手工持仓信息';

CREATE TABLE IF NOT EXISTS trades (
  id varchar(36) NOT NULL COMMENT '主键，应用生成的 UUID',
  title varchar(255) NOT NULL COMMENT '交易记录标题',
  stock_code varchar(64) NOT NULL COMMENT '股票代码',
  stock_name varchar(255) NOT NULL COMMENT '股票名称',
  trade_date date NOT NULL COMMENT '交易日期',
  trade_type varchar(16) NOT NULL COMMENT '交易类型：买入、卖出',
  price decimal(20,6) NOT NULL COMMENT '成交价格',
  shares decimal(20,4) NOT NULL COMMENT '成交股数',
  fee decimal(20,6) NOT NULL DEFAULT 0 COMMENT '手续费',
  tax decimal(20,6) NOT NULL DEFAULT 0 COMMENT '税费',
  notes text NULL COMMENT '备注',
  archived tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记，1 表示已归档',
  created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_trades_stock_date (stock_code, trade_date)
) COMMENT='蓝筹股票交易流水，用于移动加权成本、持仓和已实现盈亏计算';

CREATE TABLE IF NOT EXISTS dividends (
  id varchar(36) NOT NULL COMMENT '主键，应用生成的 UUID',
  title varchar(255) NOT NULL COMMENT '股息记录标题',
  stock_code varchar(64) NOT NULL COMMENT '股票代码',
  stock_name varchar(255) NOT NULL COMMENT '股票名称',
  year int NOT NULL COMMENT '股息所属年份',
  ex_dividend_date date NULL COMMENT '除权除息日',
  payment_date date NULL COMMENT '到账日期',
  dividend_per_share decimal(20,6) NOT NULL DEFAULT 0 COMMENT '每股分红金额',
  holding_shares decimal(20,4) NOT NULL DEFAULT 0 COMMENT '参与分红的持仓股数',
  gross_dividend decimal(20,6) NOT NULL DEFAULT 0 COMMENT '税前股息',
  net_dividend decimal(20,6) NOT NULL DEFAULT 0 COMMENT '税后到账股息',
  notes text NULL COMMENT '备注',
  archived tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记，1 表示已归档',
  created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_dividends_stock_year (stock_code, year)
) COMMENT='蓝筹股票股息收入流水，用于实际股息和年度股息统计';

CREATE TABLE IF NOT EXISTS other_investment_assets (
  id varchar(36) NOT NULL COMMENT '主键，应用生成的 UUID',
  asset_code varchar(64) NOT NULL DEFAULT '' COMMENT '资产代码，例如美股代码、港股代码或基金代码',
  asset_name varchar(255) NOT NULL COMMENT '资产名称',
  market varchar(32) NOT NULL COMMENT '市场：A股、美股、港股',
  asset_type varchar(32) NOT NULL COMMENT '资产类型：股票、基金、ETF、可转债、其他',
  currency varchar(8) NOT NULL COMMENT '计价币种：CNY、USD、HKD',
  current_price decimal(20,6) NOT NULL DEFAULT 0 COMMENT '当前价格或最近收盘价',
  notes text NULL COMMENT '备注',
  archived tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记，1 表示已归档',
  created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_other_assets_key (market, asset_code, asset_name)
) COMMENT='其他投资标的主表，保存蓝筹攒股以外资产的基础信息和当前价格';

CREATE TABLE IF NOT EXISTS other_investment_records (
  id varchar(36) NOT NULL COMMENT '主键，应用生成的 UUID',
  title varchar(255) NOT NULL COMMENT '投资流水标题',
  asset_code varchar(64) NOT NULL DEFAULT '' COMMENT '资产代码',
  asset_name varchar(255) NOT NULL COMMENT '资产名称',
  market varchar(32) NOT NULL COMMENT '市场：A股、美股、港股',
  asset_type varchar(32) NOT NULL COMMENT '资产类型：股票、基金、ETF、可转债、其他',
  trade_date date NOT NULL COMMENT '交易或分红日期',
  trade_type varchar(16) NOT NULL COMMENT '流水类型：买入、卖出、分红',
  price decimal(20,6) NOT NULL COMMENT '成交价格；分红记录中表示分红单价或金额口径',
  quantity decimal(20,6) NOT NULL COMMENT '成交数量；美股支持小数，A股和港股按整数处理',
  fee decimal(20,6) NOT NULL DEFAULT 0 COMMENT '手续费',
  tax decimal(20,6) NOT NULL DEFAULT 0 COMMENT '税费',
  current_price decimal(20,6) NOT NULL DEFAULT 0 COMMENT '记录时维护的当前价格，资产表价格为空时可作为兜底',
  currency varchar(8) NOT NULL COMMENT '计价币种：CNY、USD、HKD',
  notes text NULL COMMENT '备注',
  archived tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记，1 表示已归档',
  created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_other_records_key_date (market, asset_code, asset_name, trade_date)
) COMMENT='其他投资流水，用于持仓、成本、分红和盈亏计算';
