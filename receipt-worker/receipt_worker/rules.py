"""영수증 추출 규칙 (docs/PLAN.md 4단계 "추출 규칙").

입력은 폰 OCR(ML Kit)의 줄 목록. 위치가 있으면 같은 높이의 조각을 한 줄로 합친다.
결과는 추천일 뿐이다 — 확신도(0~1)가 낮은 칸은 앱이 표시하고 사용자가 확인한다.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from .categories import guess_category

KST = timezone(timedelta(hours=9))


@dataclass
class OcrLine:
    text: str
    top: float | None = None
    left: float | None = None
    width: float | None = None
    height: float | None = None


@dataclass
class Suggestion:
    merchant: str | None = None
    date: datetime | None = None          # 시간대 포함 (KST)
    total: int | None = None
    category: str | None = None
    confidence: dict[str, float | None] = field(default_factory=dict)

    def to_json(self) -> dict:
        return {
            "merchant": self.merchant,
            "date": self.date.isoformat() if self.date else None,
            "total": self.total,
            "category": self.category,
            "confidence": self.confidence,
        }


# ── 1. 줄 정리 ────────────────────────────────────────────────

def group_rows(lines: list[OcrLine]) -> list[str]:
    """위치가 모두 있으면 세로 위치로 줄을 묶고 줄 안은 왼쪽→오른쪽. 없으면 받은 순서 그대로."""
    lines = [l for l in lines if l.text and l.text.strip()]
    if not lines:
        return []
    if any(l.top is None for l in lines):
        return [l.text.strip() for l in lines]

    heights = sorted(l.height for l in lines if l.height)
    typical = heights[len(heights) // 2] if heights else 20.0
    tolerance = typical * 0.5

    def center(l: OcrLine) -> float:
        return l.top + (l.height or typical) / 2

    rows: list[list[OcrLine]] = []
    row_centers: list[float] = []
    for line in sorted(lines, key=center):
        c = center(line)
        if rows and abs(c - row_centers[-1]) <= tolerance:
            rows[-1].append(line)
            row_centers[-1] = sum(center(x) for x in rows[-1]) / len(rows[-1])
        else:
            rows.append([line])
            row_centers.append(c)
    return [" ".join(x.text.strip() for x in sorted(row, key=lambda x: x.left or 0)) for row in rows]


# ── 2. 금액 ──────────────────────────────────────────────────

# 금액으로 보면 안 되는 번호들 — 먼저 지우고 금액을 찾는다
_NOT_AMOUNT_PATTERNS = [
    re.compile(r"\d{4}[-\s][\d*]{4}[-\s][\d*]{4}[-\s][\d*]{3,4}"),              # 카드번호 9410-12**-****-1234
    re.compile(r"\d{4,6}\*[\d*]{5,}"),                                          # 카드번호 941012******1234
    re.compile(r"\d{3}-\d{2}-\d{5}"),                                          # 사업자등록번호
    re.compile(r"\(?0\d{1,2}\)?[-\s.]?\d{3,4}[-\s.]\d{4}"),                   # 전화번호
    re.compile(r"\d{2,4}\s*[-./년]\s*\d{1,2}\s*[-./월]\s*\d{1,2}\s*일?"),     # 날짜
    re.compile(r"\d{1,2}:\d{2}(?::\d{2})?"),                                   # 시간
]
# 금액이 아니라 번호가 적힌 줄
_NUMBER_LINE_KEYWORDS = ["승인번호", "카드번호", "사업자", "전화", "tel", "대표자", "주소", "가맹점번호", "단말기",
                         "일련번호", "거래번호", "영수증번호", "no.", "pos", "회원번호", "주문번호", "할부"]

_AMOUNT = re.compile(r"(?<![\d,.])(?:₩\s*)?(\d{1,3}(?:,\d{3})+|\d{3,9})(\s*원)?(?![\d,]|\.\d)|(?<![\d,.])(\d{1,2})\s*원")


def _squash(text: str) -> str:
    return "".join(text.lower().split())


def amounts_in(row: str) -> list[int]:
    """한 줄의 금액들 (왼쪽→오른쪽). 1~2자리 숫자는 '원'이 붙은 경우만 (수량과 구분)."""
    if any(k in _squash(row) for k in _NUMBER_LINE_KEYWORDS):
        return []
    cleaned = row
    for pattern in _NOT_AMOUNT_PATTERNS:
        cleaned = pattern.sub(" ", cleaned)
    result = []
    for m in _AMOUNT.finditer(cleaned):
        digits = m.group(1) or m.group(3)
        value = int(digits.replace(",", ""))
        if 0 < value <= 100_000_000:
            result.append(value)
    return result


# ── 3. 합계 ──────────────────────────────────────────────────

# (키워드, 점수) — 결제 금액을 직접 가리키는 말일수록 높게. 비교는 공백 무시 ("합 계" = "합계")
_TOTAL_KEYWORDS = [
    ("결제금액", 3), ("받을금액", 3), ("청구금액", 3), ("승인금액", 3), ("카드결제", 3), ("총결제", 3),
    ("합계", 2), ("총액", 2), ("총금액", 2), ("판매총액", 2), ("total", 2),
    ("소계", 1),
]
_EXCLUDE_KEYWORDS = ["부가세", "과세", "면세", "공급가액", "공급가", "받은돈", "받은금액", "거스름", "잔돈",
                     "할인", "포인트", "적립", "에누리", "봉사료", "vat"]


def _is_excluded(row: str) -> bool:
    return any(k in _squash(row) for k in _EXCLUDE_KEYWORDS)


def find_total(rows: list[str]) -> tuple[int | None, float | None]:
    best: tuple[int, int, int] | None = None  # (점수, 줄 번호, 금액)
    for i, row in enumerate(rows):
        squashed = _squash(row)
        if _is_excluded(row):
            continue
        score = max((s for k, s in _TOTAL_KEYWORDS if k in squashed), default=0)
        if score == 0:
            continue
        values = amounts_in(row)
        # 키워드 줄에 금액이 없으면 바로 아랫줄 (금액을 다음 줄에 찍는 영수증)
        if not values and i + 1 < len(rows) and not _is_excluded(rows[i + 1]):
            values = amounts_in(rows[i + 1])
        if not values:
            continue
        candidate = (score, i, values[-1])  # 오른쪽 금액
        # 점수가 높을수록, 같으면 아래쪽 줄
        if best is None or (candidate[0], candidate[1]) > (best[0], best[1]):
            best = candidate
    if best:
        return best[2], (0.95 if best[0] >= 2 else 0.7)

    # 키워드가 없으면: 아래쪽 절반에서 가장 큰 금액 (거스름돈 등 제외)
    lower = [v for row in rows[len(rows) // 2:] if not _is_excluded(row) for v in amounts_in(row)]
    if lower:
        return max(lower), 0.4
    anywhere = [v for row in rows if not _is_excluded(row) for v in amounts_in(row)]
    if anywhere:
        return max(anywhere), 0.2
    return None, None


# ── 4. 날짜·시간 ─────────────────────────────────────────────

_DATE_PATTERNS = [
    re.compile(r"(20\d{2})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})"),
    re.compile(r"(?<!\d)(\d{2})[-./](\d{1,2})[-./](\d{1,2})(?!\d)"),   # 26/09/24 = 2026-09-24 (한국 영수증은 연/월/일)
]
_TIME = re.compile(r"(오전|오후|am|pm)?\s*(?<!\d)([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?(?!\d)", re.IGNORECASE)


def _parse_date(row: str) -> tuple[int, int, int] | None:
    for pattern in _DATE_PATTERNS:
        m = pattern.search(row)
        if not m:
            continue
        year, month, day = (int(g) for g in m.groups())
        if year < 100:
            year += 2000
        try:
            datetime(year, month, day)
        except ValueError:
            continue
        return year, month, day
    return None


def _parse_time(row: str) -> tuple[int, int, int] | None:
    m = _TIME.search(row)
    if not m:
        return None
    meridiem, hour, minute, second = m.group(1), int(m.group(2)), int(m.group(3)), int(m.group(4) or 0)
    if meridiem and meridiem.lower() in ("오후", "pm") and hour < 12:
        hour += 12
    if meridiem and meridiem.lower() in ("오전", "am") and hour == 12:
        hour = 0
    return hour, minute, second


def find_date(rows: list[str], captured_at: datetime | None) -> tuple[datetime | None, float | None]:
    captured_kst = captured_at.astimezone(KST) if captured_at else None
    for i, row in enumerate(rows):
        date = _parse_date(row)
        if not date:
            continue
        # 시간은 같은 줄, 없으면 바로 아랫줄
        time = _parse_time(_DATE_PATTERNS[0].sub(" ", row)) or (_parse_time(rows[i + 1]) if i + 1 < len(rows) else None)
        if time:
            value = datetime(*date, *time, tzinfo=KST)
            confidence = 0.9
        elif captured_kst and captured_kst.date() == datetime(*date).date():
            value = captured_kst.replace(microsecond=0)
            confidence = 0.8
        else:
            value = datetime(*date, 12, 0, tzinfo=KST)
            confidence = 0.6
        # 촬영보다 하루 넘게 미래면 잘못 읽은 것
        if captured_kst and value > captured_kst + timedelta(days=1):
            continue
        return value, confidence
    if captured_kst:
        return captured_kst.replace(microsecond=0), 0.3
    return None, None


# ── 5. 가게 이름 ─────────────────────────────────────────────

_MERCHANT_LABEL = re.compile(r"(?:상호명|상호|가맹점명|매장명)\s*[:：]?\s*(.+)")
_NOT_MERCHANT = ["영수증", "receipt", "카드", "매출전표", "고객용", "가맹점용", "교환", "환불", "welcome", "감사합니다"]


def _letters(text: str) -> int:
    return sum(1 for ch in text if ch.isalpha())


def find_merchant(rows: list[str]) -> tuple[str | None, float | None]:
    for row in rows:
        m = _MERCHANT_LABEL.search(row)
        if m:
            # 같은 줄에 다른 항목이 이어 붙은 경우 (예: "상호: 교촌치킨 대표자: 홍길동")
            name = re.split(r"\s{2,}|대표자|사업자|전화|tel", m.group(1), flags=re.IGNORECASE)[0].strip(" :：")
            if _letters(name) >= 2:
                return name, 0.9
    for row in rows[:3]:
        squashed = _squash(row)
        if any(k in squashed for k in _NOT_MERCHANT):
            continue
        if _parse_date(row) or amounts_in(row) or _letters(row) < 2:
            continue
        return row.strip(), 0.6
    return None, None


# ── 전체 ─────────────────────────────────────────────────────

def analyze(lines: list[OcrLine], captured_at: datetime | None = None) -> Suggestion:
    rows = group_rows(lines)
    total, total_conf = find_total(rows)
    date, date_conf = find_date(rows, captured_at)
    merchant, merchant_conf = find_merchant(rows)

    category = guess_category(merchant)
    category_conf = 0.8 if category else None
    if not category:
        # 가게 이름에서 못 찾으면 영수증 위쪽 글자 전체에서 (확신 낮게)
        category = guess_category(" ".join(rows[:5]))
        category_conf = 0.4 if category else None

    return Suggestion(
        merchant=merchant,
        date=date,
        total=total,
        category=category,
        confidence={"merchant": merchant_conf, "date": date_conf, "total": total_conf, "category": category_conf},
    )
