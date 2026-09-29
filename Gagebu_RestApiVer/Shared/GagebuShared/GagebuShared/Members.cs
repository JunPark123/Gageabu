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

    // 로그인한 기기 하나. 갱신 토큰은 해시만 저장한다 (DB가 새도 토큰으로 못 씀)
    public class UserSession
    {
        [Key]
        public int Id { get; set; }
        public int UserId { get; set; }
        public string DeviceName { get; set; } = "";       // 기기 목록에 보일 이름 (앱이 보냄)
        public string? DeviceId { get; set; }              // 앱 설치(브라우저)마다 고정 무작위 값 — 같은 기기에서 다시 로그인하면 이전 세션을 끝냄
        public string RefreshTokenHash { get; set; } = "";
        public string? PreviousTokenHash { get; set; }     // 바로 전 토큰 (재사용 감지·재전송 유예)
        public DateTime CreatedAt { get; set; }            // UTC
        public DateTime LastUsedAt { get; set; }
        public DateTime? RotatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }            // 마지막 사용부터 N일 (쓸수록 연장)
        public DateTime? RevokedAt { get; set; }           // 로그아웃·기기 끊기·도난 의심
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
