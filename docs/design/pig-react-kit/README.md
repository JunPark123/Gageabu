# 돼지 상태 세트 — React 전달 패키지

## 구성

- `public/pig-assets/`: 투명 PNG 6장, 각각 1254×1254. 그림을 다시 생성할 필요 없이 바로 사용합니다.
- `src/PigStatus.jsx`: 메인 돼지, 얼굴 아이콘, 예산 사용률 바 컴포넌트.
- `src/pig-status.css`: 카드 안에서 사용할 작은 크기와 바 위치 스타일.
- `src/pig-state.mjs`: 사용률 계산과 변경 가능한 상태 기준.
- `src/Example.jsx`: 기존 React 프로젝트에서 확인할 예시.
- `preview.html`: 설치 없이 브라우저에서 보는 세트 미리보기. 폴더 안에서 여세요.
- `CLAUDE_CODE_HANDOFF.md`: Claude Code에 전달할 구현 요청.
- `GENERATION-PROMPTS.json`: 실제 이미지 생성 프롬프트 기록. 내장 ImageGen 사용.

## 이미지 상태

| 용도 | state | 파일 | 표현 |
|---|---|---|---|
| 메인 | wealthy | main-wealthy.png | 동전, 웃는 얼굴, 부유함 |
| 메인 | normal | main-normal.png | 소품 없는 보통 돼지, 살짝 걱정 |
| 메인 | hungry | main-hungry.png | 깨끗한 빈 그릇, 작은 기운 천, 배고픔 |
| 바 | happy | face-happy.png | 웃는 눈과 입 |
| 바 | concerned | face-concerned.png | 걱정스러운 눈썹과 입, 눈물 없음 |
| 바 | crying | face-crying.png | 슬픈 표정과 파란 눈물 |

독립 생성 이미지라 윤곽이 픽셀 단위로 일치하지는 않습니다. 모핑 대신 이미지 교체 방식으로 사용하세요.

## 설치와 사용

기존 React 프로젝트의 `public/pig-assets`로 PNG 폴더를 복사하고, `src` 파일을 같은 컴포넌트 폴더에 복사하세요. React와 JSX 빌드를 사용하는 기존 프로젝트에 넣는 코드이며 별도 설치 스크립트나 API 키는 필요 없습니다.

```jsx
import { PigMain, PigBudgetBar } from './components/pigs/PigStatus.jsx';
import { budgetPercent } from './components/pigs/pig-state.mjs';

<PigMain state="hungry" size={96} />
<PigBudgetBar
  usedPercent={budgetPercent(2317400, 3000000)}
  thresholds={{ concernedAt: 60, cryingAt: 90 }}
  markerSize={28}
/>
```

PNG 안에 투명 여백이 있으므로 96px 이미지 상자에서 메인 그림은 대략 65~80px, 28px 얼굴 상자에서는 얼굴이 약 23px로 보입니다. 메인은 제목 옆이 아니라 ‘이번 달 함께 모은 돈’ 카드 오른쪽에 놓습니다. 바 얼굴은 이미지 상자 24~28px를 권장합니다. 바는 높이 8px로 그대로 둡니다.

앱이 하위 경로나 CDN에 배포되면 `assetBase`를 실제 이미지 경로로 지정하세요. Vite 예: `assetBase={import.meta.env.BASE_URL + 'pig-assets'}`. 기본 경로는 `/pig-assets`입니다.

## 상태 기준 (예시이며 미확정)

바는 **예산 사용률**입니다. 저축 달성률과 반대 방향입니다.

- 0 이상 60% 미만: happy
- 60 이상 90% 미만: concerned
- 90% 이상: crying

따라서 77%는 중간 표정입니다. 월말에 90% 사용이 항상 나쁜 상태라는 뜻은 아닙니다. 날짜/남은 기간을 반영한 기존 정책이 있으면 `state="happy"` 같은 명시적 상태를 전달해 예시 기준을 덮어쓰세요. 사용률은 위치만 정하고 표정은 앱의 별도 정책으로 정할 수 있습니다.

메인 상태는 `state`를 직접 전달합니다. ‘함께 모은 돈’의 금액만 보고 임의로 가난/부유를 결정하지 않습니다. 목표/예산 대비 판단 기준은 서비스 정책에 연결하세요.

사용률 100% 초과 시 숫자는 실제 값(예: 120%)을 표시하고 바와 아이콘은 오른쪽 끝으로 제한합니다. 0/100% 끝에서도 아이콘이 잘리지 않도록 중심 위치를 안쪽으로 보정합니다. 0원 예산, 음수/누락 지출, NaN/Infinity 등은 사용률 미정으로 처리하고 아이콘을 숨깁니다. 마이너스 순지출을 허용하는 서비스라면 이 정책을 조정하세요.

메인/얼굴 이미지는 기본 장식 이미지입니다. 단독으로 의미를 전달하면 `decorative={false}`를 쓰세요. 바에는 실제 사용률과 상태를 읽어주는 접근성 텍스트가 있습니다. 이동 애니메이션은 reduced-motion 설정을 따릅니다.

## 확인

`node scripts/check.mjs`로 상태 경계값과 PNG 파일/투명도 정보를 확인할 수 있습니다. `preview.html`은 React 런타임 없이 같은 상태 계산 모듈을 내장한 미리보기입니다. React 예제는 실제 앱의 CSS와 빌드 환경에서 최종 확인하세요.

원본은 6장 합계 약 5MB입니다. 그대로 사용할 수 있으며, 필요하면 프로젝트의 기존 이미지 최적화 파이프라인으로 작은 WebP/PNG 파생본을 만드세요. 이 패키지에는 원본을 보존했습니다.
