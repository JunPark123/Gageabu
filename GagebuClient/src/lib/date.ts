import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

// 앱 기준 시간대는 한국(KST, UTC+9).
// 한국은 서머타임이 없어서 고정 오프셋으로 충분하고, Hermes의 Intl 시간대 지원에 기대지 않아도 된다.
// 서버는 UTC로 저장·응답하고, "오늘/이번 달" 같은 구간은 여기서 KST 기준으로 계산해 UTC로 보낸다.
const KST_OFFSET_MINUTES = 9 * 60;

export type DateInput = string | number | Date | Dayjs;

// 조회 구간 [from, to) — 서버 summary API의 from/to (UTC ISO 8601)
export interface DateRange {
  from: string;
  to: string;
}

// 서버 날짜(UTC ISO)나 Date → KST 기준 Dayjs
export const toKst = (value?: DateInput) => dayjs(value).utcOffset(KST_OFFSET_MINUTES);

export const formatKst = (value: DateInput, format = 'YYYY.MM.DD HH:mm') => toKst(value).format(format);

// 서버로 보낼 날짜 (UTC ISO 8601)
export const toApiDate = (value: DateInput) => dayjs(value).toISOString();

// 달력 컴포넌트용 'YYYY-MM-DD' (기기 로컬 날짜 기준)
export const toYmd = (value: DateInput) => dayjs(value).format('YYYY-MM-DD');

// KST 'YYYY-MM-DD' 0시의 시각
const kstStartOfDay = (ymd: string) =>
  dayjs.utc(`${ymd}T00:00:00`).subtract(KST_OFFSET_MINUTES, 'minute');

// KST 기준 startYmd 0시 ~ endYmd 다음날 0시
export const kstDateRange = (startYmd: string, endYmd: string): DateRange => ({
  from: kstStartOfDay(startYmd).toISOString(),
  to: kstStartOfDay(endYmd).add(1, 'day').toISOString(),
});

export const kstTodayRange = (): DateRange => {
  const today = toKst().format('YYYY-MM-DD');
  return kstDateRange(today, today);
};

// monthIndex: 0~11 (Date.getMonth()와 같음)
export const kstMonthRange = (year: number, monthIndex: number): DateRange => {
  const monthStart = dayjs.utc(Date.UTC(year, monthIndex, 1));
  return {
    from: monthStart.subtract(KST_OFFSET_MINUTES, 'minute').toISOString(),
    to: monthStart.add(1, 'month').subtract(KST_OFFSET_MINUTES, 'minute').toISOString(),
  };
};

// base의 시각(시·분)은 그대로 두고 날짜만 'YYYY-MM-DD'(기기 로컬)로 바꾼 Date
export const withYmd = (base: Date, ymd: string): Date => {
  const [y, m, d] = ymd.split('-').map(Number);
  const next = new Date(base);
  next.setFullYear(y, m - 1, d);
  return next;
};

// (year, monthIndex)에서 delta달 이동 — 연도 넘김 포함
export const addMonths = (year: number, monthIndex: number, delta: number) => {
  const total = year * 12 + monthIndex + delta;
  return { year: Math.floor(total / 12), monthIndex: ((total % 12) + 12) % 12 };
};
