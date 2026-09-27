using System.ComponentModel.DataAnnotations;

namespace GagebuShared
{
    // 앱 사용자. 지금은 개발용 로그인(DevKey), 나중에 카카오 로그인(KakaoId)
    public class User
    {
        [Key]
        public int Id { get; set; }
        public string? KakaoId { get; set; }
        public string? DevKey { get; set; }        // 개발용 로그인 식별자 (운영에서는 쓰지 않음)
        public string Nickname { get; set; } = "";
        public string Avatar { get; set; } = "🐷";  // 이모지
        public DateTime CreatedAt { get; set; }     // UTC
    }

    public enum eHouseholdRole
    {
        Owner = 1,   // 방장: 초대·내보내기
        Member = 2,
    }

    // 가계부 멤버. 구조상 한 사람이 여러 가계부에 속할 수 있지만, 지금은 서비스에서 1개로 제한한다
    public class HouseholdMember
    {
        public int HouseholdId { get; set; }
        public int UserId { get; set; }
        public eHouseholdRole Role { get; set; }
        public DateTime JoinedAt { get; set; }      // UTC
    }

    // 1회용 초대 코드
    public class Invite
    {
        [Key]
        public int Id { get; set; }
        public string Code { get; set; } = "";
        public int HouseholdId { get; set; }
        public int InviterUserId { get; set; }
        public DateTime CreatedAt { get; set; }     // UTC
        public DateTime ExpiresAt { get; set; }     // UTC
        public int? UsedByUserId { get; set; }
        public DateTime? UsedAt { get; set; }       // UTC
    }
}
