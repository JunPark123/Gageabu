using GagebuShared;

namespace Gagebu_Server.DTO
{
    public class DevLoginRequest
    {
        public string Key { get; set; } = "";               // 개발용 사용자 식별자 (예: "a", "b")
        public string? Nickname { get; set; }               // 처음 만들 때만 사용
        public string? Avatar { get; set; }
        public string? DeviceName { get; set; }             // 기기 목록에 보일 이름 (예: "Galaxy S24")
        public string? DeviceId { get; set; }               // 앱 설치마다 고정된 무작위 값 (같은 기기 재로그인 → 이전 세션 종료)
        public string? TestCode { get; set; }               // 운영 테스트 로그인 코드 (Auth:TestLoginCode와 같아야 함)
    }

    public class KakaoLoginRequest
    {
        public string AccessToken { get; set; } = "";       // 앱의 카카오 SDK 로그인 결과 accessToken
        public string? DeviceName { get; set; }
        public string? DeviceId { get; set; }
    }

    // 토큰 한 벌. 접근 토큰이 만료되면(401) 갱신 토큰으로 POST /api/auth/refresh
    public class TokenResponse
    {
        public string Token { get; set; } = "";             // 접근 토큰: Authorization: Bearer <token> (1시간)
        public DateTimeOffset ExpiresAt { get; set; }
        public string RefreshToken { get; set; } = "";      // 갱신 토큰: 쓸 때마다 새 것으로 바뀜 → 받은 새 값으로 저장
        public int SessionId { get; set; }                  // 이 기기
    }

    public class LoginResponse : TokenResponse
    {
        public MeDto Me { get; set; } = new();
    }

    public class RefreshRequest
    {
        public string RefreshToken { get; set; } = "";
    }

    public class SessionDto
    {
        public int Id { get; set; }
        public string DeviceName { get; set; } = "";
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset LastUsedAt { get; set; }
        public bool Current { get; set; }                   // 지금 이 요청을 보낸 기기
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
