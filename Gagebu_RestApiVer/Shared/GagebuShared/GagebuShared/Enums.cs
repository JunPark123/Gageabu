using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GagebuShared
{
    public enum ePayType
    {
        None = 0,
        Expense = 1, //지출
        Income = 2 //수입
    }

    public enum eErrorType
    {
        Validation,
        NotFound,
        Conflict,
        ServerError
    }

    // 쿼리 타입 RESTAPI
    public enum eTransactionQueryType
    {
        All = 0,           // 전체
        Today = 1,         // 오늘
        SelectedDate = 2,  // 특정 날짜
        DateRange = 3,     // 기간 범위
        Expense = 4,       // 지출만
        Income = 5         // 수입만
    }
}
