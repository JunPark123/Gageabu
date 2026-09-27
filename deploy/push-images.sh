#!/usr/bin/env bash
# PC(x86)에서 운영 이미지를 빌드해 서버로 보낸다 — 메모리가 작은 서버(Oracle AMD 마이크로 1GB)에서 빌드하지 않기 위해.
# 서버도 x86(amd64)이어야 한다. ARM(A1) 서버는 서버에서 직접 빌드(--build)한다.
#   bash deploy/push-images.sh <SSH 개인 키> <서버 IP>
# 배포 파일(docker-compose.prod.yml, deploy/)도 같이 복사한다 (서버의 ~/gageabu)
set -euo pipefail

key="${1:?SSH 개인 키 경로}"
host="${2:?서버 IP}"
target="ubuntu@${host}"
ssh_opts=(-i "$key" -o StrictHostKeyChecking=accept-new)
cd "$(dirname "$0")/.."
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "== 이미지 빌드 (linux/amd64) =="
docker build --platform linux/amd64 -f Dockerfile.api -t gageabu-prod-api:latest .
docker build --platform linux/amd64 --target prod -t gageabu-prod-worker:latest receipt-worker

echo "== 이미지 저장 =="
docker save gageabu-prod-api:latest gageabu-prod-worker:latest | gzip > "$tmp/images.tar.gz"
ls -lh "$tmp/images.tar.gz"

echo "== 배포 파일 묶기 =="
tar -czf "$tmp/deploy.tar.gz" docker-compose.prod.yml deploy

echo "== 서버로 보내기 =="
scp "${ssh_opts[@]}" "$tmp/images.tar.gz" "$tmp/deploy.tar.gz" "$target:/tmp/"
# 처음이면 서버 준비(Docker·방화벽·스왑)부터. docker 그룹은 재접속 전이라 sudo로 불러온다
ssh "${ssh_opts[@]}" "$target" 'set -e
  mkdir -p ~/gageabu && tar -xzf /tmp/deploy.tar.gz -C ~/gageabu
  command -v docker >/dev/null 2>&1 || bash ~/gageabu/deploy/setup-ubuntu.sh
  gunzip -c /tmp/images.tar.gz | sudo docker load
  rm -f /tmp/images.tar.gz /tmp/deploy.tar.gz'

echo "완료. 서버에서: cd ~/gageabu && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-build"
