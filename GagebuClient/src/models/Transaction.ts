export interface Transaction {
    id: number;
    type: string;
    cost: number;
    date: string;
    paytype: number;
    content: string;
    category: string;
  }

export interface TransactionStatistics {
    totalIncome: number;        // 총 수입액
    totalExpense: number;       // 총 지출액
    netAmount: number;          // 순액 (수입 - 지출)
    incomeCount: number;        // 수입 건수
    expenseCount: number;       // 지출 건수
    totalCount: number;         // 총 거래 건수
    averageTransaction: number; // 평균 거래액
    totalBudget?: number;       // 총 예산 (선택사항)
}

export interface TransactionPeriod {
    queryType: number;          // eTransactionQueryType
    startDate?: string;
    endDate?: string;
    description: string;        // "오늘", "2025-05-26" 등
    payTypeFilter?: number;     // 적용된 수입/지출 필터
}

// Enum 값들 (서버와 맞춤)
// TransactionPeriod의 queryType에 들어갈 값들
export enum TransactionQueryType {
    All = 0,
    Today = 1,
    SelectedDate = 2,
    DateRange = 3,
    Monthly = 4,
    Expense, 
    Income
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