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

    public enum ErrorType
    {
        Validation,
        NotFound,
        Conflict,
        ServerError
    }
}
