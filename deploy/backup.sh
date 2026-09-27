#!/usr/bin/env bash
# 운영 DB 백업 (서버 cron에서 매일). 30일 지난 백업은 지운다.
#   bash deploy/backup.sh
# cron 등록(한 번): (crontab -l 2>/dev/null; echo '0 4 * * * bash $HOME/gageabu/deploy/backup.sh >> $HOME/backups/backup.log 2>&1') | crontab -
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p "$HOME/backups"

out="$HOME/backups/gageabu-$(date +%Y%m%d-%H%M%S).dump"
sudo docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T db pg_dump -U gagebu -d gageabu -Fc > "$out"
if [ ! -s "$out" ]; then
  echo "$(date '+%F %T') 백업 실패 (빈 파일): $out"
  rm -f "$out"
  exit 1
fi

find "$HOME/backups" -name 'gageabu-*.dump' -mtime +30 -delete
echo "$(date '+%F %T') 백업: $out ($(du -h "$out" | cut -f1))"
