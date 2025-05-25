using System.ComponentModel.DataAnnotations;

namespace GagebuShared
{
    public class GagebuTransactionSimple
    {
        public int Id { get; set; }
        public string Description { get; set; } = "";
        public int Cost { get; set; }
        public DateTime Date { get; set; }
        public string Category { get; set; } = "";
    }

    public class GagebuTransaction
    {
        [Key]
        public int Id { get; set; }
        //입력종류
        public string Type { get; set; } = ""; //지출 내역
        //날짜
        public DateTime Date { get; set; }
        //신용카드
        public int Paytype { get; set; }
        //분류
        public string Category { get; set; } = "";
        //금액
        public int Cost { get; set; }
        //내용
        public string Content { get; set; } = "";
    }
}
