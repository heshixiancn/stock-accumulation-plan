#!/usr/bin/env bash
set -euo pipefail

MYSQL_HOST="${MYSQL_HOST:-10.126.126.10}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_DATABASE="${MYSQL_DATABASE:-stock_accumulation_plan}"
MYSQL_USER="${MYSQL_USER:-stock_accumulation_plan_app}"
BACKUP_DIR="${BACKUP_DIR:-./backups/mysql}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_FILE="${BACKUP_DIR}/${MYSQL_DATABASE}-${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

mysqldump \
  --host="${MYSQL_HOST}" \
  --port="${MYSQL_PORT}" \
  --user="${MYSQL_USER}" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --default-character-set=utf8mb4 \
  "${MYSQL_DATABASE}" | gzip > "${OUTPUT_FILE}"

echo "${OUTPUT_FILE}"

