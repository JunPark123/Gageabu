using System.ComponentModel.DataAnnotations;

namespace GagebuShared
{
    // 가계부. 커플이 같은 Household를 공유한다 (docs/PLAN.md 4장)
    public class Household
    {
        // 로그인 도입 전까지 모든 내역이 들어가는 기본 가계부
        public const int DefaultId = 1;

        [Key]
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public DateTime CreatedAt { get; set; }     // UTC
    }
}
