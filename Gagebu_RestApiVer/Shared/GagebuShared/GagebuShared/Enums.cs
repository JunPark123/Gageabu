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
        Forbidden,  // 권한 없음 (예: 방장만 할 수 있는 일)
        Gone,       // 만료·사용된 초대 코드
        Unauthorized, // 로그인 실패 (예: 카카오 토큰이 유효하지 않음)
        Unavailable,  // 서버 설정이 안 돼서 지금은 못 함
        ServerError
    }
}
