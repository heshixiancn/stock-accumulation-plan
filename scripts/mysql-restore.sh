#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <backup.sql|backup.sql.gz>" >&2
  exit 1
fi

MYSQL_HOST="${MYSQL_HOST:-10.126.126.10}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_DATABASE="${MYSQL_DATABASE:-stock_accumulation_plan}"
MYSQL_USER="${MYSQL_USER:-stock_accumulation_plan_app}"
BACKUP_FILE="$1"

if [[ "${BACKUP_FILE}" == *.gz ]]; then
  gzip -dc "${BACKUP_FILE}" | mysql \
    --host="${MYSQL_HOST}" \
    --port="${MYSQL_PORT}" \
    --user="${MYSQL_USER}" \
    --default-character-set=utf8mb4 \
    "${MYSQL_DATABASE}"
else
  mysql \
    --host="${MYSQL_HOST}" \
    --port="${MYSQL_PORT}" \
    --user="${MYSQL_USER}" \
    --default-character-set=utf8mb4 \
    "${MYSQL_DATABASE}" < "${BACKUP_FILE}"
fi

