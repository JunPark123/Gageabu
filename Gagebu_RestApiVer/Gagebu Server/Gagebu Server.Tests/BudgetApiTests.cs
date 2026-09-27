using System.Net;
using System.Net.Http.Json;
using Gagebu_Server.DTO;

namespace Gagebu_Server.Tests;

[Collection(ApiCollection.Name)]
public class BudgetApiTests : IAsyncLifetime
{
    private readonly ApiFactory _factory;

    public BudgetApiTests(ApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.ResetAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    private static async Task<BudgetDto> SetDefaultAsync(HttpClient c, int? amount)
    {
        var res = await c.PutAsJsonAsync("/api/budget/default", new SetDefaultBudgetRequest { Amount = amount });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<BudgetDto>())!;
    }

    private static async Task<BudgetDto> SetMonthAsync(HttpClient c, string month, int amount)
    {
        var res = await c.PutAsJsonAsync($"/api/budget/months/{month}", new SetMonthBudgetRequest { Amount = amount });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<BudgetDto>())!;
    }

    private static async Task<MonthBudgetDto> MonthAsync(HttpClient c, string month) =>
        (await c.GetFromJsonAsync<MonthBudgetDto>($"/api/budget/months/{month}"))!;

    [Fact]
    public async Task 처음엔_예산이_없다()
    {
        var (a, _) = await _factory.LoginAsync("a");
        var budget = await a.GetFromJsonAsync<BudgetDto>("/api/budget");
        Assert.Null(budget!.DefaultAmount);
        Assert.Empty(budget.Overrides);
        Assert.Null((await MonthAsync(a, "2026-09")).Amount);
    }

    [Fact]
    public async Task 기본_예산과_달별_예외()
    {
        var (a, _) = await _factory.LoginAsync("a");
        await SetDefaultAsync(a, 500_000);
        var budget = await SetMonthAsync(a, "2026-09", 300_000);

        Assert.Equal(500_000, budget.DefaultAmount);
        Assert.Equal("2026-09", Assert.Single(budget.Overrides).Month);

        var sep = await MonthAsync(a, "2026-09");
        Assert.Equal(300_000, sep.Amount);
        Assert.True(sep.IsOverride);

        var oct = await MonthAsync(a, "2026-10");
        Assert.Equal(500_000, oct.Amount);
        Assert.False(oct.IsOverride);
    }

    [Fact]
    public async Task 예외_0원은_그_달만_예산_없음이고_지우면_기본으로()
    {
        var (a, _) = await _factory.LoginAsync("a");
        await SetDefaultAsync(a, 500_000);
        await SetMonthAsync(a, "2026-09", 0);

        var sep = await MonthAsync(a, "2026-09");
        Assert.Null(sep.Amount);
        Assert.True(sep.IsOverride);

        var res = await a.DeleteAsync("/api/budget/months/2026-09");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal(500_000, (await MonthAsync(a, "2026-09")).Amount);
    }

    [Fact]
    public async Task 같은_달을_다시_정하면_덮어쓴다()
    {
        var (a, _) = await _factory.LoginAsync("a");
        await SetMonthAsync(a, "2026-09", 100);
        var budget = await SetMonthAsync(a, "2026-09", 200);
        Assert.Equal(200, Assert.Single(budget.Overrides).Amount);
    }

    [Fact]
    public async Task 기본_예산_해제()
    {
        var (a, _) = await _factory.LoginAsync("a");
        await SetDefaultAsync(a, 500_000);
        Assert.Null((await SetDefaultAsync(a, null)).DefaultAmount);
    }

    [Theory]
    [InlineData("2026-13")]
    [InlineData("2026-9")]
    [InlineData("abc")]
    [InlineData("1999-01")]
    public async Task 잘못된_달은_400(string month)
    {
        var (a, _) = await _factory.LoginAsync("a");
        Assert.Equal(HttpStatusCode.BadRequest, (await a.GetAsync($"/api/budget/months/{month}")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await a.PutAsJsonAsync($"/api/budget/months/{month}", new SetMonthBudgetRequest { Amount = 1 })).StatusCode);
    }

    [Fact]
    public async Task 잘못된_금액은_400()
    {
        var (a, _) = await _factory.LoginAsync("a");
        Assert.Equal(HttpStatusCode.BadRequest,
            (await a.PutAsJsonAsync("/api/budget/default", new SetDefaultBudgetRequest { Amount = 0 })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await a.PutAsJsonAsync("/api/budget/months/2026-09", new SetMonthBudgetRequest { Amount = -1 })).StatusCode);
    }

    [Fact]
    public async Task 같은_가계부_멤버는_같은_예산을_보고_다른_가계부와는_따로()
    {
        var (a, _) = await _factory.LoginAsync("a");
        var (b, _) = await _factory.LoginAsync("b");
        var (c, _) = await _factory.LoginAsync("c");
        var code = (await (await a.PostAsync("/api/invites", null)).Content.ReadFromJsonAsync<InviteDto>())!.Code;
        await b.PostAsJsonAsync($"/api/invites/{code}/accept", new AcceptInviteRequest());

        await SetDefaultAsync(b, 700_000); // 멤버도 수정 가능

        Assert.Equal(700_000, (await a.GetFromJsonAsync<BudgetDto>("/api/budget"))!.DefaultAmount);
        Assert.Null((await c.GetFromJsonAsync<BudgetDto>("/api/budget"))!.DefaultAmount);
    }

    [Fact]
    public async Task 로그인_없는_개발_모드는_기본_가계부_예산()
    {
        var anonymous = _factory.CreateClient();
        await SetDefaultAsync(anonymous, 400_000);

        var (a, login) = await _factory.LoginAsync("a"); // 첫 사용자 = 기본 가계부 방장
        Assert.Equal(GagebuShared.Household.DefaultId, login.Me.Household.Id);
        Assert.Equal(400_000, (await a.GetFromJsonAsync<BudgetDto>("/api/budget"))!.DefaultAmount);
    }
}
