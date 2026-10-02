#!/usr/bin/env bash
# 서버에서 비밀 값 하나를 .env.prod에 넣고 API를 다시 켠다. 값은 화면에 보이지 않게 입력받는다.
#   PC에서: ssh -t -i <키> ubuntu@<IP> "bash ~/gageabu/deploy/set-env.sh KAKAO_CLIENT_SECRET"
set -euo pipefail
name="${1:?넣을 항목 이름 (예: KAKAO_CLIENT_SECRET)}"
[[ "$name" =~ ^[A-Z][A-Z0-9_]*$ ]] || { echo "항목 이름이 이상해요: $name"; exit 1; }
cd "$(dirname "$0")/.."

read -rsp "$name 값을 붙여넣고 Enter (화면에 안 보여요): " value; echo
value="$(printf '%s' "$value" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
[ -n "$value" ] || { echo "값이 비어 있어요. 아무것도 바꾸지 않았어요."; exit 1; }

umask 077
tmp="$(mktemp)"
grep -v "^${name}=" .env.prod > "$tmp" || true
printf '%s=%s\n' "$name" "$value" >> "$tmp"
cat "$tmp" > .env.prod && rm -f "$tmp"
echo "$name 저장 (길이 ${#value}자). API 다시 켜는 중…"
sudo docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-build api
echo "완료"
