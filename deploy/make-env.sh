#!/usr/bin/env bash
# 운영 비밀 값(.env.prod) 만들기. 이미 있으면 덮어쓰지 않는다.
#   bash deploy/make-env.sh <도메인> [카카오 앱 ID]
#   예) bash deploy/make-env.sh gagebu-test.duckdns.org 1589304
set -euo pipefail

domain="${1:?도메인을 주세요 (예: gagebu-test.duckdns.org)}"
kakao_app_id="${2:-}"
cd "$(dirname "$0")/.."

if [ -e .env.prod ]; then
  echo ".env.prod가 이미 있어요. 바꾸려면 직접 수정하세요 (DB 비밀번호는 docs/DEPLOY.md '비밀 값 바꾸기' 참고)."
  exit 1
fi

random() { openssl rand -base64 48 | tr -d '\n/+=' | cut -c1-48; }

umask 077   # 나만 읽을 수 있게
cat > .env.prod <<EOF
# $(date '+%Y-%m-%d') deploy/make-env.sh로 생성. Git에 올리지 않는다
GAGEBU_DOMAIN=${domain}
POSTGRES_PASSWORD=$(random)
GAGEBU_JWT_KEY=$(random)
GAGEBU_WORKER_KEY=$(random)
KAKAO_APP_ID=${kakao_app_id}
GAGEBU_WEB_ORIGIN=
EOF

echo ".env.prod 생성: 도메인 ${domain}, 카카오 앱 ID ${kakao_app_id:-(없음)}"
echo "다음: docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build"
