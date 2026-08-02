#!/bin/sh

set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
runtime_env_file=${APP_ENV_FILE:-$project_dir/.env}
if [ ! -f "$runtime_env_file" ]; then
  echo "部署失败：找不到运行时环境文件：$runtime_env_file" >&2
  exit 1
fi
export APP_ENV_FILE="$runtime_env_file"
compose_files="--env-file $runtime_env_file -f $project_dir/docker-compose.yml -f $project_dir/docker-compose.ghcr.yml"
container_name="stock-accumulator-notion"

old_image_id=$(docker inspect --format='{{.Image}}' "$container_name" 2>/dev/null || true)

docker compose $compose_files pull stock-accumulator-notion
docker compose $compose_files up -d --no-build stock-accumulator-notion

published_address=$(docker compose $compose_files port stock-accumulator-notion 3000)
published_port=${published_address##*:}
health_url="http://127.0.0.1:$published_port/health"
attempt=1
while [ "$attempt" -le 30 ]; do
  if curl -fsS "$health_url" >/dev/null; then
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    echo "部署失败：健康检查未通过：$health_url" >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 2
done

new_image_id=$(docker inspect --format='{{.Image}}' "$container_name")
if [ -n "$old_image_id" ] && [ "$old_image_id" != "$new_image_id" ]; then
  docker image rm "$old_image_id" >/dev/null 2>&1 || true
fi

echo "部署成功：$health_url"
