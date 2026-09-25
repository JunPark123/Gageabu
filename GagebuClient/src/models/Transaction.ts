export interface Transaction {
    id: number;
    type: string;
    cost: number;
    date: string;       // UTC ISO 8601. 화면 표시는 src/lib/date.ts의 formatKst
    paytype: number;
    content: string;    // 메모
    category: string;   // 분류
  }

export interface TransactionStatistics {
    totalIncome: number;        // 총 수입액
    totalExpense: number;       // 총 지출액
    netAmount: number;          // 순액 (수입 - 지출)
    incomeCount: number;        // 수입 건수
    expenseCount: number;       // 지출 건수
    totalCount: number;         // 총 거래 건수
    totalBudget?: number;       // 총 예산 (선택사항)
}

export interface TransactionPeriod {
    from?: string;              // 조회 구간 [from, to), UTC ISO. 없으면 전체
    to?: string;
    payTypeFilter?: number;     // 적용된 수입/지출 필터
}

// 홈 화면 조회 버튼 종류 (화면 상태용, 서버로 보내지 않음)
export enum TransactionQueryType {
    Today = 1,
    DateRange = 3,
    Monthly = 4,
}

export interface TransactionSummary {
    transactions: Transaction[];
    statistics: TransactionStatistics;
    period: TransactionPeriod;
}

export enum PayType {
    None = 0,
    Expense = 1,
    Income = 2
}