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
- 파일 감시(핫리로드)는 **컨테이너 안에서 수정한 파일**만 확실히 잡힙니다. Windows 쪽 Visual Studio로 고친 파일은 Metro가 못 볼 수 있음 (서버는 폴링이라 OK).
- 기존 Windows DB(`C:\Gagebu\DB\household_ledgerNew.db`) 데이터를 옮기려면: 파일을 레포 루트에 잠깐 복사 → 컨테이너에서 `cp /workspace/household_ledgerNew.db /data/db/gageabu.db` → 복사본 삭제.
- 컨테이너(Linux)에서 .NET 빌드 산출물은 `~/.gagebu-artifacts`에 생깁니다 (`Gagebu_RestApiVer/Directory.Build.props`). Windows 쪽 `bin/obj`와 섞이지 않게 하려는 것으로, Windows/VS 빌드는 그대로입니다.
- `Dockerfile.api`는 배포용(Release 빌드)입니다. 개발에는 쓰지 않습니다.
- 폰이 접속 안 되면: 폰과 PC가 같은 와이파이인지, `.env`의 IP가 맞는지, Windows 방화벽이 8081/5067을 막는지 확인.

---

## 2. 검수 결과 (2026-09-24)

### 버그
- [ ] `app/(tabs)/index.tsx` 날짜/달 선택 확인 시 `fetchData` + `fetchDataWithFilter` 연속 호출 → **서버 요청 2번** (README 버그 #1 원인)
- [ ] `index.tsx` 선택 버튼 강조를 `useRef`로 판단 → 리렌더 안 돼서 강조가 늦거나 틀림
- [ ] `index.tsx` `paytype === 0`(None)도 "지출"로 표시
- [ ] `add.tsx` `react-native-reanimated/lib/typescript/Colors`에서 안 쓰는 `red` import (내부 경로)
- [ ] `add.tsx` 달력에 `toISOString()` 사용 → KST 00~09시에 전날로 표시, 날짜 선택 시 시간 초기화
- [ ] `add.tsx` 입금 등록해도 "지출이 등록되었습니다"
- [ ] 날짜 저장 방식 `getFakeUTCISOStringFromKST`(KST를 UTC인 척 저장) + 서버 `DateTime.Today` → 서버 TZ에 의존. 임시로 컨테이너 `TZ=Asia/Seoul`로 막아둠, 1단계에서 근본 수정

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
- [ ] 날짜: 서버는 UTC 저장(`DateTimeOffset`), 클라는 `dayjs`(+timezone)로 KST 변환. "오늘/이번 달" 범위는 클라가 KST 기준으로 계산해 UTC로 전송
- [ ] 클라·서버 모델/enum 일치, `category`/`content` 살리기
- [ ] **`Household`/`HouseholdId` 미리 도입** (로그인 전까지는 기본 가계부 1개) — 4장 참고
- [ ] EF Core Migrations 도입, 생성자 `EnsureCreated` 제거, DB 설정 한 곳으로
- [ ] 서버 에러 타입 기반 분기로 통일
- [ ] 클라 데이터 계층: TanStack Query + `useTransactions` 등 훅 분리

### 2단계 — 디자인 시스템 & 화면
디자인은 Claude Design 목업 그대로 진행 (사용자 승인). **목업 스크린샷/링크를 `docs/design/`에 넣어두면 그걸 기준으로 구현.**
- [ ] 테마 토큰(색·간격·타이포·라운드) + 라이트/다크
- [ ] 공통 컴포넌트: `Button`, `Card`, `AmountText`, `BottomSheet`, `SegmentedControl`, `Chip`
- [ ] 하단 탭 4개(홈/내역/통계/설정) + 가운데 노란 FAB(`#FFD740`)
- [ ] 홈: 이번 달 요약 카드(수입/지출/잔액), 예산 진행률, 최근 내역 5건
- [ ] 내역: 리스트/달력 전환, 기간·입출금 필터 칩, 날짜별 그룹
- [ ] 추가: 바텀시트 빠른 입력(출금/입금, 금액 키패드, 카테고리 칩, 날짜·메모)
- [ ] 통계: 카테고리 도넛, 최근 6개월 막대
- [ ] 설정: **목업에 없음** → 아래 구성으로 목업과 같은 스타일로 구현

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
