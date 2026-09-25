# Gageabu 재개발 계획

> 둘이 같이 쓰는 커플 가계부. 클라이언트 = Expo(React Native), 서버 = ASP.NET Core 8 + EF Core + SQLite.
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
- [ ] **지난달도 쉽게 보기 — 스와이프로 달 넘기기 (결정 필요)**
  - 걱정: 탭(메뉴) 전환 스와이프와 겹치지 않을까?
  - 현재 상태: 하단 탭은 누르기만 가능하고 좌우 스와이프로 탭을 바꾸는 기능은 **없음** → 지금은 겹치지 않음
  - 추천: 탭 전환은 누르기만 유지하고, **화면 본문 좌우 스와이프 = 이전/다음 달**로 쓴다. (나중에 탭 스와이프를 넣으면 겹치므로 둘 중 하나만)
- [ ] 스와이프가 안 되면 → 월 선택을 더 직관적으로
  - 지금: 헤더 "2026년 9월 ⌄" 누르면 월 선택 시트. 눈에 잘 안 띄고 한 달 이동에도 시트를 열어야 함
  - 안: 헤더에 `‹ 9월 ›` 화살표 추가 + 가운데 누르면 월 선택 시트, 이번 달이 아니면 "이번 달로" 버튼
- [ ] **월 예산을 달별로 지정 (결정 필요)**
  - 예: 8월 예산만 따로 바꾸고 싶은 경우 (목적과는 조금 어긋나지만 자유도)
  - 지금: 예산 하나를 모든 달에 공통 적용 (설정, 기기에만 저장)
  - 추천: "기본 예산" + "달별 예외"(`YYYY-MM` → 금액). 홈 예산 카드를 누르면 **그 달 예산**을 수정. 3단계에서 서버(가계부 단위)로 옮길 때 같은 구조로

#### 내역
- [ ] **스와이프로 월 이동 (결정 필요)** — 홈과 같은 방식으로 통일
  - 주의: 필터 칩 줄(가로 스크롤)과 달력 칸 누르기와 제스처가 겹치지 않게 본문 영역만

#### 빠른 입력창 (바텀시트)
- [ ] 맨 위 손잡이(—)가 모양만 있고 동작이 없음 → **아래로 끌어서 닫기** 구현 (또는 손잡이 제거)
- [ ] 날짜·시간 선택 달력의 월·요일이 영어("September", "Sun Mon…") → **한국어**로 (`react-native-calendars`의 `LocaleConfig` 한국어 설정, 부족하면 달력 직접 구현)
- [ ] 시간 선택이 달력 바로 밑에 붙어 있어 조잡함 → 날짜/시간을 **탭(세그먼트)으로 나누거나** 시간은 휠 피커로 따로
  - 한국어 달력은 내역의 "기간 직접 선택"에도 같이 적용

### 3단계 — 기능 확장
- [ ] 카테고리 (DB `Category` 컬럼 활용), 예산 (`TotalBudget`)
- [ ] 서버 외부 공개 (클라우드 VM 또는 Cloudflare Tunnel) + HTTPS 도메인
- [ ] 카카오 로그인 → 서버 JWT 발급, API 인증 적용
- [ ] 커플 연결 (4장)

---

## 4. 커플 연결 설계

"사람끼리 친구"가 아니라 **가계부(Household)를 공유**하는 구조.

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
6. 연결 해제: `DELETE /api/households/me/members`

### 메모
- 카카오톡 공유 카드(SDK)·카카오 로그인은 네이티브 모듈이라 **Expo Go 불가, dev build 필요**. 초기엔 `Share.share()`로 시작.
- 앱이 바로 열리는 링크(Universal Links / App Links)는 HTTPS 도메인 필요.
- 초대코드: 충분히 랜덤, 만료, 1회용, 시도 횟수 제한.

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
