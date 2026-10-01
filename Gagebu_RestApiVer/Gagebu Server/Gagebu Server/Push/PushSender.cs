using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace Gagebu_Server.Push
{
    // 설정 섹션 "Push" (환경변수 Push__Enabled 등)
    public class PushSettings
    {
        public const string Section = "Push";
        public bool Enabled { get; set; } = true;
        public string? ExpoAccessToken { get; set; }      // (선택) expo.dev의 푸시 보안 토큰을 켰을 때만
    }

    public record PushMessage(string To, string Title, string Body, Dictionary<string, object?>? Data = null);

    // 보낸 결과: 토큰이 더 이상 유효하지 않으면(앱 삭제 등) DeviceNotRegistered → 그 토큰을 지운다
    public record PushResult(string To, bool Ok, string? Error);

    public interface IPushSender
    {
        Task<IReadOnlyList<PushResult>> SendAsync(IReadOnlyList<PushMessage> messages, CancellationToken ct);
    }

    // Expo 푸시 서비스 (https://docs.expo.dev/push-notifications/sending-notifications/) — 한 번에 100개까지
    public class ExpoPushSender : IPushSender
    {
        public const string BaseAddress = "https://exp.host";
        private readonly HttpClient _http;
        private readonly PushSettings _settings;

        public ExpoPushSender(HttpClient http, IOptions<PushSettings> settings)
        {
            _http = http;
            _settings = settings.Value;
        }

        public async Task<IReadOnlyList<PushResult>> SendAsync(IReadOnlyList<PushMessage> messages, CancellationToken ct)
        {
            var results = new List<PushResult>();
            foreach (var chunk in messages.Chunk(100))
            {
                using var req = new HttpRequestMessage(HttpMethod.Post, "/--/api/v2/push/send")
                {
                    Content = JsonContent.Create(chunk.Select(m => new ExpoMessage(m.To, m.Title, m.Body, m.Data, "default", "high", "default"))),
                };
                if (!string.IsNullOrEmpty(_settings.ExpoAccessToken))
                    req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ExpoAccessToken);

                using var res = await _http.SendAsync(req, ct);
                res.EnsureSuccessStatusCode();
                var body = await res.Content.ReadFromJsonAsync<ExpoResponse>(cancellationToken: ct);
                var tickets = body?.Data ?? [];
                for (var i = 0; i < chunk.Length; i++)
                {
                    var t = i < tickets.Count ? tickets[i] : null;
                    results.Add(new PushResult(chunk[i].To, t?.Status == "ok", t?.Details?.Error ?? t?.Message));
                }
            }
            return results;
        }

        private record ExpoMessage(
            [property: JsonPropertyName("to")] string To,
            [property: JsonPropertyName("title")] string Title,
            [property: JsonPropertyName("body")] string Body,
            [property: JsonPropertyName("data")] Dictionary<string, object?>? Data,
            [property: JsonPropertyName("sound")] string Sound,
            [property: JsonPropertyName("priority")] string Priority,
            [property: JsonPropertyName("channelId")] string ChannelId);

        private record ExpoResponse([property: JsonPropertyName("data")] List<ExpoTicket>? Data);
        private record ExpoTicket(
            [property: JsonPropertyName("status")] string? Status,
            [property: JsonPropertyName("message")] string? Message,
            [property: JsonPropertyName("details")] ExpoTicketDetails? Details);
        private record ExpoTicketDetails([property: JsonPropertyName("error")] string? Error);
    }
}
