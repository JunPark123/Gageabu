using GagebuShared;

namespace Gagebu_Server.DTO
{
    public class DevLoginRequest
    {
        public string Key { get; set; } = "";               // 개발용 사용자 식별자 (예: "a", "b")
        public string? Nickname { get; set; }               // 처음 만들 때만 사용
        public string? Avatar { get; set; }
    }

    public class KakaoLoginRequest
    {
        public string AccessToken { get; set; } = "";       // 앱의 카카오 SDK 로그인 결과 accessToken
    }

    public class LoginResponse
    {
        public string Token { get; set; } = "";             // Authorization: Bearer <token>
        public DateTimeOffset ExpiresAt { get; set; }
        public MeDto Me { get; set; } = new();
    }

    public class UserDto
    {
        public int Id { get; set; }
        public string Nickname { get; set; } = "";
        public string Avatar { get; set; } = "";
    }

    public class MemberDto
    {
        public int UserId { get; set; }
        public string Nickname { get; set; } = "";
        public string Avatar { get; set; } = "";
        public eHouseholdRole Role { get; set; }
        public DateTimeOffset JoinedAt { get; set; }
    }

    public class HouseholdDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public eHouseholdRole MyRole { get; set; }
        public int MaxMembers { get; set; }
        public List<MemberDto> Members { get; set; } = new();  // 가입 순
    }

    public class MeDto
    {
        public UserDto User { get; set; } = new();
        public HouseholdDto Household { get; set; } = new();
    }

    public class UpdateProfileRequest
    {
        public string? Nickname { get; set; }
        public string? Avatar { get; set; }
    }

    public class UpdateHouseholdRequest
    {
        public string Name { get; set; } = "";
    }

    public class InviteDto
    {
        public string Code { get; set; } = "";
        public DateTimeOffset ExpiresAt { get; set; }
    }

    public class InvitePreviewDto
    {
        public string HouseholdName { get; set; } = "";
        public string InviterNickname { get; set; } = "";
        public int MemberCount { get; set; }
        public DateTimeOffset ExpiresAt { get; set; }
    }

    public class AcceptInviteRequest
    {
        // 혼자 쓰던 가계부의 내역을 새 가계부로 옮길지 (다른 멤버가 있는 가계부였다면 옮길 수 없음)
        public bool MergeMyTransactions { get; set; }
    }
}
