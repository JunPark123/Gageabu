using System.Net;
using System.Net.Http.Json;
using Gagebu_Server.DTO;
using GagebuShared;
using Microsoft.EntityFrameworkCore;

namespace Gagebu_Server.Tests;

// 푸시 알림: 토큰 등록, 상대 기록 알림, 예산 80%·100% 알림, 설정 끄기, 끊긴 기기·삭제된 토큰
[Collection(ApiCollection.Name)]
public class PushTests : IAsyncLifetime
{
    private readonly ApiFactory _factory;

    public PushTests(ApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.ResetAsync();
        _factory.Push.Clear();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private const string TokenA = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]";
    private const string TokenB = "ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]";

    // a(방장)와 b가 같은 가계부, 각자 토큰 등록
    private async Task<(HttpClient A, HttpClient B)> CoupleAsync()
    {
        var (a, _) = await _factory.LoginAsync("a", "준");
        var (b, _) = await _factory.LoginAsync("b", "다현");
        var code = (await (await a.PostAsync("/api/invites", null)).Content.ReadFromJsonAsync<InviteDto>())!.Code;
        (await b.PostAsJsonAsync($"/api/invites/{code}/accept", new AcceptInviteRequest())).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.NoContent, (await a.PutAsJsonAsync("/api/me/push-token", new RegisterPushTokenRequest { Token = TokenA, Platform = "android" })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await b.PutAsJsonAsync("/api/me/push-token", new RegisterPushTokenRequest { Token = TokenB, Platform = "android" })).StatusCode);
        return (a, b);
    }

    private static Task<HttpResponseMessage> SpendAsync(HttpClient c, int cost, string category = "식비") =>
        c.PostAsJsonAsync("/api/transactions", new TransactionDto
        {
            Type = "점심", Cost = cost, Date = DateTimeOffset.UtcNow, Paytype = ePayType.Expense, Category = category,
        });

    private static Task SetNotifyAsync(HttpClient c, bool partner, bool budget) =>
        c.PutAsJsonAsync("/api/me/notifications", new NotificationSettingsDto { PartnerRecords = partner, Budget = budget });

    [Fact]
    public async Task 상대가_기록하면_나에게만_알림이_간다()
    {
        var (a, _) = await CoupleAsync();
        (await SpendAsync(a, 30000)).EnsureSuccessStatusCode();

        var sent = await _factory.Push.WaitAsync(s => s.Count > 0);
        var msg = Assert.Single(sent);
        Assert.Equal(TokenB, msg.To);
        Assert.Equal("준님이 식비 30,000원 지출을 기록했어요 · 점심", msg.Body);
    }

    [Fact]
    public async Task 알림_설정을_끄면_보내지_않는다()
    {
        var (a, b) = await CoupleAsync();
        await SetNotifyAsync(b, partner: false, budget: true);
        Assert.False((await b.GetFromJsonAsync<NotificationSettingsDto>("/api/me/notifications"))!.PartnerRecords);

        (await SpendAsync(a, 1000)).EnsureSuccessStatusCode();
        await Task.Delay(800);
        Assert.Empty(_factory.Push.Sent);
    }

    [Fact]
    public async Task 예산_80퍼센트와_100퍼센트를_처음_넘을_때_모두에게()
    {
        var (a, b) = await CoupleAsync();
        (await a.PutAsJsonAsync("/api/budget/default", new SetDefaultBudgetRequest { Amount = 100000 })).EnsureSuccessStatusCode();
        await SetNotifyAsync(a, partner: false, budget: true);
        await SetNotifyAsync(b, partner: false, budget: true);

        (await SpendAsync(a, 70000)).EnsureSuccessStatusCode();   // 70%: 없음
        (await SpendAsync(a, 15000)).EnsureSuccessStatusCode();   // 85%: 80% 알림
        var after80 = await _factory.Push.WaitAsync(s => s.Count >= 2);
        Assert.Equal(new[] { TokenA, TokenB }, after80.Select(m => m.To).OrderBy(t => t));
        Assert.All(after80, m => Assert.Equal("예산 80% 사용", m.Title));

        (await SpendAsync(a, 5000)).EnsureSuccessStatusCode();    // 90%: 없음
        (await SpendAsync(a, 20000)).EnsureSuccessStatusCode();   // 110%: 100% 알림
        var all = await _factory.Push.WaitAsync(s => s.Count >= 4);
        await Task.Delay(300);
        all = _factory.Push.Sent;
        Assert.Equal(4, all.Count);
        Assert.All(all.Skip(2), m => Assert.Equal("예산을 넘었어요 🐷💦", m.Title));
    }

    [Fact]
    public async Task 로그아웃한_기기와_삭제된_토큰으로는_보내지_않는다()
    {
        var (a, b) = await CoupleAsync();
        Assert.Equal(HttpStatusCode.NoContent, (await b.PostAsync("/api/auth/logout", null)).StatusCode);
        (await SpendAsync(a, 1000)).EnsureSuccessStatusCode();
        await Task.Delay(800);
        Assert.Empty(_factory.Push.Sent);

        // 다시 로그인해 같은 토큰 등록 → 이번엔 앱이 지워진 상태(DeviceNotRegistered) → 토큰 삭제
        var (b2, _) = await _factory.LoginAsync("b");
        await b2.PutAsJsonAsync("/api/me/push-token", new RegisterPushTokenRequest { Token = TokenB });
        _factory.Push.DeadTokens.Add(TokenB);
        (await SpendAsync(a, 1000)).EnsureSuccessStatusCode();
        await _factory.Push.WaitAsync(s => s.Count > 0);

        var left = new List<string> { TokenB };
        for (var i = 0; i < 40 && left.Contains(TokenB); i++)
        {
            await Task.Delay(50);
            left = await _factory.WithDbAsync(db => db.PushTokens.Select(p => p.Token).ToListAsync());
        }
        Assert.DoesNotContain(TokenB, left);
    }

    [Fact]
    public async Task 초대로_새_멤버가_들어오면_원래_멤버에게_알림()
    {
        var (a, _) = await _factory.LoginAsync("a", "준");
        await a.PutAsJsonAsync("/api/me/push-token", new RegisterPushTokenRequest { Token = TokenA, Platform = "android" });
        var (b, _) = await _factory.LoginAsync("b", "다현");
        await b.PutAsJsonAsync("/api/me/push-token", new RegisterPushTokenRequest { Token = TokenB, Platform = "android" });

        var code = (await (await a.PostAsync("/api/invites", null)).Content.ReadFromJsonAsync<InviteDto>())!.Code;
        (await b.PostAsJsonAsync($"/api/invites/{code}/accept", new AcceptInviteRequest())).EnsureSuccessStatusCode();

        var sent = await _factory.Push.WaitAsync(s => s.Count > 0);
        var msg = Assert.Single(sent);
        Assert.Equal(TokenA, msg.To);   // 들어온 본인에게는 안 감
        Assert.Contains("다현님이", msg.Body);
        Assert.Equal("member", msg.Data!["kind"]);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-a-token")]
    [InlineData("ExponentPushToken[]")]
    public async Task 이상한_토큰은_400(string token)
    {
        var (a, _) = await _factory.LoginAsync("a");
        Assert.Equal(HttpStatusCode.BadRequest, (await a.PutAsJsonAsync("/api/me/push-token", new RegisterPushTokenRequest { Token = token })).StatusCode);
    }
}
