# 개발 환경

React Native/Expo/Metro는 Windows에서, ASP.NET API와 PostgreSQL은 Docker Desktop + WSL2에서 실행한다.
Python 워커는 후속 단계다.

## 실행 위치

| 대상 | 실행 위치 | 주소/저장 위치 |
|---|---|---|
| Expo/Metro | Windows PowerShell | 8081 |
| API, dotnet watch, EF 도구 | Docker `api` 서비스 | 5067 |
| PostgreSQL 18 | Docker `db` 서비스 | `127.0.0.1:5432`, DB `gageabu`, 볼륨 `gageabu_pg-data` |
| 영수증 분석 워커 (Python) | Docker `worker` 서비스 | API의 `/internal/receipts` |
| API 빌드 산출물 | Docker 볼륨 | `/home/node/.gagebu-artifacts` |
| 클라이언트 node_modules | Windows | `GagebuClient/node_modules` |

## 처음 준비

Docker Desktop을 실행하고 Linux 컨테이너를 사용한다. Windows에는 Node 22.13 이상인 22.x와 npm을 설치한다.
의존성 버전은 `package-lock.json`으로 고정한다.
캐시는 C 드라이브에 두지 않는다. npm 캐시는 `E:\Develop\npm-cache`(`npm config set cache`, PC 전체 설정),
Metro 캐시는 `GagebuClient/.metro-cache`(`metro.config.js`, Git 제외)다.

```powershell
Set-Location E:\source\github\Gageabu
node --version
npm.cmd --version
.\scripts\dev.ps1 start
```

`dev.ps1`은 PATH에 Docker가 없어도 Docker Desktop의 사용자 설치/기본 설치 경로를 찾는다.
`start`는 이미지를 빌드하고 DB → API 순서로 띄운 뒤, 둘 다 정상일 때 완료된다.

DB 접속 정보는 개발용 기본값(사용자 `gagebu`, 비밀번호 `gagebu_dev`)이다. 바꾸려면 루트 `.env`에
`POSTGRES_PASSWORD=...`를 넣는다. PostgreSQL은 **볼륨을 처음 만들 때만** 비밀번호를 적용하므로,
이미 만든 DB는 `dev.ps1 psql`에서 `ALTER USER gagebu PASSWORD '...';`로 함께 바꾼다.
API는 `ConnectionStrings__Gagebu` 환경변수로 접속하며 compose가 넣어 준다.
DBeaver 등으로 볼 때는 `localhost:5432`에 같은 계정으로 접속한다 (PC 밖에서는 접속 불가).
PowerShell 실행 정책 때문에 스크립트가 차단될 때만 현재 창에서 다음을 실행한다.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

다음은 클라이언트 최초 설치다. 기존 `.env.local`이 있으면 덮어쓰지 않는다.

```powershell
Set-Location E:\source\github\Gageabu\GagebuClient
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
notepad .env.local
npm.cmd ci
```

실물 폰을 쓰면 `ipconfig`에서 **Wi-Fi 또는 실제 Ethernet 어댑터**의 IPv4를 확인해 아래 값을 넣는다.
WSL/VMware 가상 어댑터 주소를 넣지 않는다.

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.0.5:5067
```

위 IP는 예시이며 네트워크가 바뀌면 다시 확인한다. Android 에뮬레이터만 쓰면
`http://10.0.2.2:5067`, Windows 웹만 쓰면 `http://localhost:5067`도 가능하다.
실물 폰의 `localhost`는 폰 자체를 가리킨다.

루트의 예전 `.env`/`HOST_LAN_IP`는 이제 앱 설정에 사용하지 않는다. 기존 개인 파일은 보존했다.
앱 설정은 `GagebuClient/.env.local` 한 곳에서 관리하며 `EXPO_PUBLIC_*`에는 비밀 값을 넣지 않는다.

## 매번 시작

PowerShell 창 1: API를 시작하고 상태를 확인한다.

```powershell
Set-Location E:\source\github\Gageabu
.\scripts\dev.ps1 start
Invoke-RestMethod http://localhost:5067/health
```

정상이면 `status: ok`. Swagger는 `http://localhost:5067/swagger`이다.

PowerShell 창 2: Expo를 시작하고 이 창을 계속 열어 둔다.

```powershell
Set-Location E:\source\github\Gageabu\GagebuClient
npm.cmd start -- --lan --port 8081
```

폰과 PC를 같은 Wi-Fi에 연결해 QR을 스캔한다. `w`는 웹 미리보기, `a`는 실행 중인 Android 에뮬레이터다.
환경변수 변경 후에는 Metro를 `Ctrl+C`로 종료하고 다시 실행한다. 캐시가 의심되면 `npm.cmd start -- --clear`.
네트워크 어댑터가 여러 개여서 QR의 IP가 틀리면 현재 PowerShell 창에서 다음처럼 지정한다.

```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME = '192.168.0.5' # 실제 PC IP로 변경
npm.cmd start -- --lan --port 8081
```

Expo Go가 요구하는 SDK와 맞아야 폰에서 실행된다. 시작 화면, 앱 자체 종료, 향후 ML Kit/카카오 네이티브 연동은
development build에서 검증한다. 이번 변경에는 dev build 전환을 포함하지 않았다.

## 중지와 로그

Metro는 해당 창에서 `Ctrl+C`. API는 다음 명령을 사용한다.

```powershell
Set-Location E:\source\github\Gageabu
.\scripts\dev.ps1 status
.\scripts\dev.ps1 logs  # API·DB 로그. 종료: Ctrl+C. 서버는 계속 실행됨
.\scripts\dev.ps1 stop  # API·DB 중지. DB 볼륨은 보존됨
.\scripts\dev.ps1 psql  # DB에 직접 SQL (종료: \q)
```

DB를 지우는 `docker compose down -v`는 사용하지 않는다.
PostgreSQL 전환 전 SQLite 볼륨 `gageabu_gagebu-db`는 더 이상 마운트하지 않지만 롤백용으로 남겨 두었다.
환경 전환 전의 `gageabu-dev-1`은 복귀용으로 중지 상태로 남겨 두었다.
Compose의 orphan 경고는 이 이전 컨테이너를 가리킨다. 새 `api`와 동시에 시작하지 않는다.

## 편집과 디버깅

- 클라이언트: Windows의 VS Code에서 저장소를 열고 Windows 터미널에서 npm을 실행한다.
  Claude Code 등 편집 도구도 이 창에서 사용할 수 있다. Metro Fast Refresh와 화면 반영을 폰에서 확인한다.
- API: 별도 VS Code 창에서 저장소 루트를 열고 `Dev Containers: Reopen in Container`를 실행한다.
  API는 Compose가 자동 실행하므로 `dotnet watch`를 또 실행하지 않는다.
  C# 확장에서 실행 중인 .NET 프로세스에 연결해 API 프로세스(`Gagebu Server`)를 선택하면 중단점을 사용할 수 있다.
- Dev Container의 Claude Code와 `gageabu_claude-config` 로그인 볼륨은 유지한다.
  이미지의 Node는 이 도구용이며 컨테이너에서 Expo/npm 설치를 실행하지 않는다.
- VS Code 창을 닫아도 API는 계속 실행된다. 종료는 `dev.ps1 stop`으로 한다.
- API는 Windows 파일 변경을 폴링한다. 자동 반영되지 않는 변경은 서버가 자동 재시작한다.
  컨테이너 Linux의 빌드 산출물과 Windows의 `bin/obj`는 분리되어 있다.

컨테이너 터미널이 필요하면:

```powershell
Set-Location E:\source\github\Gageabu
.\scripts\dev.ps1 shell
```

열린 Bash에서는 API 프로젝트 폴더가 현재 경로다. 예를 들어 마이그레이션 목록을 확인하려면:

```bash
dotnet ef migrations list --msbuildprojectextensionspath "$HOME/.gagebu-artifacts/obj/Gagebu Server"
```

마이그레이션 추가는 위 `list` 대신 `add 이름 -o Data/Migrations`를 사용한다.
`dotnet watch`가 도는 중에 `add`를 하면 빌드가 겹칠 수 있으니 `dev.ps1 stop` 후
`docker compose run --rm --no-deps api bash`로 들어가 실행한다 (DB는 `docker compose up -d db`로 먼저 켠다).
현재 API는 시작할 때 미적용 마이그레이션을 적용하므로 DB 변경 전 백업한다.

마이그레이션은 PostgreSQL 기준 `20260927071022_InitialCreate`부터 시작한다.
그 전 SQLite용 마이그레이션(InitialCreate, ConvertDatesToUtc, AddHousehold)은 Git 기록(`eff47ce` 이전)에만 남아 있다.

## 백업

API가 실행 중이어도 `pg_dump`로 일관된 백업을 만들 수 있다.

```powershell
Set-Location E:\source\github\Gageabu
.\scripts\dev.ps1 backup
```

`.local/backups/gageabu-<시각>.dump`(pg_dump custom 형식)와 SHA256 파일을 저장하고, 거래 데이터가 들어 있는지 확인한다.
이 폴더는 Git에서 제외된다. PC 장애에 대비하려면 이 폴더의 백업을 별도 저장소에도 복사한다.
전환 전 SQLite 백업(`*.db`)도 같은 폴더에 있다.

복원은 API를 멈추고 DB를 비운 뒤 넣는다. 현재 DB 내용이 사라지므로 먼저 `backup`을 한 번 더 받는다.

```powershell
Set-Location E:\source\github\Gageabu
docker compose stop api
docker compose cp .local\backups\gageabu-<시각>.dump db:/tmp/restore.dump
docker compose exec db sh -c "dropdb -U gagebu gageabu && createdb -U gagebu gageabu && pg_restore -U gagebu -d gageabu --no-owner /tmp/restore.dump"
.\scripts\dev.ps1 start
```

## 확인 명령

```powershell
Set-Location E:\source\github\Gageabu
.\scripts\dev.ps1 status
Invoke-RestMethod http://localhost:5067/health
$rows = Invoke-RestMethod http://localhost:5067/api/transactions
@($rows).Count

Set-Location E:\source\github\Gageabu\GagebuClient
npm.cmd run typecheck
npm.cmd run test:ci
```

### 로그인·공유 API 직접 해 보기 (개발용)

앱에는 아직 로그인 화면이 없다. 개발 환경에서는 토큰 없이 온 요청을 기본 가계부(Id 1)로 처리해서 지금 앱이 그대로 동작한다
(`Auth__AllowAnonymous`). 토큰을 보냈는데 틀리거나 만료됐으면 기본 가계부로 새지 않고 401이다.

1. `http://localhost:5067/swagger` → `POST /api/auth/dev-login`에 `{"key":"a","nickname":"철수"}` → 응답의 `token` 복사
2. 오른쪽 위 **Authorize**에 토큰 붙여넣기 → 이후 호출은 그 사용자로
3. 다른 `key`(예: `"b"`)로 두 번째 사용자를 만들어 초대(`POST /api/invites`) → 수락(`POST /api/invites/{code}/accept`)

**처음 로그인한 사용자가 기본 가계부(기존 내역)의 방장이 된다.** 개발 DB에서 한 번 해 보면 그 상태가 남으니 필요하면 먼저 `backup`.
개발용 로그인(`Auth__DevLoginEnabled`)과 익명 허용은 `ASPNETCORE_ENVIRONMENT=Development`일 때만 동작하고,
운영에서는 설정과 상관없이 꺼진다. 서명 키는 `Auth__JwtKey`(32바이트 이상, 운영은 비밀 값).

### 영수증 분석 워커 (Python)

`receipt-worker/`의 Python 워커가 Docker `worker` 서비스로 돈다 (`dev.ps1 start`가 같이 켬).
API의 `/internal/receipts`에서 작업을 가져가 합계·날짜·가게·카테고리 추천을 돌려준다. DB는 직접 만지지 않는다.

```powershell
.\scripts\dev.ps1 worker-test          # 규칙 테스트 (pytest)
docker compose restart worker          # 규칙 코드를 고친 뒤 반영
docker compose logs -f worker
```

규칙은 `receipt_worker/rules.py`, 가게→카테고리 사전은 `categories.py`. 규칙을 바꾸면 `__init__.py`의
`ENGINE_VERSION`을 올린다 (서버가 추천마다 기록). 실제 영수증 OCR 텍스트가 모이면 `tests/`에 사례로 추가한다.

### 서버 테스트

```powershell
Set-Location E:\source\github\Gageabu
.\scripts\dev.ps1 test
```

`Gagebu Server.Tests`(xUnit + WebApplicationFactory)가 실제 PostgreSQL에 실행마다 임시 DB(`gageabu_test_*`)를 만들어
API를 띄우고, 끝나면 지운다. 개발 DB(`gageabu`)는 건드리지 않는다. API와 DB가 켜져 있어야 한다.
빌드 산출물은 `~/.gagebu-artifacts/test`에 따로 두어 실행 중인 `dotnet watch`와 겹치지 않는다.
API 동작을 바꾸면 테스트를 같이 고치고, 새 기능에는 테스트를 추가한다.

폰에서는 기존 거래 표시, 테스트 거래 등록·수정·삭제, 화면 수정 시 Fast Refresh를 확인한다.
연결이 안 되면 폰 브라우저에서 `http://<PC IPv4>:5067/health`를 먼저 확인한다.
PC에서만 열리면 Wi-Fi 단말 격리 또는 Windows 방화벽의 5067/8081 접근을 확인한다.
방화벽 규칙은 실제 사용하는 신뢰할 수 있는 네트워크 범위로 설정한다.

## 다음 단계와 클라우드

1. 이번 실행 환경 분리와 폰 연결 확인.
2. ~~PostgreSQL 개발 서비스, EF 프로바이더/마이그레이션 정리, 거래 CRUD·UTC 날짜 검증~~ (2026-09-27 완료)
3. 개발용 로그인, 멤버·초대, 작성자, 예산 서버 저장. 앱 development build 준비 병행.
4. PostgreSQL 전환 후 클라우드 VM과 운영 이미지·설정, HTTPS, 백업·복원, 상태 확인 구성 착수.
   실제 인증·가계부 권한 적용과 운영에서 개발 로그인 차단을 완료한 뒤 외부 사용자 테스트.
5. 영수증 초안·일괄 확정 API와 Python 워커 연결. 추출 규칙은 Python에 모은다.

`Dockerfile.api`는 Release 배포 이미지의 출발점이다. 현재 개발 Compose는 클라우드 운영용이 아니다.
클라우드 준비를 영수증 엔진 완성까지 미룰 필요는 없다. 공급자·요금제·도메인은 배포 단계에서 결정한다.
