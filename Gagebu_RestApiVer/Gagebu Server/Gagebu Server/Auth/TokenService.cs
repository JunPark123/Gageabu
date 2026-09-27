using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Gagebu_Server.Auth
{
    // 토큰 발급 (docs/PLAN.md 3단계 토큰 갱신 B안)
    //  - 접근 토큰(JWT): 짧게. sub = 사용자, sid = 로그인 기기(세션). 요청마다 세션이 살아 있는지 확인한다
    //  - 갱신 토큰: 무작위 값. DB에는 해시만
    public class TokenService
    {
        public const string SessionClaim = "sid";
        private readonly AuthSettings _settings;

        public TokenService(IOptions<AuthSettings> settings) => _settings = settings.Value;

        public static SymmetricSecurityKey SigningKey(AuthSettings settings) =>
            new(Encoding.UTF8.GetBytes(settings.JwtKey));

        public (string Token, DateTimeOffset ExpiresAt) IssueAccessToken(int userId, int sessionId)
        {
            var expiresAt = DateTimeOffset.UtcNow.AddMinutes(_settings.AccessTokenMinutes);
            var token = new JwtSecurityToken(
                issuer: _settings.Issuer,
                audience: _settings.Issuer,
                claims:
                [
                    new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
                    new Claim(SessionClaim, sessionId.ToString()),
                ],
                expires: expiresAt.UtcDateTime,
                signingCredentials: new SigningCredentials(SigningKey(_settings), SecurityAlgorithms.HmacSha256));
            return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
        }

        // 갱신 토큰 (256비트 무작위) 과 저장용 해시
        public static (string Token, string Hash) NewRefreshToken()
        {
            var token = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));
            return (token, Hash(token));
        }

        public static string Hash(string refreshToken) =>
            Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken)));
    }
}
