# Gageabu 재개발 계획

> 여럿이 같이 쓰는 공유 가계부 (처음 목표는 커플, 가족·룸메이트 등 여러 명도 지원). 클라이언트 = Expo(React Native), 서버 = ASP.NET Core 8 + EF Core + SQLite.
> 이 문서는 개발 세션 간 인수인계용입니다. 단계를 끝낼 때마다 체크박스와 "진행 기록"을 갱신하세요.

---

## 1. 개발 환경 (Dev Container)

로컬(Windows)과 개발 환경을 분리하는 것이 목적입니다. **빌드·실행·npm/dotnet 명령은 전부 컨테이너 안에서** 합니다.

### 시작하기
1. Docker Desktop 실행
2. 루트의 `.env.example`을 `.env`로 복사한 뒤 `HOST_LAN_IP`를 내 PC IP로 맞추기 (`ipconfig` → IPv4)
3. VSCode로 **레포 루트(`Gageabu/`)** 를 열고 `F1` → `Dev Containers: Reopen in Container`
4. 컨테이너 안의 Claude Code에 로그인 (로그인 정보는 `claude-config` 볼륨에 유지됨)

### 실행 명령 (컨테이너 터미널)
```bash
# API 서버 (5067) — 코드 수정 시 자동 재시작
cd "/workspace/Gagebu_RestApiVer/Gagebu Server/Gagebu Server"
dotnet watch run --no-launch-profile

# 클라이언트 (Metro 8081) — 폰의 Expo Go로 QR 스캔
cd /workspace/GagebuClient
npx expo start --port 8081

# DB 마이그레이션 추가 (서버 시작 시 자동 적용됨)
cd "/workspace/Gagebu_RestApiVer/Gagebu Server/Gagebu Server"
dotnet ef migrations add <이름> -o Data/Migrations --msbuildprojectextensionspath "$HOME/.gagebu-artifacts/obj/Gagebu Server"
```

### 구성
| 항목 | 위치 / 값 |
|---|---|
| 컨테이너 정의 | `docker-compose.yml`, `.devcontainer/` |
| 이미지 | Node 22 (bookworm) + .NET 8 SDK + dotnet-ef 9.0.3 + sqlite3, `TZ=Asia/Seoul` |
| DB | `gagebu-db` 볼륨의 `/data/db/gageabu.db` (`GAGEBU_DB_DIR`, `GAGEBU_DB_NAME`) |
| API 주소(클라) | `EXPO_PUBLIC_API_URL` = `http://${HOST_LAN_IP}:5067` |
| 볼륨 | `client-node-modules`, `nuget-packages`, `gagebu-db`, `claude-config` |

### 주의
- **클라 핫 리로드가 안 됩니다.** 레포가 Windows 드라이브(9p/drvfs 마운트)에 있어서, 이미 있는 파일을 고쳐도 변경 이벤트가 오지 않습니다 (새 파일 생성만 감지). 코드를 고친 뒤에는 Metro를 껐다 켜야(`Ctrl+C` → `npx expo start`) 반영됩니다. 서버(`dotnet watch`)는 폴링이라 OK.
  - 근본 해결: 레포를 컨테이너 볼륨에 두기 (`F1` → `Dev Containers: Clone Repository in Container Volume`) 또는 WSL 리눅스 파일시스템에 클론.
- **웹 미리보기:** Metro 터미널에서 `w` → Windows 브라우저로 `http://localhost:8081`. 폰 없이 화면 확인 가능 (`react-native-web`). 프로젝트는 **Expo SDK 57**(RN 0.86, React 19.2, TS 6)이라 스토어 최신 Expo Go로 열립니다.
- 기존 Windows DB(`C:\Gagebu\DB\household_ledgerNew.db`) 데이터를 옮기려면: 파일을 레포 루트에 잠깐 복사 → 컨테이너에서 `cp /workspace/household_ledgerNew.db /data/db/gageabu.db` → 복사본 삭제. 서버를 켜면 마이그레이션이 자동 적용되고, 예전 날짜(KST를 UTC인 척 저장)는 `ConvertDatesToUtc`가 -9시간 보정합니다. **옛 앱(가짜 UTC로 보내는 버전)과 새 서버를 섞어 쓰면 안 됩니다.**
- 컨테이너(Linux)에서 .NET 빌드 산출물은 `~/.gagebu-artifacts`에 생깁니다 (`Gagebu_RestApiVer/Directory.Build.props`). Windows 쪽 `bin/obj`와 섞이지 않게 하려는 것으로, Windows/VS 빌드는 그대로입니다.
- `Dockerfile.api`는 배포용(Release 빌드)입니다. 개발에는 쓰지 않습니다.
- 폰이 접속 안 되면: 폰과 PC가 같은 와이파이인지, `.env`의 IP가 맞는지, Windows 방화벽이 8081/5067을 막는지 확인.

---

## 2. 검수 결과 (2026-09-24)

### 버그
- [x] `app/(tabs)/index.tsx` 날짜/달 선택 확인 시 `fetchData` + `fetchDataWithFilter` 연속 호출 → **서버 요청 2번** (README 버그 #1 원인)
- [x] `index.tsx` 선택 버튼 강조를 `useRef`로 판단 → 리렌더 안 돼서 강조가 늦거나 틀림
- [ ] `index.tsx` `paytype === 0`(None)도 "지출"로 표시
- [ ] `add.tsx` `react-native-reanimated/lib/typescript/Colors`에서 안 쓰는 `red` import (내부 경로)
- [x] `add.tsx` 달력에 `toISOString()` 사용 → KST 00~09시에 전날로 표시, 날짜 선택 시 시간 초기화
- [ ] `add.tsx` 입금 등록해도 "지출이 등록되었습니다"
- [x] 날짜 저장 방식 `getFakeUTCISOStringFromKST`(KST를 UTC인 척 저장) + 서버 `DateTime.Today` → 서버 TZ에 의존. 임시로 컨테이너 `TZ=Asia/Seoul`로 막아둠, 1단계에서 근본 수정

### 구조
- `index.tsx` 1077줄 단일 컴포넌트, 중복 fetch 함수, 죽은 코드(`totalCost` → 100 반환 등)
- 클라 `Transaction`의 `content`/`category`가 서버 `TransactionDto`에 없음 → 조용히 버려짐
- `TransactionQueryType` enum 번호 불일치 (클라 `Expense=5`, 서버 `Expense=4`)
- API IP 하드코딩 (`src/api/transactions.ts`)
- 서버 `AppDbContext` 생성자에서 `EnsureCreated()` (요청마다 실행), `OnConfiguring`과 `Program.cs`에 SQLite 설정 중복
- 에러 구분을 `ErrorMessage.Contains("not found")` 문자열로 함
- 정렬은 오름차순인데 주석은 "내림차순"
- 잔여물: Expo 템플릿 컴포넌트(HelloWave, ParallaxScrollView, 빈 SwipeableRow, Collapsible, ExternalLink), 스와이프 데모 `explore.tsx`, 레거시 `Server/`, WinForms `Gagebu_RestApiVer/Gagebu_Client`, `testfile.txt`, 중복 `ePayType`(`Gagebu Server/Shared/Common`), `GagebuClient/Dockerfile.dev`
- UI: 색상 하드코딩(파란색만 4종), 테마 없음, 다크모드는 탭바만 적용

---

## 3. 로드맵

### 0단계 — 정리
- [x] 현재 작업중인 변경사항 커밋 (도커 설정, IP/DB 경로 환경변수화 등)
- [x] 템플릿 잔여물·레거시 폴더·`testfile.txt`·`GagebuClient/Dockerfile.dev`·중복 enum 삭제 (삭제 전 사용자 확인)
- [x] API 주소를 `process.env.EXPO_PUBLIC_API_URL`로 교체
- [x] `.gitattributes` 추가 (`* text=auto`, `*.sh text eol=lf`)
- [x] 컨테이너에서 서버/클라 모두 실행되는지 확인 (폰 Expo Go 실접속은 사용자 확인 필요)

### 1단계 — 기반
- [x] 날짜: 서버는 UTC 저장, API는 `DateTimeOffset`. 클라는 `dayjs`로 KST 변환(`src/lib/date.ts`). "오늘/이번 달" 범위는 클라가 KST 기준으로 계산해 UTC로 전송
  - DB 컬럼은 `DateTimeOffset`이 아니라 **UTC `DateTime`** (SQLite 프로바이더가 `DateTimeOffset` 비교·정렬을 SQL로 못 바꿈). 읽을 때 `Kind=Utc`
  - summary API는 `GET /api/transactions/summary?from=&to=&payType=` — 구간 `[from, to)`. 서버 TZ를 쓰던 `queryType`·`summary/today|date|income|expense`는 제거
  - KST는 서머타임이 없어서 dayjs timezone 플러그인(Intl 의존) 대신 **고정 +9시간**. 2단계 새 화면은 `src/lib/date.ts`만 쓰기 (지금 화면의 날짜·시간 피커는 아직 기기 로컬 `Date`)
- [x] 클라·서버 모델/enum 일치, `category`/`content` 살리기 (서버 DTO에 추가, 클라의 없는 필드 `averageTransaction` 제거, 조회 enum은 날짜 작업 때 서버에서 삭제)
- [x] **`Household`/`HouseholdId` 미리 도입** (로그인 전까지는 기본 가계부 1개) — 4장 참고
  - `Households` 테이블 + 기본 가계부(Id=1) 시드, `Transactions.HouseholdId`(FK, 기존 행은 1)
  - EF 전역 쿼리 필터로 현재 가계부 내역만 조회·수정·삭제. 현재 가계부는 `ICurrentHousehold`(지금은 `DefaultHousehold` = 1) → 3단계에서 JWT 기반 구현으로 교체
- [x] EF Core Migrations 도입, 생성자 `EnsureCreated` 제거, DB 설정 한 곳으로 (`DbSettings`, 시작 시 `DbInitializer.Migrate()`. 히스토리 없는 기존 DB는 `InitialCreate` 적용된 것으로 기록)
- [x] 서버 에러 타입 기반 분기로 통일 (컨트롤러 `ErrorResponse()` 하나로. 등록 실패가 서버 에러여도 400 주던 것 수정)
- [x] 클라 데이터 계층: TanStack Query + `useTransactions` 등 훅 분리 (`src/hooks/useTransactions.ts`: 요약 조회 + 등록·수정·삭제 뮤테이션 → 성공 시 조회 자동 무효화, 탭 복귀·앱 복귀 시 재조회)

### 2단계 — 디자인 시스템 & 화면
디자인은 Claude Design 목업 그대로 진행 (사용자 승인). **목업 스크린샷/링크를 `docs/design/`에 넣어두면 그걸 기준으로 구현.**
- [x] 테마 토큰(색·간격·타이포·라운드) + 라이트/다크 (`src/theme/`, 설정의 테마는 기기에 저장)
- [x] 공통 컴포넌트: `Button`, `Card`, `AmountText`, `BottomSheet`, `SegmentedControl`, `Chip` (+ `CategoryIcon`, `ProgressBar`, `MonthSwitcher`, `MonthPickerSheet`, `TransactionRow`, `DonutChart`, `Screen`, `TabBar` — `src/components/`)
- [x] 하단 탭 4개(홈/내역/통계/설정) + 가운데 노란 FAB(`#FFD740`)
- [x] 홈: 이번 달 요약 카드(수입/지출/잔액), 예산 진행률, 최근 내역 5건 (예산은 설정에서 입력, 기기에 저장)
- [x] 내역: 리스트/달력 전환, 기간·입출금 필터 칩, 날짜별 그룹 (기간 칩: 이번 달/오늘/직접 선택)
- [x] 추가: 바텀시트 빠른 입력(출금/입금, 금액 키패드, 카테고리 칩, 날짜·메모). 내역을 누르면 같은 시트가 수정·삭제 모드로
- [x] 통계: 카테고리 도넛, 최근 6개월 막대
- [x] 설정: **목업에 없음** → 아래 구성으로 목업과 같은 스타일로 구현 (서버·로그인이 필요한 항목은 "준비 중")
- 목업 중 3단계로 미룬 것: "누가"(지민/태오) 선택 칩, 사람별 지출, 헤더의 파트너 아바타(지금은 초대 자리 `+`), 카테고리 추가·순서 변경, 월 시작일

#### 설정 화면 구성 (안)
| 섹션 | 항목 | 비고 |
|---|---|---|
| 프로필 | 닉네임, 아바타(🐷/🐰 등 이모지 선택) | 내역에 "누가 썼는지" 표시용 |
| 가계부 공유 | 파트너 연결 상태 / 초대하기 / 초대코드 입력 / 연결 해제 | 3단계 전까지는 "준비 중" 표시 |
| 가계부 | 월 예산, 월 시작일(급여일 기준 1~28일), 카테고리 관리(추가·순서·아이콘) | |
| 화면 | 테마(시스템/라이트/다크) | |
| 알림 | 파트너가 기록하면 알림, 예산 80% 도달 알림 | 3단계 이후 |
| 데이터 | CSV 내보내기 | |
| 정보 | 앱 버전, 로그아웃 | |

### 2.5단계 — UI 피드백 반영 (2026-09-25 사용자 피드백)
> **결정 필요** 표시가 있는 항목은 구현 전에 방향을 정한다. "추천"은 Claude 의견.

#### 홈
- [x] **지난달도 쉽게 보기 — 스와이프로 달 넘기기** → **결정: 탭은 누르기만, 본문 좌우 스와이프 = 달 이동**
  - **2026-09-26 변경:** 화면 전체를 미는 방식 → **달별 페이지를 가로로 이어 붙인 방식**(`MonthPager`, 폰 기본 가로 페이지 스크롤). 끄는 동안 옆 달 내용이 같이 보임. 위쪽(제목·월 표시·필터)은 **고정**(A안, 사용자 결정), 달별 내용만 넘기고 세로 스크롤
- [ ] (C안, 나중에) 아래로 내리면 고정 머리가 접히고 위로 올리면 다시 나타나기 — `ScreenHeader`(머리)와 `MonthPageScroll`(달별 세로 스크롤) 두 곳에만 넣으면 되도록 구조를 모아 둠
  - 걱정: 탭(메뉴) 전환 스와이프와 겹치지 않을까?
  - 현재 상태: 하단 탭은 누르기만 가능하고 좌우 스와이프로 탭을 바꾸는 기능은 **없음** → 지금은 겹치지 않음
  - 추천: 탭 전환은 누르기만 유지하고, **화면 본문 좌우 스와이프 = 이전/다음 달**로 쓴다. (나중에 탭 스와이프를 넣으면 겹치므로 둘 중 하나만)
- [x] 월 선택을 더 직관적으로 (스와이프와 함께 적용: `MonthNavigator` ‹ 9월 ⌄ ›, 월 선택 시트에 "이번 달로", 홈은 다른 달일 때 "이번 달" 버튼)
  - 지금: 헤더 "2026년 9월 ⌄" 누르면 월 선택 시트. 눈에 잘 안 띄고 한 달 이동에도 시트를 열어야 함
  - 안: 헤더에 `‹ 9월 ›` 화살표 추가 + 가운데 누르면 월 선택 시트, 이번 달이 아니면 "이번 달로" 버튼
- [x] **월 예산을 달별로 지정** → **결정: 기본 예산 + 달별 예외, 홈 예산 카드에서 그 달 예산 수정**
  - 예: 8월 예산만 따로 바꾸고 싶은 경우 (목적과는 조금 어긋나지만 자유도)
  - 지금: 예산 하나를 모든 달에 공통 적용 (설정, 기기에만 저장)
  - 추천: "기본 예산" + "달별 예외"(`YYYY-MM` → 금액). 홈 예산 카드를 누르면 **그 달 예산**을 수정. 3단계에서 서버(가계부 단위)로 옮길 때 같은 구조로

#### 내역
- [x] **스와이프로 월 이동** — 홈과 같은 방식 (결정됨)
  - 주의: 필터 칩 줄(가로 스크롤)과 달력 칸 누르기와 제스처가 겹치지 않게 본문 영역만
- [x] **목록 카드에서 바로 삭제·편집** → **결정: 꾹 누르기 메뉴(편집/삭제)**
  - 안 A: 카드를 **꾹 누르면** 메뉴(편집 / 삭제)
  - 안 B: 카드를 **왼쪽으로 스와이프하면** 삭제 버튼 (예전 앱 방식)
  - 주의: 안 B는 "본문 좌우 스와이프 = 달 이동"과 겹침 → 달 스와이프를 넣으면 안 A 추천
- [x] 편집 시트의 삭제 버튼이 좁아서 "한 번 더 누르면 삭제"가 두 줄로 나옴 → 버튼 폭을 넓히거나, 확인 문구를 짧게("삭제 확인") / 확인 창으로

#### 빠른 입력창 (바텀시트)
- [x] 맨 위 손잡이(—)가 모양만 있고 동작이 없음 → **아래로 끌어서 닫기** 구현 (또는 손잡이 제거)
- [x] 날짜·시간 선택 달력의 월·요일이 영어("September", "Sun Mon…") → **한국어**로 (`react-native-calendars`의 `LocaleConfig` 한국어 설정, 부족하면 달력 직접 구현)
- [x] 시간 선택이 달력 바로 밑에 붙어 있어 조잡함 → 날짜/시간을 **탭(세그먼트)으로 나누거나** 시간은 휠 피커로 따로
  - 한국어 달력은 내역의 "기간 직접 선택"에도 같이 적용

#### 앱 전체
- [x] 앱 시작 화면(스플래시) 꾸미기 — 지금은 기본 아이콘 + 흰 배경. 크림색 배경 + 🐷 로고로 (`app.json` splash, 다크모드 배경도)
- [x] 종료 확인 → **결정: Android만.** 다른 탭에서 뒤로가기 = 홈 탭으로, 홈에서 2초 안에 두 번 = 종료(첫 번째에 "한 번 더 누르면 종료돼요" 안내). iOS는 뒤로가기·앱 종료 개념이 없어 해당 없음
- [ ] 통계·설정 피드백은 써보면서 추가 예정

#### 목록 자동 갱신 — "1초마다 새로고침하면 부하가 큰가?" 검토 (2026-09-25)
- **지금 동작:** 주기적 갱신 없음. 탭을 옮겨 오거나, 앱이 백그라운드에서 돌아오거나, 내가 등록·수정·삭제하거나, 당겨서 새로고침할 때 다시 가져옴
- **측정 (확인용 DB, 9월 70건):** 월 요약 1회 ≈ **9KB**, 서버 처리 ≈ **5ms** / 통계 6개월 ≈ **38KB**. 서버 응답 압축(gzip)은 꺼져 있음
- **1초 폴링 시:**
  - 서버: 폰 2대 × 초당 1회 = 초당 2요청, 각 5ms → **서버 부하는 거의 없음** (SQLite로도 충분)
  - 폰: 홈 화면에서 시간당 ≈ **32MB**, 통계 화면이면 ≈ **140MB** 데이터 사용. 통신 모듈이 계속 깨어 있어 **배터리 소모가 큼** → 이게 진짜 비용
  - 화면: 데이터가 같으면 TanStack Query가 같은 객체를 돌려줘서 다시 그리지 않음 → 화면 부하는 작음
- 검토한 안:
  1. 앱이 켜져 있고 화면이 보일 때만 30초마다 갱신 (`refetchInterval`) → 시간당 ≈ 1MB
  2. 서버 응답 압축 켜기 (`AddResponseCompression`) → 9KB가 대략 2KB 안팎으로
  3. 다른 멤버가 기록하면 **서버가 알려주는 방식** → 폴링 없이 즉시 반영
- **결정 (사용자, 2026-09-25): 3번.** 주기적 자동 갱신은 넣지 않는다. 지금처럼 탭 이동·앱 복귀·내 변경·당겨서 새로고침 때만 다시 가져오고, 3단계에서 실시간 반영을 붙인다 (3단계 항목 참고). 2번(압축)은 부담 없으니 서버 외부 공개 때 같이 켜도 됨

### 3단계 — 기능 확장
- [ ] 카테고리 (DB `Category` 컬럼 활용), 예산 (`TotalBudget`)
- [ ] 서버 외부 공개 (클라우드 VM 또는 Cloudflare Tunnel) + HTTPS 도메인
- [ ] 카카오 로그인 → 서버 JWT 발급, API 인증 적용
- [ ] 가계부 공유 — 커플·여러 명 (4장)
- [ ] 실시간 반영: 다른 멤버가 기록하면 바로 목록 갱신 — 앱이 켜져 있을 땐 SignalR(WebSocket)로 "바뀌었음" 신호 → 해당 조회만 무효화. 앱이 꺼져 있을 땐 푸시 알림("○○님이 기록했어요", dev build 필요)

---

## 4. 가계부 공유 설계 (커플·여러 명)

"사람끼리 친구"가 아니라 **가계부(Household)를 공유**하는 구조. `HouseholdMember`가 N명을 담으므로 커플(2명)이든 가족(여러 명)이든 같은 구조로 된다.

```
User            (Id, KakaoId, Nickname, Avatar)
Household       (Id, Name)
HouseholdMember (HouseholdId, UserId, Role, JoinedAt)
Invite          (Code, HouseholdId, InviterId, ExpiresAt, UsedBy, UsedAt)
Transaction     (+ HouseholdId, + CreatedByUserId)
```

### 흐름
1. A가 "초대하기" → `POST /api/invites` → 코드(예: `AB12CD`, 24시간, 1회용) + 링크 `https://<도메인>/invite/AB12CD`
2. RN `Share.share()`로 카톡 공유 (메시지에 **코드도 텍스트로** 포함 — 앱 미설치 시 링크 파라미터 유실 대비)
3. B가 링크 탭 → 앱 열림(`app/invite/[code].tsx`) 또는 앱 내 "초대코드 입력"
4. B 로그인 → `GET /api/invites/{code}`로 미리보기 → `POST /api/invites/{code}/accept`
5. 서버 검증(만료·사용됨·본인 여부) 후 B를 A의 Household 멤버로 추가. B의 기존 개인 내역은 합칠지/버릴지 선택
6. 나가기: `DELETE /api/households/{id}/members/me` / 내보내기(방장): `DELETE /api/households/{id}/members/{userId}`

### 메모
- 카카오톡 공유 카드(SDK)·카카오 로그인은 네이티브 모듈이라 **Expo Go 불가, dev build 필요**. 초기엔 `Share.share()`로 시작.
- 앱이 바로 열리는 링크(Universal Links / App Links)는 HTTPS 도메인 필요.
- 초대코드: 충분히 랜덤, 만료, 1회용, 시도 횟수 제한.

### 여러 명일 때 달라지는 점 (2026-09-25 추가)
- **역할:** `Owner`(방장: 초대·내보내기·가계부 삭제) / `Member`. 방장이 나가면 다른 멤버에게 넘김
- **초대:** 한 명 초대할 때마다 1회용 코드 발급 (여러 번 쓰는 링크는 유출 위험) — 결정 필요
- **인원 제한:** 예) 최대 10명 — 결정 필요
- **한 사람이 가계부 여러 개?** 예) 개인용 + 커플용 + 가족용 → 헤더에서 가계부 전환. 결정 필요 (처음엔 1개로 시작하고 구조만 열어두기 추천)
- **나간 멤버의 내역:** 지우지 않고 남김, 작성자는 "나간 멤버"로 표시
- **UI:**
  - 홈 헤더: 멤버 아바타 겹쳐서 표시, 많으면 `+N`
  - 빠른 입력 "누가": 멤버 칩 N개 + "같이"
  - 홈 예산 카드·통계: 사람별 지출 (멤버마다 색 지정)
  - 설정 "가계부 공유": 멤버 목록, 초대하기, 내보내기(방장)
- 용어: 화면에서 "파트너/커플" 대신 **"멤버", "함께 쓰는 사람"** — 2명일 때만 "파트너"로 보여줄지는 결정 필요

---

## 5. 진행 기록
- 2026-09-24: 검수 완료, 로드맵 수립, 개발 컨테이너 구성(`docker-compose.yml`, `.devcontainer/`, `.env.example`). UI는 Claude Design 목업 승인(설정 화면 제외).
- 2026-09-25: 0단계 진행 — `rebuild` 브랜치 생성, 작업중 변경사항 커밋, API 주소 환경변수화, `.gitattributes` 추가. 삭제 항목은 사용자 확인 대기, 컨테이너 실행 확인 대기.
- 2026-09-25: 컨테이너 실행 확인 — 서버 빌드가 Windows `obj/` 권한 문제로 실패 → `Directory.Build.props`로 Linux 빌드 산출물 분리해 해결. 서버(Swagger 200, `/api/transactions` 200, `/data/db/gageabu.db` 생성), Metro(8081, 매니페스트 LAN IP 정상), Android 번들(1908 모듈, API URL 주입 확인) OK. 참고: `tsc` 기존 에러 2건(`ExternalLink`, `IconSymbol`), `expo start`가 expo 패키지 버전 불일치 경고(`npx expo install --fix` 후보, 1단계에서).
- 2026-09-25: 0단계 완료 — 사용자 확인 후 삭제: 템플릿 컴포넌트 5종·`explore.tsx`(탭 등록도 제거 → 현재 탭은 홈/추가 2개)·`reset-project`, `Server/`(구 DB 포함), WinForms `Gagebu_Client`, `testfile.txt`, `GagebuClient/Dockerfile.dev`·`.dockerignore`, 루트 `.expo/`, `SharedModelDll/`, 중복 enum(`Gagebu Server/Shared`, .sln 항목). `.gitignore`는 bin/obj/.vs/.expo/*.db 일반 규칙으로 정리. 삭제 후 솔루션 빌드·Android 번들 OK, `tsc` 남은 에러는 `IconSymbol` 1건. **다음: 1단계.**
- 2026-09-25: 1단계 시작 — EF 마이그레이션 도입(`InitialCreate` + 기존 DB 이어받기), 날짜 UTC 전환(`ConvertDatesToUtc` -9시간 보정, summary API `from`/`to`, 클라 `src/lib/date.ts`). 버그 #1(요청 2번), 달력 `toISOString` 버그, 날짜 선택 후 "시간 선택" 누르면 날짜가 되돌아가던 문제 수정. 검증: 기존 데이터 복사본 DB로 보정·조회·등록·수정, KST 자정 직후 경계, 기기 TZ(서울/UTC/뉴욕)별 구간 계산, Android 번들. 폰 실사용 확인은 아직.
- 2026-09-25: 모델 맞춤(`category`/`content` 저장·조회), 에러 응답을 `ErrorType` 기준으로 통일. 남은 1단계: Household 도입, TanStack Query.
- 2026-09-25: Household 도입(`AddHousehold` 마이그레이션, 전역 쿼리 필터). 옛 스키마 DB에 마이그레이션 3개 연속 적용·다른 가계부 내역 격리(404) 확인. 남은 1단계: TanStack Query.
- 2026-09-25: **1단계 완료** — TanStack Query 도입(홈 수동 fetch·`useRef` 상태 제거 → 조회 조건 state + `useTransactionSummary`, 등록·수정·삭제는 뮤테이션). 부수 수정: 버튼 강조 버그 #2, 편집 저장 후 필터가 '전체'로 풀리던 것, 날짜 범위를 다 안 고르고 확인하면 강조만 바뀌던 것. 검증은 tsc·Android 번들까지(화면 조작은 폰에서 확인 필요). **다음: 2단계(디자인 시스템 & 화면).**
- 2026-09-25: **2단계 완료** — 목업 기준 새 화면(홈/내역/추가 시트/통계/설정) + 디자인 시스템 + 다크모드. 옛 화면·템플릿 컴포넌트 삭제, 금액·날짜 단위 테스트(`src/lib/__tests__`, jest) 추가. 검증: 웹 미리보기 스크린샷(라이트/다크, 등록·수정 흐름), `tsc` 에러 0, Android 번들. 폰 실기기 확인은 아직(Expo Go SDK 불일치). 발견: 9p 마운트라 Metro 핫 리로드 불가(1장 주의 참고). **다음: 3단계(기능 확장) 또는 SDK 업그레이드.**
- 2026-09-25: **Expo SDK 54 → 57 업그레이드** (55 → 56 → 57 한 단계씩). 안 쓰는 패키지 제거, `newArchEnabled` 제거, React Navigation import를 `expo-router/react-navigation`·`expo-router/js-tabs`로(공식 codemod), TS 6 대응(`tsconfig` types에 jest), `@react-native/jest-preset` 추가. 확인: expo-doctor 21/21, tsc, jest 21, Android·iOS 번들, 웹 화면. 남은 것: `@expo/vector-icons` 지원 중단 예정 → 나중에 `npx @react-native-vector-icons/codemod`로 이전(지금은 직접 의존성이라 동작함). 설치 시 peer 충돌이 나면 `--legacy-peer-deps`.
- 2026-09-25: 사용자 UI 피드백을 2.5단계로 기록 (홈·내역 월 스와이프, 월 선택, 달별 예산, 시트 손잡이, 달력 한국어, 시간 선택 배치). 스와이프·달별 예산은 방향 결정 필요.
- 2026-09-25: UI 피드백 추가 기록(내역 카드 꾹 누르기/스와이프 삭제, 삭제 버튼 두 줄, 시작 화면, 종료 확인), 1초 폴링 부하 검토(서버는 가벼움, 폰 데이터·배터리가 문제 → 30초 + 압축 + 3단계 푸시 추천).
- 2026-09-25: 목표를 커플 → 여러 명 공유 가계부로 확장(4장 보완). 목록 갱신은 주기적 폴링 없이 3단계 실시간 반영(SignalR + 푸시)으로 결정.
- 2026-09-26: **2.5단계 완료** — 빠른 입력(한국어 달력, 날짜/시간 탭+격자, 끌어서 닫기, 삭제 버튼), 카드 꾹 누르기 메뉴, 홈·내역·통계 좌우 스와이프로 달 이동(+스와이프 직후 누름 무시), 월 선택 개선, 달별 예산, Android 두 번 뒤로가기 종료, 시작 화면. 검증: 웹 미리보기 스크린샷, tsc, jest 21, Android 번들. Android 뒤로가기·시작 화면은 실기기에서만 확인 가능(시작 화면은 dev build/설치 앱에서 확실히 보임).
- 2026-09-26: 달 넘김을 달별 페이지 방식(`MonthPager`)으로 교체 — 끄는 동안 옆 달이 같이 보임, 머리 고정(A안). 스와이프 끊김·Android 검은 테두리(반투명+그림자) 수정도 포함. C안(접히는 머리)은 나중에.
