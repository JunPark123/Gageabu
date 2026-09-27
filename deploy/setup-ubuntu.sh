#!/usr/bin/env bash
# 운영 서버 처음 준비 (Oracle Cloud Ubuntu 24.04 ARM 기준, 다른 Ubuntu도 됨). 여러 번 실행해도 안전.
#   bash deploy/setup-ubuntu.sh
# 끝나면 한 번 로그아웃 후 다시 접속 (docker 그룹 적용). 다음 단계는 docs/DEPLOY.md
set -euo pipefail

echo "== Docker 설치 =="
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo usermod -aG docker "$USER"
sudo systemctl enable --now docker

echo "== 방화벽: 80(HTTP), 443(HTTPS) 열기 =="
# Oracle Ubuntu 이미지는 iptables가 SSH(22) 말고는 막아 둔다. 재부팅 후에도 유지되게 저장
if ! command -v netfilter-persistent >/dev/null 2>&1; then
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
fi
for port in 80 443; do
  if ! sudo iptables -C INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT 2>/dev/null; then
    sudo iptables -I INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT
  fi
done
sudo netfilter-persistent save

echo "== 백업 폴더 =="
mkdir -p "$HOME/backups"

echo
echo "준비 끝. 'exit'로 나갔다가 다시 접속한 뒤: bash deploy/make-env.sh <도메인>"
echo "(Oracle 콘솔의 Security List에도 80·443 TCP 수신 규칙이 있어야 한다 — docs/DEPLOY.md)"
