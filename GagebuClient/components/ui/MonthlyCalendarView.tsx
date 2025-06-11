import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { TransactionSummary } from '../../src/models/Transaction';

interface MonthlyCalendarViewProps {
    data: TransactionSummary | null;
    selectedMonth: Date;
    onMonthChange: (newMonth: Date) => void;
}

interface DayData {
    date: number;
    income: number;
    expense: number;
    isToday: boolean;
    isCurrentMonth: boolean;
}

export default function MonthlyCalendarView({ data, selectedMonth, onMonthChange }: MonthlyCalendarViewProps) {

    // 해당 월의 거래 데이터를 날짜별로 그룹화
    const getDayData = (): DayData[] => {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();

        // 해당 월의 첫 번째 날과 마지막 날
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // 달력 시작일 (이전 달 마지막 주 포함)
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // 달력 종료일 (다음 달 첫 주 포함)
        const endDate = new Date(lastDay);
        endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

        const dayDataArray: DayData[] = [];
        const currentDate = new Date(startDate);
        const today = new Date();

        // 거래 데이터를 날짜별로 그룹화
        const transactionsByDate: { [key: string]: { income: number; expense: number } } = {};

        if (data?.transactions) {
            data.transactions.forEach(transaction => {
                const transactionDate = new Date(transaction.date);
                const dateKey = `${transactionDate.getFullYear()}-${transactionDate.getMonth()}-${transactionDate.getDate()}`;

                if (!transactionsByDate[dateKey]) {
                    transactionsByDate[dateKey] = { income: 0, expense: 0 };
                }

                if (transaction.paytype === 2) { // 입금
                    transactionsByDate[dateKey].income += transaction.cost;
                } else { // 출금
                    transactionsByDate[dateKey].expense += transaction.cost;
                }
            });
        }

        // 달력 데이터 생성
        while (currentDate <= endDate) {
            const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
            const dayTransactions = transactionsByDate[dateKey] || { income: 0, expense: 0 };

            dayDataArray.push({
                date: currentDate.getDate(),
                income: dayTransactions.income,
                expense: dayTransactions.expense,
                isToday: currentDate.toDateString() === today.toDateString(),
                isCurrentMonth: currentDate.getMonth() === month
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return dayDataArray;
    };

    const dayData = getDayData();
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

    // 주 단위로 데이터 분할
    const weeks: DayData[][] = [];
    for (let i = 0; i < dayData.length; i += 7) {
        weeks.push(dayData.slice(i, i + 7));
    }

    const formatAmount = (amount: number): string => {
        if (amount === 0) return '';
        return amount.toLocaleString();
    };

    return (
        <ScrollView style={styles.container}>
            {/* 월 네비게이션 헤더 */}
            <View style={styles.monthNavigation}>
                <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => {
                        const prevMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
                        onMonthChange(prevMonth);
                    }}
                >
                    <Text style={styles.navButtonText}>◀</Text>
                </TouchableOpacity>

                <Text style={styles.monthTitle}>
                    {selectedMonth.getFullYear()}년 {selectedMonth.getMonth() + 1}월
                </Text>

                <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => {
                        const nextMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
                        onMonthChange(nextMonth);
                    }}
                >
                    <Text style={styles.navButtonText}>▶</Text>
                </TouchableOpacity>
            </View>

            {/* 달력 헤더 */}
            <View style={styles.calendarHeader}>
                {weekDays.map((day, index) => (
                    <Text key={index} style={styles.dayHeader}>
                        {day}
                    </Text>
                ))}
            </View>

            {/* 달력 본문 */}
            <View style={styles.calendarBody}>
                {weeks.map((week, weekIndex) => (
                    <View key={weekIndex} style={styles.weekRow}>
                        {week.map((day, dayIndex) => (
                            <View
                                key={dayIndex}
                                style={[
                                    styles.dayCell,
                                    day.isToday && styles.today,
                                    !day.isCurrentMonth && styles.otherMonth,
                                    day.income > day.expense && styles.netPositive,
                                    day.expense > 0 && day.expense > day.income && styles.netNegative
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.dateNumber,
                                        !day.isCurrentMonth && styles.otherMonthText,
                                        day.isToday && styles.todayText
                                    ]}
                                >
                                    {day.date}
                                </Text>

                                <View style={styles.amountContainer}>
                                    {day.income > 0 && (
                                        <Text style={styles.incomeText}>
                                            +{formatAmount(day.income)}
                                        </Text>
                                    )}
                                    {day.expense > 0 && (
                                        <Text style={styles.expenseText}>
                                            -{formatAmount(day.expense)}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    monthNavigation: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    navButton: {
        padding: 8,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        minWidth: 35,
        alignItems: 'center',
    },
    navButtonText: {
        fontSize: 15,
        color: '#666',
        fontWeight: 'bold',
    },
    monthTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    calendarHeader: {
        flexDirection: 'row',
        backgroundColor: '#f8f9fa',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    dayHeader: {
        flex: 1,
        textAlign: 'center',
        paddingVertical: 15,
        fontSize: 14,
        fontWeight: 'bold',
        color: '#666',
    },
    calendarBody: {
        flex: 1,
    },
    weekRow: {
        flexDirection: 'row',
    },
    dayCell: {
        flex: 1,
        minHeight: 80,
        borderBottomWidth: 1,
        borderRightWidth: 1,
        borderColor: '#f0f0f0',
        padding: 4,
        backgroundColor: '#ffffff',
    },
    dateNumber: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2,
    },
    amountContainer: {
        flex: 1,
        justifyContent: 'flex-start',
    },
    incomeText: {
        fontSize: 10,
        color: '#007AFF',
        fontWeight: '600',
        lineHeight: 12,
    },
    expenseText: {
        fontSize: 10,
        color: '#ff6464',
        fontWeight: '600',
        lineHeight: 12,
    },
    today: {
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    todayText: {
        color: '#007AFF',
        fontWeight: 'bold',
    },
    otherMonth: {
        backgroundColor: '#fafafa',
    },
    otherMonthText: {
        color: '#ccc',
    },
    netPositive: {
        backgroundColor: '#f0f8ff',
    },
    netNegative: {
        backgroundColor: '#fff5f5',
    },
});