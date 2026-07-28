-- Run as a MySQL administrator on 10.126.126.10:3306.
-- Each application should use its own schema and least-privilege user.

CREATE DATABASE IF NOT EXISTS `stock_accumulation_plan`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

CREATE USER IF NOT EXISTS 'stock_accumulation_plan_app'@'%'
  IDENTIFIED BY 'MTsXxY3FHmaTMJipqZTs';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX
  ON `stock_accumulation_plan`.*
  TO 'stock_accumulation_plan_app'@'%';

FLUSH PRIVILEGES;

