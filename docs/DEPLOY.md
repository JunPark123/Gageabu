# 운영 배포

API·DB·HTTPS를 Linux 서버 한 대에 Docker Compose로 올린다. 개발 환경은 [DEVELOPMENT.md](DEVELOPMENT.md).

```
폰 앱 ──HTTPS──▶ caddy (443, 인증서 자동) ──http──▶ api (.NET, 5067, 밖에 안 열림) ──▶ db (PostgreSQL, 밖에 안 열림)
                                                        ▲
                              worker (Python, 영수증 분석) ─┘ /internal/receipts (X-Worker-Key, 밖에서는 Caddy가 차단)
```

| 파일 | 역할 |
|---|---|
| `docker-compose.prod.yml` | api · db · caddy |
| `Dockerfile.api` | API 운영 이미지 (Release, 일반 사용자로 실행) |
| `deploy/Caddyfile` | HTTPS·압축·Swagger 차단·프록시 |
| `.env.prod.example` | 비밀 값 목록 → 서버에서 `.env.prod`로 복사 (Git 제외) |

## 아직 정해야 하는 것
- **서버**: 클라우드 VM(공급자·요금제) 또는 집 PC + Cloudflare Tunnel
- **도메인**: API 주소(예: `api.<도메인>`). 초대 링크(`https://<도메인>/invite/코드`)에도 쓴다

## 운영에서 달라지는 점
`ASPNETCORE_ENVIRONMENT=Production`이면 서버가 스스로 막는다 (설정으로 켤 수 없음).
- 개발용 로그인(`/api/auth/dev-login`) → 404
- 토큰 없는 요청 → 401 (개발의 "기본 가계부" 없음). **앱에 로그인 화면이 생긴 뒤에 운영을 연다**
- Swagger 없음 (Caddy에서도 404)
- CORS: `GAGEBU_WEB_ORIGIN`에 적은 웹 주소만 허용 (폰 앱은 상관없음)

## Oracle Cloud 무료 VM으로 처음 올리기 (결정 2026-09-27)

**1. VM 만들기 (Oracle 콘솔)**: Compute → Instances → Create instance
- Image: Ubuntu 24.04 / Shape: `VM.Standard.A1.Flex`(Ampere ARM) OCPU 2~4, 메모리 12~24GB — Always Free 범위
- SSH 키: "Generate a key pair" → **개인 키 다운로드**(분실하면 접속 불가) / Public IPv4 할당
- "Out of capacity"가 나오면 시간을 두고 다시 (무료 ARM 자리 부족)

**2. 80·443 열기 (Oracle 콘솔)**: Networking → Virtual Cloud Networks → (VM의 VCN) → Security Lists → Default →
Add Ingress Rules: Source `0.0.0.0/0`, TCP, Destination Port `80` / 같은 방법으로 `443`

**3. 도메인**: [DuckDNS](https://www.duckdns.org) 서브도메인을 만들고 VM의 공인 IP를 넣는다 (또는 구입한 도메인의 A 레코드)

**4. 접속 (Windows PowerShell)**:
```powershell
ssh -i C:\경로\ssh-key.key ubuntu@<공인 IP>
```
키 파일 권한 오류가 나면: `icacls C:\경로\ssh-key.key /inheritance:r /grant:r "$($env:USERNAME):(R)"`

**5. 서버에서** (코드 받기는 GitHub clone. 저장소가 비공개면 토큰이 필요):
```bash
git clone -b rebuild https://github.com/JunPark123/Gageabu.git gageabu && cd gageabu
bash deploy/setup-ubuntu.sh        # Docker 설치 + 서버 방화벽 80·443
exit                               # docker 권한 적용을 위해 다시 접속
```
```bash
cd gageabu
bash deploy/make-env.sh <도메인> 1589304     # 비밀 값 자동 생성 (.env.prod), 두 번째는 카카오 앱 ID
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build   # ARM에서 첫 빌드 몇 분
curl https://<도메인>/health                                                  # {"status":"ok"}
```

## 처음 올리기 (일반)
서버에 Docker(Compose 포함)와 Git이 있고, 도메인의 DNS A 레코드가 서버 IP를 가리키며, 방화벽에서 80·443이 열려 있어야 한다.

```bash
git clone <저장소> gageabu && cd gageabu
cp .env.prod.example .env.prod
openssl rand -base64 48   # POSTGRES_PASSWORD, GAGEBU_JWT_KEY에 각각 다른 값
nano .env.prod
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
curl https://<도메인>/health   # {"status":"ok"}
```

API는 시작할 때 밀린 DB 마이그레이션을 적용한다. Caddy가 인증서를 받는 데 몇십 초 걸릴 수 있다.

## 업데이트
**DB 구조가 바뀌는 업데이트도 시작 시 자동 적용되므로 먼저 백업한다.**

```bash
cd gageabu
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T db pg_dump -U gagebu -d gageabu -Fc > ~/backups/gageabu-$(date +%Y%m%d-%H%M%S).dump
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.prod logs api --tail 50
```

## 백업·복원
위 `pg_dump` 명령을 cron으로 매일 돌리고, 서버 밖(다른 저장소)에도 복사한다. 예 (`crontab -e`):

```cron
0 4 * * * cd ~/gageabu && docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T db pg_dump -U gagebu -d gageabu -Fc > ~/backups/gageabu-$(date +\%Y\%m\%d).dump && find ~/backups -name 'gageabu-*.dump' -mtime +30 -delete
```

복원 (현재 DB 내용이 사라진다 — 먼저 백업):

```bash
C="docker compose -f docker-compose.prod.yml --env-file .env.prod"
$C stop api
$C cp ~/backups/<파일>.dump db:/tmp/restore.dump
$C exec db sh -c "dropdb -U gagebu gageabu && createdb -U gagebu gageabu && pg_restore -U gagebu -d gageabu --no-owner /tmp/restore.dump"
$C start api
```

## 비밀 값 바꾸기
- `GAGEBU_JWT_KEY`: `.env.prod` 수정 후 `up -d`. 기존 토큰이 모두 무효 → 모두 다시 로그인
- `POSTGRES_PASSWORD`: PostgreSQL은 볼륨을 처음 만들 때만 적용한다. 먼저 DB 안에서 바꾸고 `.env.prod`도 같게 한 뒤 `up -d`
  ```bash
  docker compose -f docker-compose.prod.yml --env-file .env.prod exec db psql -U gagebu -d gageabu -c "ALTER USER gagebu PASSWORD '<새 비밀번호>';"
  ```

## 로컬에서 운영 구성 시험하기
개발 DB와 겹치지 않게 프로젝트 이름과 포트를 따로 준다. `localhost`면 Caddy가 자체 인증서를 쓴다 (`curl -k`).

```bash
printf 'GAGEBU_DOMAIN=localhost\nPOSTGRES_PASSWORD=test-pw\nGAGEBU_JWT_KEY=test-jwt-key-0123456789abcdefghijklmn\nHTTP_PORT=18080\nHTTPS_PORT=18443\n' > /tmp/prodtest.env
docker compose -f docker-compose.prod.yml -p gageabu-prodtest --env-file /tmp/prodtest.env up -d --build --wait
curl -k https://localhost:18443/health
docker compose -f docker-compose.prod.yml -p gageabu-prodtest --env-file /tmp/prodtest.env down -v --rmi local   # 시험용이라 볼륨까지 삭제
```

## 카카오 로그인
[카카오 개발자 콘솔](https://developers.kakao.com)에서 앱을 만들고 **앱 ID(숫자)**를 `.env.prod`의 `KAKAO_APP_ID`에 넣는다.
서버는 앱이 보낸 카카오 액세스 토큰이 이 앱 ID로 발급된 것인지 확인하므로 카카오 비밀 키(REST API 키 등)는 서버에 필요 없다.
네이티브 앱 키는 앱(dev build) 설정에 들어간다. 비워 두면 `/api/auth/kakao`는 503.

## 남은 일
- 앱 로그인 화면 + 카카오 SDK 연동 (운영에서는 개발용 로그인이 막히므로 그 전에는 운영을 열 수 없다)
- 토큰 갱신(refresh) 방식 — 지금은 30일짜리 토큰 하나
- 서버 모니터링·알림 (최소: `/health` 외부 감시)
