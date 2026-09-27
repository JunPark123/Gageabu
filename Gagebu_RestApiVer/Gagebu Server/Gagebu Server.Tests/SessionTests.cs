using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Gagebu_Server.DTO;
using Microsoft.EntityFrameworkCore;

namespace Gagebu_Server.Tests;

// 기기별 로그인 (토큰 갱신 B안)
[Collection(ApiCollection.Name)]
public class SessionTests : IAsyncLifetime
{
    private readonly ApiFactory _factory;

    public SessionTests(ApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.ResetAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<LoginResponse> DevLoginAsync(string key, string device)
    {
        var res = await _factory.CreateClient().PostAsJsonAsync("/api/auth/dev-login", new DevLoginRequest { Key = key, DeviceName = device });
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<LoginResponse>())!;
    }

    private HttpClient Client(string token)
    {
        var c = _factory.CreateClient();
        c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return c;
    }

    private Task<HttpResponseMessage> RefreshAsync(string refreshToken) =>
        _factory.CreateClient().PostAsJsonAsync("/api/auth/refresh", new RefreshRequest { RefreshToken = refreshToken });

    private static async Task<TokenResponse> ReadTokens(HttpResponseMessage res)
    {
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<TokenResponse>())!;
    }

    [Fact]
    public async Task 로그인하면_접근_토큰은_짧고_갱신_토큰이_따로_온다()
    {
        var login = await DevLoginAsync("a", "Galaxy");
        Assert.False(string.IsNullOrEmpty(login.RefreshToken));
        Assert.True(login.SessionId > 0);
        Assert.InRange(login.ExpiresAt - DateTimeOffset.UtcNow, TimeSpan.FromMinutes(55), TimeSpan.FromMinutes(61));

        // 갱신 토큰은 해시만 저장
        var stored = await _factory.WithDbAsync(db => db.UserSessions.SingleAsync(s => s.Id == login.SessionId));
        Assert.NotEqual(login.RefreshToken, stored.RefreshTokenHash);
        Assert.Equal("Galaxy", stored.DeviceName);
    }

    [Fact]
    public async Task 갱신하면_새_토큰_한_벌이_오고_새_접근_토큰으로_API를_쓴다()
    {
        var login = await DevLoginAsync("a", "Galaxy");
        var next = await ReadTokens(await RefreshAsync(login.RefreshToken));

        Assert.NotEqual(login.RefreshToken, next.RefreshToken);
        Assert.Equal(login.SessionId, next.SessionId);
        Assert.Equal(HttpStatusCode.OK, (await Client(next.Token).GetAsync("/api/me")).StatusCode);

        // 새 갱신 토큰으로 또 갱신 가능
        await ReadTokens(await RefreshAsync(next.RefreshToken));
    }

    [Fact]
    public async Task 응답을_못_받아_바로_재전송한_옛_토큰은_봐준다()
    {
        var login = await DevLoginAsync("a", "Galaxy");
        await ReadTokens(await RefreshAsync(login.RefreshToken));

        // 1분 안 재전송 → 한 번 더 교체해 준다
        var retried = await ReadTokens(await RefreshAsync(login.RefreshToken));
        Assert.Equal(HttpStatusCode.OK, (await Client(retried.Token).GetAsync("/api/me")).StatusCode);
    }

    [Fact]
    public async Task 한참_뒤_옛_토큰이_다시_오면_도난으로_보고_그_기기를_끊는다()
    {
        var login = await DevLoginAsync("a", "Galaxy");
        var next = await ReadTokens(await RefreshAsync(login.RefreshToken));
        await _factory.WithDbAsync(db => db.UserSessions.Where(s => s.Id == login.SessionId)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.RotatedAt, DateTime.UtcNow.AddMinutes(-5))));

        Assert.Equal(HttpStatusCode.Unauthorized, (await RefreshAsync(login.RefreshToken)).StatusCode);

        // 정상 쪽 토큰들도 같이 끊긴다 (누가 진짜인지 모르므로)
        Assert.Equal(HttpStatusCode.Unauthorized, (await RefreshAsync(next.RefreshToken)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Client(next.Token).GetAsync("/api/me")).StatusCode);
    }

    [Fact]
    public async Task 로그아웃하면_접근_토큰도_바로_막힌다()
    {
        var login = await DevLoginAsync("a", "Galaxy");
        var client = Client(login.Token);

        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync("/api/auth/logout", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/transactions")).StatusCode); // 기본 가계부로 새지 않음
        Assert.Equal(HttpStatusCode.Unauthorized, (await RefreshAsync(login.RefreshToken)).StatusCode);
    }

    [Fact]
    public async Task 기기_목록과_다른_기기_끊기()
    {
        var phone = await DevLoginAsync("a", "Galaxy");
        var tablet = await DevLoginAsync("a", "iPad");
        var phoneClient = Client(phone.Token);

        var sessions = (await phoneClient.GetFromJsonAsync<List<SessionDto>>("/api/auth/sessions"))!;
        Assert.Equal(new[] { "Galaxy", "iPad" }, sessions.Select(s => s.DeviceName).OrderBy(n => n));
        Assert.True(sessions.Single(s => s.Id == phone.SessionId).Current);
        Assert.False(sessions.Single(s => s.Id == tablet.SessionId).Current);

        // 폰에서 태블릿 끊기
        Assert.Equal(HttpStatusCode.NoContent, (await phoneClient.DeleteAsync($"/api/auth/sessions/{tablet.SessionId}")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Client(tablet.Token).GetAsync("/api/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await RefreshAsync(tablet.RefreshToken)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await phoneClient.GetAsync("/api/me")).StatusCode);
        Assert.Single((await phoneClient.GetFromJsonAsync<List<SessionDto>>("/api/auth/sessions"))!);
    }

    [Fact]
    public async Task 남의_기기는_끊을_수_없다()
    {
        var mine = await DevLoginAsync("a", "Galaxy");
        var theirs = await DevLoginAsync("b", "iPhone");

        Assert.Equal(HttpStatusCode.NotFound, (await Client(mine.Token).DeleteAsync($"/api/auth/sessions/{theirs.SessionId}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Client(theirs.Token).GetAsync("/api/me")).StatusCode);
    }

    [Fact]
    public async Task 오래_안_쓴_기기는_다시_로그인()
    {
        var login = await DevLoginAsync("a", "Galaxy");
        await _factory.WithDbAsync(db => db.UserSessions.Where(s => s.Id == login.SessionId)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.ExpiresAt, DateTime.UtcNow.AddMinutes(-1))));

        Assert.Equal(HttpStatusCode.Unauthorized, (await RefreshAsync(login.RefreshToken)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Client(login.Token).GetAsync("/api/me")).StatusCode);
    }

    [Fact]
    public async Task 갱신은_쓸수록_기한이_늘어난다()
    {
        var login = await DevLoginAsync("a", "Galaxy");
        await _factory.WithDbAsync(db => db.UserSessions.Where(s => s.Id == login.SessionId)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.ExpiresAt, DateTime.UtcNow.AddDays(1))));

        await ReadTokens(await RefreshAsync(login.RefreshToken));

        var session = await _factory.WithDbAsync(db => db.UserSessions.SingleAsync(s => s.Id == login.SessionId));
        Assert.True(session.ExpiresAt > DateTime.UtcNow.AddDays(59));
    }

    [Theory]
    [InlineData("")]
    [InlineData("garbage")]
    public async Task 잘못된_갱신_토큰(string token)
    {
        var res = await RefreshAsync(token);
        Assert.Equal(token == "" ? HttpStatusCode.BadRequest : HttpStatusCode.Unauthorized, res.StatusCode);
    }
}
