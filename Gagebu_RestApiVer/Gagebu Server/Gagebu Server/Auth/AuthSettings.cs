namespace Gagebu_Server.Auth
{
    // 설정 섹션 "Auth" (환경변수 Auth__JwtKey 등). 개발 값은 docker-compose.yml에서 넣는다
    public class AuthSettings
    {
        public const string Section = "Auth";

        public string JwtKey { get; set; } = "";         // HMAC 서명 키, 32바이트 이상
        public string Issuer { get; set; } = "gageabu";
        public int TokenDays { get; set; } = 30;

        // 둘 다 Development 환경에서만 동작한다 (운영에서 켜도 무시)
        public bool DevLoginEnabled { get; set; }          // POST /api/auth/dev-login
        public bool AllowAnonymous { get; set; }           // 토큰 없는 요청 = 기본 가계부 (로그인 없는 지금 앱용)
    }
}
