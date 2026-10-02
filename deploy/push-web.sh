#!/usr/bin/env bash
# 웹앱(PWA)을 PC에서 빌드해 서버로 보낸다 → Caddy가 ~/gageabu/webroot/web을 그대로 서비스 (서버 재시작 없음)
#   bash deploy/push-web.sh <SSH 개인 키> <서버 IP> <도메인>
#   예) bash deploy/push-web.sh ~/keys/oracle.key 152.70.85.165 gageabu-jun.duckdns.org
set -euo pipefail

key="${1:?SSH 개인 키 경로}"
host="${2:?서버 IP}"
domain="${3:?도메인 (API와 같은 주소)}"
target="ubuntu@${host}"
ssh_opts=(-i "$key" -o StrictHostKeyChecking=accept-new)
cd "$(dirname "$0")/.."
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "== 웹 빌드 (API: https://${domain}) =="
# 테스트 로그인은 웹에서 쓰지 않는다 (EXPO_PUBLIC_TEST_LOGIN 없음)
(cd GagebuClient && EXPO_PUBLIC_API_URL="https://${domain}" EXPO_PUBLIC_TEST_LOGIN= npx expo export --platform web --output-dir "$tmp/web" --clear)
tar -czf "$tmp/web.tar.gz" -C "$tmp/web" .
ls -lh "$tmp/web.tar.gz"

echo "== 서버로 보내기 =="
scp "${ssh_opts[@]}" "$tmp/web.tar.gz" "$target:/tmp/gageabu-web.tar.gz"
# 새 폴더에 풀고 한 번에 바꿔 끼움 (중간에 반쯤 바뀐 화면이 보이지 않게). 직전 버전은 web.prev로 남김
ssh "${ssh_opts[@]}" "$target" 'set -e
  mkdir -p ~/gageabu/webroot && cd ~/gageabu/webroot
  rm -rf web.new && mkdir web.new && tar -xzf /tmp/gageabu-web.tar.gz -C web.new && rm -f /tmp/gageabu-web.tar.gz
  rm -rf web.prev; [ -d web ] && mv web web.prev; mv web.new web
  echo "웹 파일: $(find web -type f | wc -l)개"'

echo "완료: https://${domain}"
