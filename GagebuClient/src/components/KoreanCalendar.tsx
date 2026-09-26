import { ComponentProps } from 'react';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useTheme } from '../theme/ThemeProvider';

// react-native-calendars 기본값은 영어("September", "Sun Mon…") → 한국어로
LocaleConfig.locales.ko = {
  monthNames: Array.from({ length: 12 }, (_, i) => `${i + 1}월`),
  monthNamesShort: Array.from({ length: 12 }, (_, i) => `${i + 1}월`),
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
};
LocaleConfig.defaultLocale = 'ko';

type CalendarProps = ComponentProps<typeof Calendar>;

// 앱 테마 색 + "2026년 9월" 머리글이 적용된 달력
export function KoreanCalendar(props: CalendarProps) {
  const { colors, scheme } = useTheme();
  return (
    <Calendar
      key={scheme} // 테마가 바뀌면 달력 스타일을 다시 계산하도록
      monthFormat="yyyy년 M월"
      theme={{
        calendarBackground: colors.surface,
        dayTextColor: colors.text,
        monthTextColor: colors.text,
        textSectionTitleColor: colors.textSecondary,
        todayTextColor: colors.expense,
        arrowColor: colors.text,
        textDisabledColor: colors.textTertiary,
        textMonthFontWeight: '700',
        textMonthFontSize: 17,
      }}
      {...props}
    />
  );
}
