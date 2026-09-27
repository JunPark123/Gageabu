using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Gagebu_Server.Auth
{
    // 설정 섹션 "Kakao" (환경변수 Kakao__AppId). 카카오 개발자 콘솔 > 내 애플리케이션 > 앱 ID(숫자)
    public class KakaoSettings
    {
        public const string Section = "Kakao";
        // compose에서 빈 값으로 넘어올 수 있어 문자열로 받는다 (빈 값 = 카카오 로그인 꺼짐)
        public string? AppId { get; set; }
        public long? ParsedAppId => long.TryParse(AppId, out var id) ? id : null;
    }

    public record KakaoTokenInfo(long UserId, long AppId);
    public record KakaoProfile(long UserId, string? Nickname);

    // 카카오 API. 앱이 SDK로 받은 액세스 토큰으로 조회한다 (서버는 카카오 비밀 키가 필요 없음)
    public interface IKakaoApi
    {
        // 토큰이 유효하지 않으면 null
        Task<KakaoTokenInfo?> GetTokenInfoAsync(string accessToken, CancellationToken ct = default);
        Task<KakaoProfile?> GetProfileAsync(string accessToken, CancellationToken ct = default);
    }

    public class KakaoApi : IKakaoApi
    {
        public const string BaseAddress = "https://kapi.kakao.com/";
        private readonly HttpClient _http;

        public KakaoApi(HttpClient http) => _http = http;

        public async Task<KakaoTokenInfo?> GetTokenInfoAsync(string accessToken, CancellationToken ct = default)
        {
            var body = await GetAsync<TokenInfoResponse>("v1/user/access_token_info", accessToken, ct);
            return body == null ? null : new KakaoTokenInfo(body.Id, body.AppId);
        }

        public async Task<KakaoProfile?> GetProfileAsync(string accessToken, CancellationToken ct = default)
        {
            var body = await GetAsync<UserMeResponse>("v2/user/me", accessToken, ct);
            if (body == null) return null;
            // 닉네임 동의를 안 했으면 없을 수 있다
            var nickname = body.KakaoAccount?.Profile?.Nickname ?? body.Properties?.Nickname;
            return new KakaoProfile(body.Id, string.IsNullOrWhiteSpace(nickname) ? null : nickname.Trim());
        }

        private async Task<T?> GetAsync<T>(string path, string accessToken, CancellationToken ct) where T : class
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, path);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            using var response = await _http.SendAsync(request, ct);
            // 만료·잘못된 토큰은 401 (카카오 오류 코드 -401)
            if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.BadRequest)
                return null;
            response.EnsureSuccessStatusCode();
            return await JsonSerializer.DeserializeAsync<T>(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
        }

        private class TokenInfoResponse
        {
            [JsonPropertyName("id")] public long Id { get; set; }
            [JsonPropertyName("app_id")] public long AppId { get; set; }
        }

        private class UserMeResponse
        {
            [JsonPropertyName("id")] public long Id { get; set; }
            [JsonPropertyName("kakao_account")] public KakaoAccount? KakaoAccount { get; set; }
            [JsonPropertyName("properties")] public KakaoProperties? Properties { get; set; }
        }

        private class KakaoAccount
        {
            [JsonPropertyName("profile")] public KakaoProperties? Profile { get; set; }
        }

        private class KakaoProperties
        {
            [JsonPropertyName("nickname")] public string? Nickname { get; set; }
        }
    }
}
