import { DateInput, toKst } from './date';

const withCommas = (n: number) => Math.abs(Math.trunc(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ₩1,234  /  sign: true 이면 +₩1,234, -₩1,234 (0은 부호 없음)
export function formatWon(amount: number, options: { sign?: boolean } = {}) {
  const prefix = amount < 0 ? '-' : options.sign && amount > 0 ? '+' : '';
  return `${prefix}₩${withCommas(amount)}`;
}

const DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const SMALL_UNITS = ['', '십', '백', '천'];
const BIG_UNITS = ['', '만', '억', '조'];

// 0~9999 → 한글 ("일"은 십·백·천 앞에서 생략: 1500 → 천오백)
function readFourDigits(n: number) {
  let result = '';
  const digits = n.toString().padStart(4, '0').split('').map(Number);
  digits.forEach((d, i) => {
    if (d === 0) return;
    const unit = SMALL_UNITS[3 - i];
    result += (d === 1 && unit ? '' : DIGITS[d]) + unit;
  });
  return result;
}

// 18000 → "만 팔천 원", 3522600 → "삼백오십이만 이천육백 원"
export function koreanWon(amount: number) {
  let n = Math.abs(Math.trunc(amount));
  if (n === 0) return '영 원';
  const groups: string[] = [];
  let unitIndex = 0;
  while (n > 0 && unitIndex < BIG_UNITS.length) {
    const part = n % 10000;
    if (part > 0) {
      // 만 단위가 딱 1이면 "일"을 생략 (10000 → 만 원, 100000000 → 일억 원)
      const read = part === 1 && unitIndex === 1 ? '' : readFourDigits(part);
      groups.unshift(read + BIG_UNITS[unitIndex]);
    }
    n = Math.floor(n / 10000);
    unitIndex++;
  }
  return `${groups.join(' ')} 원`;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// "오늘" / "어제" / "9월 22일"
export function relativeDayLabel(value: DateInput, now: DateInput = new Date()) {
  const day = toKst(value).startOf('day');
  const today = toKst(now).startOf('day');
  const diff = today.diff(day, 'day');
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  return `${day.month() + 1}월 ${day.date()}일`;
}

// "24일 목요일"
export function dayHeaderLabel(value: DateInput) {
  const d = toKst(value);
  return `${d.date()}일 ${WEEKDAYS[d.day()]}요일`;
}

// "9월 24일 (목)"
export function monthDayWeekdayLabel(value: DateInput) {
  const d = toKst(value);
  return `${d.month() + 1}월 ${d.date()}일 (${WEEKDAYS[d.day()]})`;
}

export const timeLabel = (value: DateInput) => toKst(value).format('HH:mm');

export { WEEKDAYS };
