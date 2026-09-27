using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Gagebu_Server.Auth
{
    // JWT 발급. 토큰에는 사용자 Id만 넣는다 (가계부 소속은 요청마다 DB에서 확인 → 내보내면 바로 반영)
    public class TokenService
    {
        private readonly AuthSettings _settings;

        public TokenService(IOptions<AuthSettings> settings) => _settings = settings.Value;

        public static SymmetricSecurityKey SigningKey(AuthSettings settings) =>
            new(Encoding.UTF8.GetBytes(settings.JwtKey));

        public (string Token, DateTimeOffset ExpiresAt) Issue(int userId)
        {
            var expiresAt = DateTimeOffset.UtcNow.AddDays(_settings.TokenDays);
            var token = new JwtSecurityToken(
                issuer: _settings.Issuer,
                audience: _settings.Issuer,
                claims: [new Claim(JwtRegisteredClaimNames.Sub, userId.ToString())],
                expires: expiresAt.UtcDateTime,
                signingCredentials: new SigningCredentials(SigningKey(_settings), SecurityAlgorithms.HmacSha256));
            return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
        }
    }
}
