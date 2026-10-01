# Gageabu 재개발 계획

> 여럿이 같이 쓰는 공유 가계부 (처음 목표는 커플, 가족·룸메이트 등 여러 명도 지원). 클라이언트 = Expo(React Native), 서버 = ASP.NET Core 8 + EF Core + PostgreSQL (2026-09-27 SQLite에서 전환).
> 이 문서는 개발 세션 간 인수인계용입니다. 단계를 끝낼 때마다 체크박스와 "진행 기록"을 갱신하세요.

---

## 1. 개발 환경 (Windows 클라이언트 + Docker API)

**Expo/Metro/npm은 Windows 로컬, API/dotnet/EF는 Docker Desktop + WSL2에서 실행한다.**
실행·디버깅·백업·폰 연결 명령은 [DEVELOPMENT.md](DEVELOPMENT.md)를 기준으로 한다.

- `docker-compose.yml`의 `api` 서비스가 `dotnet watch`를 자동 실행한다.
- 앱 API 주소는 `GagebuClient/.env.local`의 `EXPO_PUBLIC_API_URL`로 관리한다.
- DB는 `db` 서비스(PostgreSQL 18, 볼륨 `gageabu_pg-data`). 전환 전 SQLite 볼륨 `gageabu_gagebu-db`와 Claude Code 로그인 볼륨은 보존한다.
- `.devcontainer/`는 API 편집용이다. 컨테이너에서 클라이언트 npm 명령을 실행하지 않는다.
- 마이그레이션은 PostgreSQL 기준 새 InitialCreate부터. SQLite 마이그레이션과 UTC 보정 이력은 Git 기록에 남아 있다.
- 과거 코드 기준 검수/진행 기록은 아래에 남긴다. 현재 코드의 미해결 문제 목록과 구분해서 읽는다.

---

## 2. 과거 검수 결과 (2026-09-24 당시 코드 기준)

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
- [x] 서버가 꺼졌거나 연결이 안 될 때 안내 (사용자 피드백 2026-09-27)
  - 요청 시간 제한 6초(axios 기본은 무제한이라 '불러오는 중…'에서 멈춰 있었음), 실패 시 재시도 1번
  - 데이터가 없으면 `ErrorState`(연결 안 됨 / 응답 없음 / 서버 오류 구분 + 다시 시도), 이전 데이터가 있으면 위에 얇은 띠
  - 처음 불러오는 동안은 로딩 표시 (모르는 값을 ₩0으로 보여주지 않음), 저장·삭제 실패 문구 통일
  - 화면 코드 예외로 앱이 하얗게 죽지 않게 루트 에러 경계(`ErrorBoundary`)
- 참고: 시작 화면·뒤로가기 종료 안내는 **Expo Go에서는 Expo Go 것이 보임** (Expo Go 로딩 화면, 'Expo' 아이콘·Expo Go 종료). development build/설치 앱에서 우리 앱으로 동작
- [x] 돼지로 상태 표시 (사용자 피드백 2026-09-27): 앱 이름 옆은 저금통, 요약 카드·예산 바는 예산 안 = 부유한 돼지(통통·금화) / 초과 = 홀쭉한 돼지(울상·식은땀) / 예산 없음 = 보통 돼지. → 직접 그린 버전이 외계인처럼 보인다는 피드백으로 **Noto 🐷 얼굴(Apache 2.0)을 바탕**으로 가로 비율·표정·소품만 바꾸도록 변경 (`src/components/Pig.tsx`, `notoPigFace.ts`)
- [x] 바텀시트가 키보드에 가려짐(설정 예산 입력) → 키보드 높이만큼 시트를 올림 (SDK 57 Android는 edge-to-edge라 화면이 줄지 않음). 빠른 입력은 메모 입력 중 숫자 키패드 숨김
  - 2차 피드백: 그래도 키보드가 저장·예산 끄기를 가리고, 키보드를 내린 뒤 저장이 가끔 안 눌림 → **예산 입력은 시스템 키보드 대신 앱 숫자 키패드**(빠른 입력과 같은 `Keypad`). 메모처럼 키보드가 꼭 필요한 곳은 Android 내비게이션 바 높이까지 더해서 올림
- [x] 저장 버튼이 잘 안 눌림 (3차: 예산 끄기 후 다시 설정할 때만 안 눌림 → 버튼이 비활성으로 시작했다가 활성이 되는 경우. Android에서 Pressable disabled → 활성 전환이 반영 안 되는 문제로 보고, 공용 Button은 disabled를 쓰지 않고 흐리게 + 누름 무시로 변경) / 1차 원인: 저장 후 열린 모든 달 목록을 다시 받을 때까지 기다리던 것을 기다리지 않게 (성공 즉시 닫힘)
- [x] 새 목업 반영 (2026-09-27, Claude Design): 홈 요약 카드에 **저금통 돼지** + 상태 문구 칩("보통 돼지 · 예산대로 가는 중"), 상태 3단계(부자 <70% / 보통 70~100% / 홀쭉 >100%), 제목 옆 아이콘 제거. 월 표시는 사용자 요청 배치(‹ 9월 › ⌄) 유지
  - 목업 중 3단계(사용자·로그인) 필요: 내역 작성자 표시(지/태), 내역 필터의 사람 칩, 빠른 입력 '누가', 예산 카드 사람별 지출
- [x] 홈 금액 표시 (2026-09-27): 함께 모은 돈 +는 파랑, -는 빨강 + 귀여운 글꼴(주아체 Jua, OFL). 상태 문구를 자연스러운 말투로("부자 돼지예요! 아직 넉넉해요" 등). 예산 카드 아래 미니 박스 `남은 날짜 : 6일` `일 권장 금액 : 113,800원`. 화면 문구에서 가운뎃점(·) 모두 제거
- [x] 돼지 그림을 PNG 키트로 교체 (2026-09-27, `docs/design/pig-react-kit`): 요약 카드 메인 돼지 wealthy/normal/hungry(80~96px), 예산 바 얼굴 happy/concerned/crying(28px, 바 높이 8px, 채워진 끝에 얼굴, 0%·100%에서 안쪽 보정, 100% 넘으면 숫자만 실제 비율). 상태 기준은 그대로(70% 미만 / 70~100% / 100% 초과), 계산은 `src/lib/pigState.ts`. 원본(1254px)은 키트 폴더에만 두고 앱에는 표시 크기 사본(`assets/images/pig`, @2x/@3x)만
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
> 2026-09-27 작업 순서: 개발환경 분리 → 빈 PostgreSQL DB로 전환·API 검증 → 개발용 로그인·멤버·초대·작성자·공유 예산 → 실시간 반영.
> 클라우드 구성은 PostgreSQL 전환 후 시작하고, 실제 인증·권한·HTTPS·백업을 갖춘 뒤 외부 테스트한다. dev build 준비는 병행한다.
- [x] PostgreSQL 개발 서비스와 EF 전환, 거래 CRUD·UTC 날짜 검증 (기존 SQLite 테스트 데이터 8건은 복사·대조함 — **유지** (사용자 결정 2026-09-27))
- [ ] 카테고리 (DB `Category` 컬럼 활용), 예산 (`TotalBudget`)
  - [x] 서버: 가계부별 예산 저장 — 기본 월 예산 + 달별 예외(0 = 그 달 예산 없음), 멤버 누구나 수정, 테스트 12개 (2026-09-27)
  - [x] (2026-09-27) 앱: 설정의 `monthlyBudget`/`budgetOverrides`(폰 저장)를 `/api/budget`으로 교체. 폰에 있던 값은 첫 연결 때 한 번 서버로 올리기
  - [ ] 카테고리 관리(추가·순서·아이콘)는 아직 앱 고정 목록 — 서버 저장은 필요해지면
- [ ] 클라우드 서버 운영 구성 + HTTPS 도메인 + 백업·복원 + 상태 확인
  - [x] 운영 구성 준비: `docker-compose.prod.yml`(api·db·caddy 자동 HTTPS), 운영 이미지(일반 사용자 실행), 운영 설정(개발 로그인·익명·Swagger 차단, CORS 지정 주소만, 프록시 헤더), [DEPLOY.md](DEPLOY.md) 배포·백업·복원 — 로컬에서 운영 구성 시험 통과 (2026-09-27)
  - [x] 결정(사용자, 2026-09-27): **클라우드 VM, 최대한 무료로.** 추천안 = Oracle Cloud Always Free ARM VM(서울·춘천 리전) + 무료 도메인(DuckDNS 서브도메인) 또는 저렴한 도메인 구입
  - [x] **배포 완료 (2026-09-27)** — `https://gageabu-jun.duckdns.org`, Oracle 오사카 AMD 마이크로(A1 용량 부족으로 대신, 무료). 자세한 건 DEPLOY.md "지금 운영 중인 서버"
  - [ ] A1(ARM) 자리가 나면 이사 (선택)
- [ ] 카카오 로그인 → 서버 JWT 발급, API 인증 적용
  - [x] 서버: `POST /api/auth/kakao` — 앱의 카카오 accessToken을 카카오에 확인(토큰 정보 → **우리 앱 ID인지 검사** → 사용자 정보), `KakaoId`로 사용자 찾기/만들기 → 우리 JWT. 앱 ID 미설정이면 503. 테스트 12개 (2026-09-27)
  - [x] 카카오 개발자 콘솔에 앱 등록(앱 ID 1589304, 2026-09-27) — 로그인 ON, 동의항목 닉네임. 개발 `.env`에 `KAKAO_APP_ID` 설정, 서버가 카카오에 토큰 확인까지 동작 확인. 네이티브 앱 키는 앱(dev build) 전환 때
  - [ ] 연결 해제 웹훅: 사용자가 카카오에서 앱 연결을 끊으면 서버가 받아서 정리 — 공개 HTTPS 주소가 필요해 클라우드 배포 뒤. 콘솔 "웹훅"에 등록
  - [ ] 앱: 카카오 SDK 로그인(dev build 필요) → `/api/auth/kakao`
  - [ ] 개발용으로 만든 사용자를 카카오 계정에 연결할지 (지금은 별개 사용자)
- [ ] 가계부 공유 — 커플·여러 명 (4장)
  - [x] 서버: 사용자·멤버·초대 테이블, JWT, 개발용 로그인, 초대·수락(내역 합치기)·나가기·내보내기, 작성자 기록, 테스트 25개 (2026-09-27)
  - [x] 앱 (2026-09-27): 로그인(개발용, 카카오는 dev build 때), 토큰 저장·헤더, 설정 "가계부 공유" 화면(멤버·초대·코드 입력·내보내기), 내역에 작성자 표시
  - [ ] 운영 전: 익명 허용 끄기, 카카오 로그인으로 교체
  - [x] 토큰 갱신 — **결정(사용자, 2026-09-27): B안 = 기기별 로그인 관리.** (서버·앱 완료 2026-09-27) 짧은 접근 토큰(1시간) + 기기별 갱신 토큰(서버 저장, 쓸 때마다 교체), 설정에서 기기 목록·"이 기기 로그아웃", 분실 폰만 끊기 가능
- [ ] 실시간 반영: 다른 멤버가 기록하면 바로 목록 갱신 — 앱이 켜져 있을 땐 SignalR(WebSocket)로 "바뀌었음" 신호 → 해당 조회만 무효화. 앱이 꺼져 있을 땐 푸시 알림("○○님이 기록했어요", dev build 필요)
  - [x] 서버: SignalR 허브 `/hubs/household`, 거래·예산·멤버 변경 시 `changed {kind}` 신호(데이터 없음), 틀린 토큰은 연결 단계 401, 테스트 5개 (2026-09-27)
  - [x] (2026-09-27) 앱: `@microsoft/signalr`로 연결(토큰은 `accessTokenFactory`), `changed` 받으면 kind별 TanStack Query 무효화(transactions → 내역·요약, budget → 예산, household → 내 정보), 앱 복귀 시 재연결
  - [ ] 앱이 꺼져 있을 때 푸시 알림 (dev build 필요)

### 4단계 — 영수증 스캔 (비용 없음, 인식 규칙 직접 구현)
> **결정 (사용자, 2026-09-27): 유료 AI/OCR API는 쓰지 않는다.** 글자 읽기는 폰 안에서 무료로, "어느 게 합계인지" 찾는 규칙은 직접 만든다.

**흐름:** 촬영/갤러리 → 폰 OCR → .NET 분석 작업 생성 → Python 합계·날짜·상호·분류 추천 → 앱에서 초안 확인·수정 → .NET 일괄 확정 저장. 추천만으로 거래를 저장하지 않는다.

**글자 인식(OCR) — 무료**
- 1순위: **Google ML Kit Text Recognition v2 (한국어 모델)** — 폰 안에서 동작, 무료, 오프라인, 사진이 밖으로 안 나감. 네이티브 모듈이라 **Expo Go 불가 → development build 필요** (3단계 카카오 로그인과 같은 전환)
- 대안: 서버에서 Tesseract(kor) — 무료이고 Expo Go에서도 되지만 정확도가 낮음. dev build 전에 규칙을 먼저 만들어 볼 때만 임시로

**추출 규칙 (Python에서 직접 구현·테스트, 앱에 같은 규칙을 중복 구현하지 않음)**
1. 줄 정리: OCR 결과를 글자 위치(y)로 줄 단위로 묶고, 같은 줄 안에서 왼쪽→오른쪽
2. 금액 찾기: `12,000` / `12000` / `12,000원` 형태. 1원 단위 숫자, 전화번호·사업자번호·카드번호 패턴은 제외
3. **합계** 우선순위: 키워드가 있는 줄의 오른쪽 금액
   - 우선: `합계`, `합 계`, `총액`, `총 금액`, `결제금액`, `받을금액`, `청구금액`, `카드결제`, `승인금액`
   - 제외: `부가세`, `과세`, `면세`, `공급가액`, `받은돈`/`받은금액`, `거스름돈`, `할인`, `포인트`
   - 키워드가 없으면: 아래쪽 절반에서 가장 큰 금액 (거스름돈 줄 제외)
4. **날짜·시간**: `2026-09-24`, `2026.09.24`, `26/09/24`, `2026년 9월 24일` + `21:30(:15)`. 없으면 촬영 시각
5. **가게 이름**: 위쪽 1~3줄 중 `영수증`·`카드`·번호 패턴이 아닌 줄, `상호:`·`가맹점명:` 뒤 글자 우선
6. **카테고리 추측**: 가게 이름 키워드 사전 (예: 스타벅스·커피·카페 → 카페 / GS25·CU·세븐일레븐·이마트 → 생활 / 택시·버스·주유 → 교통 / 쿠팡·다이소 → 쇼핑 / 식당·국밥·치킨 → 식비). 나중엔 **내가 예전에 같은 가게를 어떤 카테고리로 저장했는지**를 우선
7. 확신이 낮으면 칸을 채우되 표시해서 사용자가 확인하게

**할 일**
- [ ] 샘플 영수증 모으기 (편의점·카페·식당·마트·카드 전표 등 20장 이상, 개인정보는 가리기) → OCR 결과 텍스트를 테스트 데이터로 저장 — **영수증 촬영 기능을 넣을 때 같이 (사용자 결정 2026-09-27)**
- [ ] Python 추출·분류 규칙 + 텍스트 샘플 테스트
  - [x] 1차 규칙(`rules-0.1`, 2026-09-27): 줄 정리(위치로 같은 높이 합치기), 금액(카드·사업자·전화·날짜·시간·번호 줄 제외, 1~2자리는 "원"일 때만), 합계(키워드 점수 + 제외어, 다음 줄 금액, 없으면 아래쪽 최대값), 날짜(4가지 형식 + 오전/오후, 없으면 촬영 시각), 가게(상호·가맹점명 라벨 → 위쪽 3줄), 카테고리(가게 키워드 사전, 앱 카테고리 이름). 확신도 필드별. 가상 영수증으로 테스트 17개
  - [ ] 실제 영수증 샘플로 규칙 다듬기 (샘플이 모이면 `receipt-worker/tests/`에 추가)
  - [x] 같은 가게를 예전에 어떤 카테고리로 저장했는지 우선 — 서버가 보여줄 때 적용(엔진 추천은 그대로), `categoryFromHistory: true`, 같은 가계부만, 띄어쓰기·대소문자 무시 (2026-09-27)
- [x] .NET 분석 작업·추천 초안·일괄 확정 API, 재전송 중복 방지
- [x] 원본 추천과 최종 수정값, 엔진 버전, 실패 사유, 최종 거래 연결 기록
  - 서버 API(2026-09-27): 앱 `POST /api/receipts {clientRequestId, capturedAt, lines[{text, top, left, width, height}]}`(202, 같은 요청 Id 재전송 = 기존 작업 200) · `GET /api/receipts`(열린 것) · `GET /api/receipts/{id}` · `POST /api/receipts/{id}/confirm {transactions[]}`(여러 건 한 번에, 재전송 안전) · `DELETE`(버리기). 워커 `POST /internal/receipts/claim`(204 = 없음) · `/{id}/result {engineVersion, suggestion}` · `/{id}/fail {reason}` — `X-Worker-Key` 필요, 운영에서는 Caddy가 `/internal` 차단. 상태: Pending → Processing → Ready/Failed → Confirmed/Discarded. 2분 안에 결과가 없으면 다시 대기열, 3번 넘으면 실패. 사진은 받지 않음(기본안). SignalR `receipts` 신호
- [ ] 카메라/갤러리 (`expo-image-picker`, Expo Go 가능) + 빠른 입력 📷 버튼 + 분석 중 표시
- [ ] ML Kit 연결 (development build 전환 후)
- [ ] 결정 필요: 영수증 사진 **보관 여부** (기본안: 보관 안 함 — 분석 후 버림)

### 5단계 — 지출 위치 지도 (영수증 다음, 2026-09-27 사용자 추가)
지출을 기록할 때 위치를 남기고, 지도에서 어디서 썼는지 본다.
- [ ] 거래에 위치(위도·경도, 장소 이름) 저장 — 서버 컬럼·API, 선택 입력
- [ ] 기록할 때 현재 위치 자동 채우기(권한 허용 시) / 지도에서 고르기 / 영수증 가게 이름으로 장소 검색
- [ ] 지도 화면: 달별 지출 핀, 핀 누르면 내역
- [ ] 결정 필요: 지도 서비스(카카오맵 / 네이버 지도 / 구글 지도 — 한국 장소 검색은 카카오·네이버가 강함), 무료 사용량
- [ ] 개인정보: 위치는 같은 가계부 멤버만, 끄기 설정

> **진행 순서 (사용자, 2026-09-27):** 토큰 갱신(B안) → **백엔드 클라우드 배포** → 영수증 기능(앱) → 지도 기능

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

### 서버 API (2026-09-27 구현)
모든 요청은 `Authorization: Bearer <token>`. 개발 환경에서만 토큰 없이 = 기본 가계부(지금 앱 호환).

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/auth/dev-login` | `{key, nickname?, avatar?, deviceName?}` → 로그인 응답. Development + 설정일 때만 |
| POST | `/api/auth/kakao` | `{accessToken, deviceName?}`(앱의 카카오 SDK 결과) → 로그인 응답. `Kakao__AppId` 없으면 503 |
| POST | `/api/auth/refresh` | `{refreshToken}` → `{token, expiresAt, refreshToken, sessionId}`. 접근 토큰이 401이면 호출, **받은 새 refreshToken으로 바꿔 저장** |
| POST | `/api/auth/logout` | 이 기기 로그아웃 (접근 토큰도 바로 막힘) |
| GET / DELETE | `/api/auth/sessions`, `/api/auth/sessions/{id}` | 내 로그인 기기 목록(`current` 표시) / 기기 하나 끊기 |

로그인 응답(dev-login·kakao) = `{token(접근, 1시간), expiresAt, refreshToken(쓸 때마다 교체, 마지막 사용부터 60일), sessionId, me}`.
앱: 두 토큰을 안전 저장소(`expo-secure-store`)에 두고, 401이 오면 refresh 한 번 → 원래 요청 재시도, refresh도 401이면 로그인 화면.
| GET / PATCH | `/api/me` | 내 정보(사용자 + 가계부 + 멤버) / 닉네임·아바타 수정 |
| GET / PATCH | `/api/household` | 지금 가계부 / 이름 변경(방장) |
| DELETE | `/api/household/members/me` | 나가기 → 새 개인 가계부가 담긴 `me` |
| DELETE | `/api/household/members/{userId}` | 내보내기(방장) |
| POST | `/api/invites` | 초대 코드 발급(방장) → `{code, expiresAt}`. 새 코드 발급 시 같은 가계부의 이전 미사용 코드는 만료, 최신 코드 하나만 유효 |
| GET | `/api/invites/{code}` | 미리보기 `{householdName, inviterNickname, memberCount, expiresAt}` |
| POST | `/api/invites/{code}/accept` | `{mergeMyTransactions}` → `me` |
| GET | `/api/budget` | `{defaultAmount, overrides: [{month: "YYYY-MM", amount}]}` (앱 설정과 같은 모양) |
| PUT | `/api/budget/default` | `{amount}` (null = 해제) → 예산 전체 |
| GET | `/api/budget/months/{YYYY-MM}` | 그 달에 적용되는 예산 `{month, amount, isOverride}` |
| PUT / DELETE | `/api/budget/months/{YYYY-MM}` | 그 달만 따로 정하기 `{amount}`(0 = 예산 없음) / 지우고 기본으로 |
| SignalR | `/hubs/household` | 서버 → 앱 `changed {kind}` (`transactions` / `budget` / `household`). 웹소켓은 `?access_token=`. 연결 후 `Ping` 응답 = 그룹 가입 완료 → 그때 한 번 다시 조회 |

- 첫 로그인 사용자는 기본 가계부(Id 1, 로그인 도입 전 내역)의 방장. 그 뒤 사용자는 "○○의 가계부"를 새로 받음
- 가계부 소속은 토큰이 아니라 요청마다 DB에서 확인 → 내보내면 같은 토큰으로도 바로 못 봄
- 오류: 400 입력, 401 로그인 필요, 403 방장 아님, 404 없음, 409 이미 멤버·인원 초과, 410 만료·사용된 코드, 429 시도 초과
- 거래 응답에 `createdByUserId` 추가 (로그인 전 내역은 null)

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
- **초대:** 한 명 초대할 때마다 1회용 코드 발급 (여러 번 쓰는 링크는 유출 위험) — **기본안 적용(2026-09-27, 사용자 확인 전)**: 8자리(헷갈리는 글자 제외), 24시간, 1회용, 방장만 발급, 코드 조회·수락은 사용자마다 10분에 10번
- **인원 제한:** 예) 최대 10명 — **기본안 적용: 10명** (`HouseholdService.MaxMembers`)
- **한 사람이 가계부 여러 개?** 예) 개인용 + 커플용 + 가족용 → 헤더에서 가계부 전환. **기본안 적용: 1인 1가계부** (DB 구조는 여러 개 가능, 서비스에서 제한)
- **나간 멤버의 내역:** 지우지 않고 남김, 작성자는 "나간 멤버"로 표시
- **UI:**
  - 홈 헤더: 멤버 아바타 겹쳐서 표시, 많으면 `+N`
  - 빠른 입력 "누가": 멤버 칩 N개 + "같이"
  - 홈 예산 카드·통계: 사람별 지출 (멤버마다 색 지정)
  - 설정 "가계부 공유": 멤버 목록, 초대하기, 내보내기(방장)
- **작성자 vs 쓴 사람:** 지금 `CreatedByUserId`는 "기록한 사람"이다. 빠른 입력의 "누가(돈을 쓴 사람)·같이"는 별도 필드로 나중에 추가
- 용어: 화면에서 "파트너/커플" 대신 **"멤버", "함께 쓰는 사람"** — 2명일 때만 "파트너"로 보여줄지는 결정 필요

---

## 다음 작업 목록 (2026-09-27 인수인계 — 여기부터 이어서)

지금 상태: 서버(로그인·공유·예산·실시간·영수증 API·카카오 검증)와 앱(개발용 로그인·공유·예산·실시간) 완료, 운영 서버 `https://gageabu-jun.duckdns.org` 가동.
**운영 서버는 카카오 로그인만 받으므로, 아래 A가 끝나야 실제로 쓸 수 있다.**

### A. 독립 실행 APK + 카카오 로그인 (안드로이드 먼저) — 다음 할 일
- 확정 요구사항(사용자): 폰에 설치한 뒤 **PC·Metro·Expo Go 없이 실행되는 APK**, 운영 서버에 직접 연결. developmentClient 빌드는 이 항목의 완료 결과가 아님.
- [ ] 결정 확인(사용자): 빌드 방식 **EAS 클라우드 빌드**(PC에 안드로이드 SDK 불필요). 대상은 **안드로이드 먼저**
- [ ] (사용자) 카카오 콘솔 → 앱 키 → **네이티브 앱 키** 알려 주기 (앱에 들어가는 공개 값)
- [ ] (Claude) 카카오 로그인 라이브러리(예: `@react-native-seoul/kakao-login`, config plugin) 추가, `app.json`에 네이티브 앱 키
- [ ] (Claude) `eas.json` preview 프로필: 내부 배포, Android `buildType: apk`, `developmentClient: false`, 앱 JS 번들이 포함되는 release 빌드
- [ ] (Claude) 로그인 화면 카카오 버튼 → SDK 로그인 → accessToken → `POST /api/auth/kakao` → 토큰 저장 (`AuthProvider`에 `kakaoLogin`)
- [ ] (Claude) EAS 빌드 키의 SHA-1 → **카카오 키 해시**(base64) 계산해서 알려 주기
- [ ] (사용자) 카카오 콘솔 → 플랫폼 → Android: 패키지명 `com.parkjun112.GagebuClient` + 키 해시 등록
- [ ] (Claude) `eas build --profile preview --platform android` → 독립 실행 APK 링크 → (사용자) 폰에 설치
- [ ] (Claude) 앱 서버 주소 전환 방법: 개발(PC `.env.local`) / 운영(`EXPO_PUBLIC_API_URL=https://gageabu-jun.duckdns.org`, eas.json 프로필 env)
- [ ] 완료 조건: **PC·Metro를 끈 상태**, 폰 모바일 데이터에서 APK 실행 → 카카오 로그인 → **운영 서버**에 로그인 → 초대·참여·실시간 동작. 앱 종료 후 다시 실행해도 로그인 유지

### B. 운영 마무리
- [ ] 알림(사용자 요청): 앱이 닫혀 있을 때 푸시, 사용 중에는 방해하지 않는 작은 최신화 표시. 제안: 상대방 변경을 자동 반영한 뒤 2~3초 안내, 소리·진동·모달 없음, 연속 변경은 묶음 표시. 내 변경은 제외하도록 실시간 이벤트에 변경자 식별 추가 필요(현재는 kind만 전송). 입력 중인 폼과 스크롤 위치 유지. 푸시는 설치용 앱 및 Android FCM / iOS APNs 자격 증명 준비 후 구현·실기기 검증.
- [ ] 카카오 **연결 해제 웹훅**: 서버 엔드포인트(사용자 연결 끊김 처리) + 카카오 콘솔 웹훅에 `https://gageabu-jun.duckdns.org/...` 등록
- [ ] 운영 DB는 비어 있음 — 개발 DB의 테스트 거래 8건은 옮기지 않음(필요하면 결정). 운영에서 처음 로그인한 사람이 기본 가계부 방장
- [ ] 서버 코드를 고치면 `bash deploy/push-images.sh <SSH 키> 152.70.85.165` → 서버에서 `backup.sh` 후 `up -d --no-build` (docs/DEPLOY.md)
- [ ] (결정) `rebuild` 브랜치 GitHub push 여부 (저장소는 공개, 비밀 값은 Git 제외돼 있음)

### C. 아이폰 (나중)
- [ ] Apple 개발자 계정(연 99달러) 여부 결정 → iOS dev build, 카카오 콘솔에 iOS 번들 ID
- [ ] 참고: 아이폰 Expo Go는 PC와 같은 Expo 계정이어야 열림 (다른 사람 아이폰은 프로젝트 멤버 초대 필요)

### D. 이후 기능 (사용자 순서)
- [ ] 영수증 촬영·OCR(앱): `expo-image-picker` + ML Kit(dev build), 빠른 입력 📷 → `/api/receipts` → 추천 확인·확정 화면. 실제 영수증 샘플로 워커 규칙 다듬기. 사진 보관 여부 결정
- [ ] 지도: 거래 위치 저장·지도 표시 (5단계), 지도 서비스 결정

### E. 작은 정리 (급하지 않음)
- [ ] 초대 링크: 설치용 앱에 초대코드 자동 입력 링크 연결, 로그인 후에도 코드 유지. 웹 초대 안내 페이지 및 Android App Links / iOS Universal Links 설정 후 카카오톡 공유에 링크 포함. 현재는 코드 복사 + 휴대폰 공유 메뉴로 초대 메시지 전송 가능.
- [ ] 웹 미리보기에서 홈 금액이 길면 `…`로 잘림 (웹은 글자 자동 축소 미지원, 폰은 정상)
- [ ] 안 쓰는 옛 개발 컨테이너 `gageabu-dev-1`, 볼륨 `gageabu_client-node-modules` 정리
- [ ] Oracle A1(ARM, 더 큰 무료 VM) 자리가 나면 이사 (선택)

### F. UI 할 일 (사용자 요청 2026-09-27)
- [ ] **예산 끄기 → 설정 메뉴의 토글로 분리**: 설정 "가계부" 칸에 `예산 사용` 켜기/끄기 토글. 끄면 홈 예산 카드·돼지 상태를 숨기고, 켜면 저장된 예산 그대로 다시 표시 (예산 값은 지우지 않음 — 켜고 끄기만. 서버에 가계부별 설정으로 저장해 멤버가 같이 봄)
- [ ] **예산 시트의 "예산 끄기" 버튼 → "초기화"로 변경**: 누르면 확인 후 예산 값을 비움 (기본 예산 시트 = 기본 월 예산 지우기 / 달 예산 시트 = 그 달 예외 지우고 기본으로). 끄기(숨김)와 초기화(값 삭제)를 구분

## 5. 진행 기록
- 2026-09-27: 초대코드 재발급 정책 변경 — 이전 미사용 코드를 만료시키고 가계부별 최신 코드 하나만 유효하게 유지. 생성은 가계부별 DB 잠금과 트랜잭션으로 처리, 참여 확정 시에도 만료 여부 재검사. 사용 기록은 유지. 서버 멤버 테스트 27개(재발급·다른 가계부 격리·동시 생성 포함) 및 앱 타입 검사 통과. 운영 서버 배포는 아직.
- 2026-09-27: 공유 화면의 내보내기·나가기를 아이콘과 배경이 있는 작은 버튼으로 변경, 나가기는 안내 카드로 구분. 로그인은 기존 돼지 이미지·카드 배치·입력 라벨·테스트 계정(me/partner) 선택 버튼으로 개선. 새 이모티콘은 사용자가 제작 중. 카카오 로그인은 미연동 상태를 명시. TypeScript 검사 통과, 폰 화면 확인 필요. 알림은 위 B에 요구사항과 제안 기록(아직 구현 전).
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
- 2026-09-27: 서버 연결 실패 안내·로딩 상태·에러 경계 추가 (요청 시간 제한 6초, 재시도 1번). 웹에서 서버 꺼짐/응답 없음/보던 중 끊김/저장 실패 확인.
- 2026-09-27: 예산 상태에 따라 바뀌는 돼지 그림(부유한/홀쭉한/보통) + 저금통 아이콘.
- 2026-09-27: 돼지를 Noto 🐷 바탕으로 다시 그림, 바텀시트 키보드 가림·저장 반응 느림 수정.
- 2026-09-27: 예산 입력을 앱 숫자 키패드로 (키보드 가림·저장 안 눌림 해결), Keypad 공용화.
- 2026-09-27: 공용 Button이 Pressable disabled를 쓰지 않도록 (비활성 → 활성 전환 후 안 눌리던 문제), 바텀시트 아래 여백·Modal 안전 여백 보강.
- 2026-09-27: 새 목업 반영 — 저금통 돼지 + 상태 문구, 상태 3단계.
- 2026-09-27: 4단계 '영수증 스캔' 계획 추가 — 유료 API 없이 ML Kit(폰 안 OCR) + 직접 만든 추출 규칙 (사용자 결정).
- 2026-09-27: 홈 금액 색·귀여운 글꼴, 상태 문구 말투, 남은 날짜·일 권장 금액 미니 박스, 가운뎃점 제거.
- 2026-09-27: SVG 돼지 → PNG 키트 돼지로 교체(`Pig.tsx` PigMain/PigFace, `notoPigFace.ts` 삭제), 상태 계산 `pigState.ts` + jest, 예산 바 접근성(progressbar, 값·상태 읽기). 확인: 웹 스크린샷(사용률 0/60/77/90/100/120%, 예산 0원, 로딩, 340px 폭, 라이트/다크), tsc, jest 49.
- 2026-09-27: 메인 돼지를 요약 카드 윗부분(금액·상태 문구) 세로 가운데로, 상태가 바뀔 때 돼지 그림 크로스페이드(새 그림이 톡 커지며 나타남), 예산 바 채움·얼굴이 미끄러지듯 이동. 기기의 '움직임 줄이기' 설정이면 애니메이션 없이 교체.
- 2026-09-27: 내역 머리의 월 지출/수입을 작은 글자 → 미니 박스 2칸(주아체 19)으로. 합계는 지출/수입 필터와 상관없이 기간 전체, 고른 필터 쪽 박스는 테두리 강조.
- 2026-09-27: 빠른 입력 버그 — 메모 입력 중 금액을 눌러도 키패드로 안 돌아가던 것(금액 영역을 누르면 메모 입력 끝냄, Android 뒤로가기로 키보드만 내려도 메모 포커스 해제), 금액 옆 커서가 항상 보이던 것(키패드 입력 중에만 깜빡임).
- 2026-09-27: 개발환경 분리 — Expo/Metro는 Windows, API는 Docker `api` 서비스의 `dotnet watch`로 자동 실행. 기존 SQLite·Claude 로그인 볼륨 보존, API 빌드 볼륨 추가, `.env.local`로 앱 주소 이동. `scripts/dev.ps1`에 시작·중지·상태·로그·백업·셸 추가, `/health`에서 DB 연결 확인. 미사용 샘플 이미지/SVG·주석 코드 정리, `.csproj.user`는 로컬 변경을 보존하고 Git 추적 해제, 과거 README 기록 보관. npm 잠금 파일의 누락 peer 6개를 보완(기존 패키지 버전 변경 없음). 검증: API healthy·거래/요약 조회, 전후 DB 전체 dump 일치(상세 검증 수치는 Git 제외 백업 폴더에 보관), SQLite 무결성·백업, EF 목록/빌드, Windows npm ci·tsc·jest 49·Android 번들, Metro LAN 매니페스트. 폰 CRUD·Fast Refresh와 새 Dev Container 편집창 연결은 사용자 확인 필요. 다음: PostgreSQL 전환. 클라우드 운영 구성은 DB 전환 후 착수하고 실제 인증·HTTPS·백업 후 외부 테스트.
- 2026-09-27: **PostgreSQL 전환** — compose에 `db`(postgres:18-alpine, 볼륨 `pg-data`, `127.0.0.1:5432`, pg_isready 헬스체크), API는 DB가 healthy일 때 시작. `Npgsql.EntityFrameworkCore.PostgreSQL` 9.0.4, 접속 정보는 `ConnectionStrings__Gagebu`. SQLite 전용 코드(`DbInitializer`의 `sqlite_master`, `DbSettings`, 날짜 Kind 변환) 제거, 마이그레이션을 PostgreSQL용 `InitialCreate` 하나로 새로 시작(시드 가계부 뒤 identity 시퀀스 보정). `dev.ps1 backup`은 `pg_dump -Fc`, `psql` 명령 추가. 검증: SQLite 백업 후 8건 복사 → 행 단위(날짜 ms까지)·건수·합계·수입/지출 합계 일치, API 목록·9월 요약·생성(KST→UTC)·수정·삭제·다음 Id 11, 백업 → 별도 DB 복원 후 건수·합계 일치.
- 2026-09-27: 돼지 상태 세분화 — 90% 초과부터 배고픈 돼지와 예산 주의 문구, 100% 이상부터 예산 초과 문구. 그림 상태와 문구 상태를 분리하고 99.9%가 100%로 표시되지 않도록 경계 표시 보정. 검증: 타입 검사와 돼지 상태 테스트 32개 통과.
- 2026-09-27: **서버 통합 테스트 추가** — `Gagebu Server.Tests`(xUnit, `WebApplicationFactory`, 실제 PostgreSQL에 실행마다 임시 DB 생성·삭제). 12개: CRUD, KST→UTC 저장·UTC 응답, 요약 [from, to) 경계·KST 오프셋 입력·입출금 필터, 잘못된 구간/입력 400, 없는 거래 404, 다른 가계부 거래 조회·수정·삭제 차단(+시드 뒤 identity 시퀀스), 헬스체크. 실행 `dev.ps1 test`. EF Relational 버전 충돌 경고 → 9.0.3 명시로 해결. 기존 SQLite 테스트 데이터 8건은 사용자 답을 받을 때까지 유지(비파괴 기본값).
- 2026-09-27: **3단계 서버 — 로그인·멤버·초대·작성자** — JWT(sub=사용자 Id, 30일), 개발용 로그인(`/api/auth/dev-login`, Development+설정일 때만), 토큰 없는 요청은 개발 환경에서만 기본 가계부(지금 앱 호환, 틀린 토큰은 401). 가계부 소속은 요청마다 DB 확인(`CurrentUserMiddleware` → `CurrentUser`, 쿼리 필터가 참조). 사용자·멤버·초대 테이블 + 거래 `CreatedByUserId` 마이그레이션(`AddMembersAndInvites`, 적용 전 백업). 초대 8자리·24시간·1회용(동시 수락도 한 명만)·방장만·최대 10명·코드 시도 제한(사용자별 10분 10번), 수락 시 혼자 쓰던 내역 합치기 선택, 나가기·내보내기(방장 승계, 나간 사람은 새 개인 가계부, 쓴 내역은 남음). Swagger Authorize 버튼. 테스트 37개(거래 12 + 멤버 25, 운영 환경에서 개발 로그인·익명 차단 포함). 결정 필요 항목은 PLAN 4장 기본안으로 적용 — 사용자 확인 대기. **다음: 예산 서버 저장(기본 예산 + 달별 예외) → 앱 연동은 클라 담당과 조율.**
- 2026-09-27: **예산 서버 저장** — `Households.DefaultMonthlyBudget` + `BudgetOverrides`(가계부·연·월, 0 = 그 달 예산 없음) 마이그레이션(`AddBudgets`, 적용 전 백업). `/api/budget` 조회·기본 예산·달별 예외 설정/삭제·그 달 적용 예산. 멤버 누구나 수정(기본안), 로그인 없는 개발 모드는 기본 가계부. 테스트 49개(예산 12 추가). **앱 연동 전이라 지금 앱은 여전히 폰 저장 예산을 씀.** 다음: 실시간 반영(SignalR).
- 2026-09-27: **실시간 반영(서버)** — SignalR `HouseholdHub`(`/hubs/household`): 연결 시 소속 가계부 그룹에 넣고, 거래 생성·수정·삭제 / 예산 변경 / 멤버 가입·나가기·내보내기·이름·프로필 변경 때 그 가계부에 `changed {kind}`만 보냄(데이터는 API로 다시 조회). 연결 권한은 API와 같은 규칙(로그인 사용자 = 소속 가계부, 개발 모드 무토큰 = 기본 가계부, 틀린 토큰 = negotiate 401 — 헤더·쿼리 토큰 모두). 알림 실패는 저장 요청을 실패시키지 않음. 내보낸 사람의 기존 연결은 재접속 전까지 옛 그룹에 남지만 신호만 받고 데이터는 못 봄. 테스트 54개(실시간 5 추가, 3번 연속 통과). **서버 쪽 3단계 뼈대 완료 — 남은 건 앱 연동(로그인·공유 화면·예산·실시간), 클라우드 운영 구성(결정 필요), 카카오 로그인.**
- 2026-09-27: **운영 구성 준비** — `docker-compose.prod.yml`(api·db·caddy, API·DB 포트는 밖에 안 엶), `deploy/Caddyfile`(자동 HTTPS·압축·Swagger 404), `.env.prod.example`(`.env.prod`는 Git 제외), `Dockerfile.api` 개선(복원 캐시, 일반 사용자 실행, 테스트 프로젝트 제외). 서버: 운영에서 CORS는 `Cors:AllowedOrigins`만(개발은 전체), `UseForwardedHeaders`, `UseHttpsRedirection` 제거(HTTPS는 Caddy). 로컬 시험(localhost·18443): health 200, http→https 308, 무토큰 401, dev-login 404, Swagger 404, 허브 401, 마이그레이션 자동 적용, uid=app. 테스트 54개 통과. 배포 절차는 `docs/DEPLOY.md`. **남은 결정: 서버·도메인.**
- 2026-09-27: **카카오 로그인(서버)** — `POST /api/auth/kakao {accessToken}`: 카카오 `v1/user/access_token_info`로 토큰 확인 후 `app_id`가 `Kakao__AppId`와 같을 때만(다른 앱 토큰 차단), `v2/user/me` 닉네임으로 새 사용자(동의 없으면 "새 사용자"), `KakaoId`로 기존 사용자 재로그인. 로그인 공통 부분(`CreateUserAsync`, `LoginResponseAsync`)을 개발용 로그인과 공유. 오류 401(토큰 무효·다른 앱)/503(앱 ID 미설정) 추가. 운영 환경에서도 동작 확인. 허브에 `Ping`(그룹 가입 완료 확인) 추가 — 연결 직후 신호를 놓치던 테스트 경쟁 상태 해결. 테스트 66개(카카오 12 추가), 3번 연속 통과. 남은 것: 카카오 콘솔 앱 등록(사용자), 앱 SDK 연동(dev build).
- 2026-09-27: **영수증 분석 API(.NET)** — `ReceiptJobs` 테이블(마이그레이션 `AddReceiptJobs`, 적용 전 백업): OCR 줄(jsonb), 엔진 추천(jsonb, 수정 안 함), 사용자 확정값(jsonb), 엔진 버전, 실패 사유, 만들어진 거래 Id 배열. 가계부별 `clientRequestId` 유일 → 재전송 중복 방지(동시 요청도). 확정은 트랜잭션 + 상태 선점으로 한 번만, 여러 거래로 나눠 저장 가능, 거래 검증은 `TransactionService.Validate` 공유. 워커는 DB를 직접 만지지 않고 `/internal/receipts` API로 작업을 가져가고(`FOR UPDATE SKIP LOCKED`, 2분 임대, 최대 3번) 결과를 넣음. 워커 키 `Worker__Key`(개발 compose에 값, 운영 `.env.prod`). 테스트 79개(영수증 13 추가, 3번 연속 통과). **다음: Python 워커(추출 규칙 + 이 API 연결).**
- 2026-09-27: **영수증 분석 워커(Python)** — `receipt-worker/`(표준 라이브러리만, 테스트는 pytest). `/internal/receipts`에서 작업을 가져가 `rules.analyze` → 결과/실패 보고, 키 거절(401/404)은 1분 대기, 연결 실패는 지수 백오프, 규칙 예외는 그 영수증만 실패 처리. 개발 compose `worker`(소스 마운트, dev 이미지), 운영 compose `worker`(prod 이미지, 일반 사용자). `dev.ps1 start/stop/status/logs`에 worker 포함, `worker-test` 추가. 실제 흐름 확인: API 접수 → 워커가 0.2초 안에 가져가 "스타벅스 강남R점 / 11:58 / 4,500 / 카페" 추천(확인 후 버림). **`dev.ps1`에 UTF-8 BOM 추가** — Windows PowerShell 5.1이 BOM 없는 UTF-8을 CP949로 읽어 한글 주석 다음 줄(`worker-test`)이 무시되던 문제. 테스트: 서버 79 + 워커 17.
- 2026-09-27: 영수증 카테고리 기록 우선 — 같은 가계부에서 같은 가게(띄어쓰기·대소문자 무시)를 확정한 적이 있으면 그때 저장한 지출 카테고리로 추천(확신도 0.9, `categoryFromHistory`). 엔진 추천 원본은 그대로 두고 조회할 때만 적용. 테스트 80개.
- 2026-09-27: **토큰 갱신 B안(서버)** — `UserSessions` 테이블(마이그레이션 `AddUserSessions`, 적용 전 백업): 기기 이름, 갱신 토큰 해시(원문 저장 안 함), 직전 토큰 해시, 마지막 사용, 만료(마지막 사용부터 60일), 끊은 시각. 접근 토큰 1시간(`sid` 클레임), 요청마다 세션이 살아 있는지 확인 → 로그아웃·기기 끊기 즉시 적용. 갱신 토큰은 쓸 때마다 교체, 동시 요청은 DB 조건부 교체로 한 번만, 교체된 토큰 재사용은 1분 안이면 재전송으로 보고 허용·그 뒤면 도난 의심으로 그 기기 끊기. `/api/auth/refresh·logout·sessions` 추가, 로그인 요청에 `deviceName`. 설정 `Auth:AccessTokenMinutes`(60)·`Auth:RefreshTokenDays`(60). 테스트 91개(세션 11 추가, 2번 연속 통과). **다음: 백엔드 클라우드 배포 (Oracle Cloud 무료 VM).**
- 2026-09-27: **백엔드 클라우드 배포** — Oracle Cloud Always Free(오사카). 한국 리전은 무료 가입에 없었고 A1(ARM)은 "Out of capacity" → AMD `E2.1.Micro`(1GB)로. 메모리 때문에 PC에서 amd64 이미지를 빌드해 보내는 `deploy/push-images.sh`, 서버 준비 `setup-ubuntu.sh`(Docker·iptables 80/443·스왑 2GB·KST·백업 cron), 비밀 값 `make-env.sh`(서버에서만 생성, 600). DuckDNS `gageabu-jun.duckdns.org`. 처음엔 Oracle Security List에 80/443이 없어 Let's Encrypt 실패 → 사용자가 수신 규칙 추가 후 인증서 발급. 운영 점검: health 200, 무토큰 401, dev-login·Swagger·/internal 404, 허브 401, 카카오 401(설정됨), 워커→API 204, 컨테이너 메모리 합계 약 165MB. 매일 04:00 KST DB 백업(`deploy/backup.sh`, 30일). **운영은 앱 로그인 화면이 생겨야 실제로 쓸 수 있음** (운영에서는 토큰 없는 요청이 막힘). 다음: 영수증 기능(앱) → 지도 기능.
- 2026-09-27: **앱 연동 (로그인·공유·예산·실시간)** — 로그인 화면(카카오 버튼 자리 + 개발 중에만 개발용 로그인), `Stack.Protected`로 로그인 전에는 로그인 화면만. 토큰: 폰 `expo-secure-store`/웹 브라우저 저장소, axios 인터셉터(요청마다 토큰, 만료 임박 미리 갱신, 401 → 갱신 1번 후 재시도, 동시 요청 갱신 1번, 거절 시 로그인 화면, 연결 실패는 로그인 유지). 설정: 프로필 서버 저장·가계부 공유·로그인한 기기·로그아웃. 가계부 공유 화면(멤버·초대 코드 만들기/공유·코드 입력/미리보기/참여(내 내역 가져가기)·내보내기·나가기·이름 변경), 기기 목록. 홈 머리: 가계부 이름·멤버 아바타(2명 ♥, +N). 예산: `/api/budget`으로 교체(바로 반영·실패 시 되돌림), 폰에 남은 옛 예산은 한 번 서버로 옮김. 실시간: SignalR(`withCredentials: false` — 웹 미리보기 CORS), changed → 해당 조회만, 연결 직후 Ping 후 한 번 다시 조회, 백그라운드에서 끊기. 내역 줄에 기록한 사람 아바타(여럿일 때, 나간 멤버 👤). 검증: tsc, jest 76(토큰 갱신 9·예산 7 추가), Android 번들, 웹 자동 조작(Chrome + playwright-core, `.local/pw-tools/`) — 로그인·공유·두 사용자 초대/참여·예산 옮기기/공유·실시간(상대 기록 88ms). 시험 뒤 개발 DB는 시험 전 백업으로 복원(사용자 0명). **사고: 운영 이미지 이름(`gageabu-api`)이 개발 compose 이미지 이름과 같아 개발 API가 운영 이미지로 켜지다 실패 → 운영 이미지를 `gageabu-prod-*`로 바꾸고 서버도 이름 변경.** 남은 것: 폰(Expo Go) 실기기 확인, dev build 전환 + 카카오 SDK(운영 서버 사용 조건).
- 2026-09-27: **실기기 확인** — 안드로이드 폰(Expo Go) + 웹 미리보기로 개발용 로그인 → 초대 코드 → 참여 확인(사용자). 참고: 아이폰 Expo Go는 PC의 Expo CLI와 **같은 Expo 계정**(또는 프로젝트 멤버)이어야 열린다 — 다른 사람 계정 아이폰은 안 열림. PC는 `npx expo login`(구글 가입 계정은 Expo 비밀번호를 따로 만들어 로그인)으로 해결, 로그인하면 Metro의 "Log in / Proceed anonymously" 선택창도 사라짐. `--offline`은 iOS에서 서명 문제로 안 됨.
- 2026-09-27: **UI 다듬기 (사용자 피드백)** — 로그인 화면 개편(소개·카드·테스트 계정 me/partner 선택), 프로필 아이콘을 이미지로(`ProfileAvatar`, `assets/images/avatars/`), 설정 프로필에 [아이콘 설정]·[방 이름 설정] 작은 버튼 → 각각 별도 화면(`/profile-icon`, `/household-name`, 방장만 이름 변경, DB `Households.Name`). 가계부 공유: 초대 버튼 코드 복사·코드 공유·링크 공유(자리만, 카카오 링크 보내기 예정 — 연한 파랑 `info` 버튼), 코드 공유는 메시지 하나(공유 메뉴는 한 번에 한 메시지만 가능) "사용 방법 : … / 초대코드 : ABCD-EFGH (M월 D일 HH:mm까지)", 코드 입력칸은 한 줄 고정·메시지 통째 붙여넣어도 코드만, 내보내기 👋 알약 버튼, 혼자 쓸래요는 원래 디자인 유지. 공용 `Button`에 `size="sm"`·`info` 추가. 키보드: `Screen avoidKeyboard`가 키보드 높이만큼 여백 + 포커스된 입력칸 실제 위치를 재서 스크롤(KeyboardAvoidingView 대신). Android 뒤로가기 "다른 탭이면 홈으로"는 탭 화면에서만(공유 화면에서 뒤로가 홈으로 튀던 문제). 화면 전환 흰 띠 제거(창·화면 배경을 앱 색으로 `expo-system-ui`·`contentStyle`), 스택 `slide_from_right`·탭 `shift` 애니메이션. 서버: 초대코드 재발급 시 이전 미사용 코드 만료(가계부 잠금·트랜잭션). eas.json preview = 독립 실행 APK(운영 서버 주소). 확인: tsc, jest 76, 서버 93. 키보드·공유·뒤로가기·애니메이션은 폰에서 확인 필요.
- 2026-09-29: **UI 마무리 (부자돼지 guide1·guide2 기준, GPT 작업 이어받음)** — 사용자 지시: 에셋 패키지의 SVG 돼지·로고는 쓰지 않음(기존 PNG 돼지가 더 귀여움). 컬러 아이콘 26개는 `SvgXml`로 사용(`src/components/AppIcon.tsx`, SVG 원문은 `appIconSvgs.ts` — metro/jest 설정 변경 없음): 카테고리(`Category.art`)·추가 메뉴·설정 목록·홈 요약. `assets/images/로그인 화면,앱아이콘.png`에서 글자 로고·코인 돼지·앱 아이콘을 잘라 배경 투명 처리(`assets/images/brand/`, `Brand.tsx`의 `Wordmark`·`HeroPig`) → 홈 머리 로고, 로그인 화면(로고·코인 돼지·기능 3개·카카오 노란 버튼(준비 중)·개발용 로그인 유지), 추가 메뉴(코인 돼지 + 말풍선), 앱 아이콘·적응형 아이콘·스플래시·파비콘 교체. 홈: 2×2 요약(지출·수입·남은 돈=수입−지출·남은 예산 → 누르면 예산 시트), 진행바 옆 %, 상태 말풍선 하트, "○○ 가계부의 가계부" 중복 수정. 통계: 저축률 카드에 돼지 얼굴(20%↑ 웃음/0%↑ 걱정/적자 울음). 설정: 로그아웃을 "앱 및 보안" 목록의 빨간 줄로. 내역: 기간 선택 아이콘을 달력 보기와 구분(sliders). guide의 작은 3D 돼지들은 해상도가 낮아(약 70px) 상태 돼지는 기존 PNG 유지. 확인: tsc, jest 76, 웹 스크린샷(로그인·홈·내역·추가·통계·설정). 새 앱 아이콘은 다음 APK 빌드부터 보임. 원본 참고 이미지(guide1·2, 로그인 이미지, `bujadwaeji-assets*` 폴더·zip)는 커밋하지 않음.
- 2026-09-29: **UI 피드백 반영 2차** — 홈: 글자 로고 4번째 글자(원본 이미지에서 뭉개져 "벽?"처럼 보임)를 같은 이미지의 "자"를 복숭아색으로 바꿔 넣고 ㅏ의 짧은 가로획만 회색 50% → "부자돼자(지)", 머리 = 로고·가계부 이름 | 멤버 묶음(→ 멤버 관리, 혼자면 초대하기)·설정 박스 버튼(계정 아이콘은 멤버 묶음과 중복이라 제거), 공용 `IconButton`/`PressableScale`(박스 + 눌림 축소 애니메이션). 월 이동 공통: [‹] 2026년 9월 ⌄ [›] 박스 화살표. 내역: [검색] 내역 [달력] 제목 줄, 월 왼쪽·기간 선택 오른쪽, 칩 왼쪽 정렬, 검색창은 검색 버튼으로 열기(칩 아래), 목록 위 수입·지출·합계 박스, 날짜별 합계는 색 알약. 추가 메뉴: 다크 모드 타일 배경(글자 안 보이던 문제), + 버튼은 흰 테두리 대신 옅은 분홍 링. 통계: 도넛 둥근 끝·틈·가운데 원(짧은 조각은 평평한 끝), 범례는 도넛 아래 카테고리 색 배경 칸(아이콘 포함), "수입 vs 지출" → "이번 달 돈의 흐름"(들어온 돈/나간 돈). 설정 재구성: 가계부 카드 → 가계부 이름, 내 정보(프로필 화면 신설·로그인한 기기), 함께 쓰기(멤버 관리·초대하기·초대 코드 입력 — 옛 가계부 공유 화면을 `app/members`·`invite`·`join` + `src/features/household/HouseholdParts.tsx`로 분리), 가계부 관리, 앱 설정(화면 테마 줄), 도움말, 로그아웃. 초대 메시지 안내 경로도 "설정 → 초대 코드 입력"으로. **기기 목록이 쌓이던 문제**: 로그인할 때마다 새 세션(웹은 매번 새 기기) → 앱이 설치(브라우저)마다 고정 `deviceId`를 보내고 서버가 같은 사용자·같은 기기의 이전 세션을 끝냄(마이그레이션 `AddSessionDeviceId`, 적용 전 백업), 기기 화면에 "다른 기기 모두 로그아웃". 확인: 서버 테스트 95(세션 2 추가), tsc, jest 76, 웹 스크린샷 라이트·다크. **운영 서버에는 아직 배포 안 함**(옛 서버는 deviceId를 무시하므로 새 앱과 같이 써도 됨). 참고: 웹 확인용 Metro가 실행 중 파일 변경을 반영하지 않는 경우가 있어 매번 재시작해 확인함.
- 2026-10-01: **운영 서버로 붙는 테스트 APK** — 카카오 로그인 전이라 운영에서는 로그인할 방법이 없었음 → 임시 "테스트 로그인": 서버 `Auth:TestLoginCode`(운영 `.env.prod`의 `GAGEBU_TEST_LOGIN_CODE`, 16자 이상)가 있으면 운영에서도 `/api/auth/dev-login`을 열되 요청의 `testCode`가 같을 때만(고정 시간 비교, 틀리면 404, IP마다 10분 10번 → 429). 앱은 `EXPO_PUBLIC_TEST_LOGIN=1`(APK 워크플로)일 때 로그인 화면에 테스트 계정 칸 + 테스트 코드 입력(맞춘 코드는 폰에 기억). 운영 배포(push-images.sh, 배포 전 백업): 이때 `AddSessionDeviceId`도 운영에 적용. 확인: 서버 테스트 97, 운영에서 코드 없음/틀림 404·맞음 통과. 코드는 서버 `.env.prod`와 PC `.local/test-login-code.txt`에만. **카카오 로그인이 붙으면 코드 비우고 워크플로의 EXPO_PUBLIC_TEST_LOGIN 삭제.**
- 2026-10-01: **카카오 로그인(앱) + 푸시 알림** — 앱: `@react-native-kakao/core`·`user` 2.4.8(Expo 플러그인, 네이티브 앱 키 `app.json`, 카카오 Maven 저장소), 로그인 화면 카카오 버튼 → SDK 로그인 → `POST /api/auth/kakao`(기기 ID 포함), 로그아웃 때 카카오 SDK·푸시 토큰 정리. APK 서명 = Expo 템플릿 debug.keystore → **카카오 키 해시 `Xo8WBi6jzSxKDVR4drqm84yr9iU=`**(정식 배포 전 고정 서명 키로 교체). 푸시: 서버 `PushTokens`(세션에 묶음, 로그아웃·끊긴 기기 제외)·`Users.NotifyPartnerRecords/NotifyBudget`(마이그레이션 `AddPushTokens`, 기존 사용자 켬), `PUT/DELETE /api/me/push-token`, `GET/PUT /api/me/notifications`, 거래 기록 → 백그라운드 큐(`PushQueue`·`PushWorker`) → Expo 푸시 서비스: 다른 멤버에게 "○○님이 식비 30,000원 지출을 기록했어요 · 점심", 그 달 예산 80%·100%를 처음 넘으면 모두에게(이 거래까지의 합계로 판단 — 늦게 처리돼도 중복 없음), DeviceNotRegistered 토큰 삭제. 앱: `expo-notifications`(흰 돼지 얼굴 알림 아이콘), 로그인 후 권한 요청·토큰 등록, 알림 누르면 내역/홈, 사용 중에는 배너 대신 실시간 신호(`changed {kind, by}`)로 "다현님이 내역을 바꿨어요" 작은 안내(연속 변경 묶음, 내 변경 제외), 설정 → 알림 설정 화면(종류별 켜기·폰 권한 안내). `google-services.json`이 있을 때만 빌드에 붙음(`app.config.js`). APK 워크플로는 앱 코드가 바뀌어도 실행. 확인: 서버 104, tsc, jest 76, 웹(작은 안내·알림 설정). **남은 것(사용자)**: 카카오 콘솔 Android 플랫폼(패키지 `com.parkjun112.GagebuClient` + 키 해시), Firebase 프로젝트 → `google-services.json` + FCM V1 서비스 계정 키를 expo.dev에 등록. 그 뒤 폰에서 카카오 로그인·푸시 실기기 확인.
