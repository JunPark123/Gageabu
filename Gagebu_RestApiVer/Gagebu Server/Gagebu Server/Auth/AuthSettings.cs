namespace Gagebu_Server.Auth
{
    // 설정 섹션 "Auth" (환경변수 Auth__JwtKey 등). 개발 값은 docker-compose.yml에서 넣는다
    public class AuthSettings
    {
        public const string Section = "Auth";

        public string JwtKey { get; set; } = "";         // HMAC 서명 키, 32바이트 이상
        public string Issuer { get; set; } = "gageabu";
        public int AccessTokenMinutes { get; set; } = 60;  // 접근 토큰 (짧게)
        public int RefreshTokenDays { get; set; } = 60;    // 갱신 토큰: 마지막 사용부터 이 기간 안 쓰면 다시 로그인

        // 둘 다 Development 환경에서만 동작한다 (운영에서 켜도 무시)
        public bool DevLoginEnabled { get; set; }          // POST /api/auth/dev-login
        public bool AllowAnonymous { get; set; }           // 토큰 없는 요청 = 기본 가계부 (로그인 없는 지금 앱용)

        // 운영 테스트 로그인: 이 값(16자 이상)이 있으면 운영에서도 dev-login을 열되, 요청의 testCode가 같을 때만.
        // 카카오 로그인 전에 실제 서버로 폰 테스트를 하기 위한 임시 장치 — 카카오가 붙으면 비운다 (환경변수 Auth__TestLoginCode)
        public string? TestLoginCode { get; set; }

        public bool TestLoginConfigured => TestLoginCode is { Length: >= 16 };
    }
}
