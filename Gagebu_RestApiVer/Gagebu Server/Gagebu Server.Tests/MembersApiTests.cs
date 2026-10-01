using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Gagebu_Server.DTO;
using GagebuShared;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;

namespace Gagebu_Server.Tests;

[Collection(ApiCollection.Name)]
public class MembersApiTests : IAsyncLifetime
{
    private readonly ApiFactory _factory;

    public MembersApiTests(ApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.ResetAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    private static TransactionDto Tx(int cost) => new()
    {
        Type = "테스트", Cost = cost, Date = DateTimeOffset.Parse("2026-09-27T12:00:00+09:00"), Paytype = ePayType.Expense,
    };

    private static async Task<TransactionDto> CreateTxAsync(HttpClient client, int cost)
    {
        var res = await client.PostAsJsonAsync("/api/transactions", Tx(cost));
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<TransactionDto>())!;
    }

    private static async Task<List<int>> CostsAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<TransactionDto>>("/api/transactions"))!.Select(t => t.Cost).OrderBy(c => c).ToList();

    private static async Task<string> InviteAsync(HttpClient owner)
    {
        var res = await owner.PostAsync("/api/invites", null);
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<InviteDto>())!.Code;
    }

    private static Task<HttpResponseMessage> AcceptAsync(HttpClient client, string code, bool merge = false) =>
        client.PostAsJsonAsync($"/api/invites/{code}/accept", new AcceptInviteRequest { MergeMyTransactions = merge });

    // ── 로그인 ──

    [Fact]
    public async Task 첫_로그인_사용자가_기존_기본_가계부의_방장이_되고_기존_내역을_본다()
    {
        await CreateTxAsync(_factory.CreateClient(), 100); // 로그인 전(익명) 내역

        var (a, login) = await _factory.LoginAsync("a", "철수");

        Assert.Equal("철수", login.Me.User.Nickname);
        Assert.Equal(Household.DefaultId, login.Me.Household.Id);
        Assert.Equal(eHouseholdRole.Owner, login.Me.Household.MyRole);
        Assert.Equal(new List<int> { 100 }, await CostsAsync(a));
    }

    [Fact]
    public async Task 두번째_사용자는_자기_가계부를_새로_받고_남의_내역은_못_본다()
    {
        var (a, _) = await _factory.LoginAsync("a");
        await CreateTxAsync(a, 100);

        var (b, loginB) = await _factory.LoginAsync("b", "영희");

        Assert.NotEqual(Household.DefaultId, loginB.Me.Household.Id);
        Assert.Equal("영희의 가계부", loginB.Me.Household.Name);
        Assert.Empty(await CostsAsync(b));
    }

    [Fact]
    public async Task 같은_키로_다시_로그인하면_같은_사용자()
    {
        var (_, first) = await _factory.LoginAsync("a", "철수");
        var (_, second) = await _factory.LoginAsync("a", "다른이름");

        Assert.Equal(first.Me.User.Id, second.Me.User.Id);
        Assert.Equal("철수", second.Me.User.Nickname); // 닉네임은 처음 만들 때만
    }

    [Fact]
    public async Task 로그인한_사람이_쓴_내역에는_작성자가_남는다()
    {
        var (a, login) = await _factory.LoginAsync("a");
        var tx = await CreateTxAsync(a, 100);
        Assert.Equal(login.Me.User.Id, tx.CreatedByUserId);

        var anonymous = await CreateTxAsync(_factory.CreateClient(), 200);
        Assert.Null(anonymous.CreatedByUserId);
    }

    [Fact]
    public async Task 내_정보는_로그인해야_볼_수_있다()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().GetAsync("/api/me")).StatusCode);

        var (a, _) = await _factory.LoginAsync("a", "철수");
        var me = await a.GetFromJsonAsync<MeDto>("/api/me");
        Assert.Equal("철수", me!.User.Nickname);
        Assert.Single(me.Household.Members);
    }

    [Fact]
    public async Task 틀린_토큰은_기본_가계부로_새지_않고_401()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "not-a-token");
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/transactions")).StatusCode);
    }

    [Fact]
    public async Task 프로필과_가계부_이름_수정()
    {
        var (a, _) = await _factory.LoginAsync("a");

        var me = await (await a.PatchAsJsonAsync("/api/me", new UpdateProfileRequest { Nickname = " 철수 ", Avatar = "🐰" }))
            .Content.ReadFromJsonAsync<MeDto>();
        Assert.Equal("철수", me!.User.Nickname);
        Assert.Equal("🐰", me.User.Avatar);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await a.PatchAsJsonAsync("/api/me", new UpdateProfileRequest { Nickname = "  " })).StatusCode);

        var household = await (await a.PatchAsJsonAsync("/api/household", new UpdateHouseholdRequest { Name = "우리집" }))
            .Content.ReadFromJsonAsync<HouseholdDto>();
        Assert.Equal("우리집", household!.Name);
    }

    // ── 초대 ──

    [Fact]
    public async Task 초대_수락하면_같은_가계부를_함께_쓴다()
    {
        var (a, loginA) = await _factory.LoginAsync("a", "철수");
        await CreateTxAsync(a, 100);
        var (b, _) = await _factory.LoginAsync("b", "영희");

        var code = await InviteAsync(a);
        Assert.Equal(8, code.Length);

        var preview = await b.GetFromJsonAsync<InvitePreviewDto>($"/api/invites/{code}");
        Assert.Equal("철수", preview!.InviterNickname);
        Assert.Equal(1, preview.MemberCount);

        var res = await AcceptAsync(b, code);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var meB = (await res.Content.ReadFromJsonAsync<MeDto>())!;
        Assert.Equal(loginA.Me.Household.Id, meB.Household.Id);
        Assert.Equal(eHouseholdRole.Member, meB.Household.MyRole);
        Assert.Equal(new[] { "철수", "영희" }, meB.Household.Members.Select(m => m.Nickname));

        // 서로의 내역이 보인다
        await CreateTxAsync(b, 200);
        Assert.Equal(new List<int> { 100, 200 }, await CostsAsync(a));
        Assert.Equal(new List<int> { 100, 200 }, await CostsAsync(b));
    }

    [Fact]
    public async Task 초대_코드는_1회용이다()
    {
        var (a, _) = await _factory.LoginAsync("a");
        var (b, _) = await _factory.LoginAsync("b");
        var (c, _) = await _factory.LoginAsync("c");
        var code = await InviteAsync(a);

        Assert.Equal(HttpStatusCode.OK, (await AcceptAsync(b, code)).StatusCode);
        Assert.Equal(HttpStatusCode.Gone, (await AcceptAsync(c, code)).StatusCode);
        Assert.Equal(HttpStatusCode.Gone, (await c.GetAsync($"/api/invites/{code}")).StatusCode);
    }

    [Fact]
    public async Task 새_코드를_생성하면_이전_코드는_조회와_참여가_모두_막힌다()
    {
        var (a, _) = await _factory.LoginAsync("a");
        var (b, _) = await _factory.LoginAsync("b");
        var (c, _) = await _factory.LoginAsync("c");
        var otherHouseholdCode = await InviteAsync(c);
        var oldCode = await InviteAsync(a);
        // 예전 코드로 이미 미리보기를 본 경우도 수락 단계에서 다시 검사한다.
        Assert.Equal(HttpStatusCode.OK, (await b.GetAsync($"/api/invites/{oldCode}")).StatusCode);
        var newCode = await InviteAsync(a);

        Assert.Equal(HttpStatusCode.Gone, (await b.GetAsync($"/api/invites/{oldCode}")).StatusCode);
        Assert.Equal(HttpStatusCode.Gone, (await AcceptAsync(b, oldCode)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await b.GetAsync($"/api/invites/{otherHouseholdCode}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await AcceptAsync(b, newCode)).StatusCode);
    }

    [Fact]
    public async Task 동시에_초대코드를_생성해도_한_코드만_유효하다()
    {
        var (a, _) = await _factory.LoginAsync("a");
        var (b, _) = await _factory.LoginAsync("b");
        var codes = await Task.WhenAll(InviteAsync(a), InviteAsync(a));
        var previews = await Task.WhenAll(codes.Select(code => b.GetAsync($"/api/invites/{code}")));

        Assert.Single(previews, response => response.StatusCode == HttpStatusCode.OK);
        Assert.Single(previews, response => response.StatusCode == HttpStatusCode.Gone);
        var validCode = codes[Array.FindIndex(previews, response => response.StatusCode == HttpStatusCode.OK)];
        Assert.Equal(HttpStatusCode.OK, (await AcceptAsync(b, validCode)).StatusCode);
    }

    [Fact]
    public async Task 만료된_코드와_없는_코드()
    {
        var (a, _) = await _factory.LoginAsync("a");
        var (b, _) = await _factory.LoginAsync("b");
        var code = await InviteAsync(a);
        await _factory.WithDbAsync(db => db.Invites.Where(i => i.Code == code)
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.ExpiresAt, DateTime.UtcNow.AddMinutes(-1))));

        Assert.Equal(HttpStatusCode.Gone, (await AcceptAsync(b, code)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await AcceptAsync(b, "ZZZZZZZZ")).StatusCode);
    }

    [Fact]
    public async Task 코드는_소문자나_하이픈이_섞여도_된다()
    {
        var (a, _) = await _factory.LoginAsync("a");
        var (b, _) = await _factory.LoginAsync("b");
        var code = await InviteAsync(a);

        var typed = $"{code[..4].ToLowerInvariant()}-{code[4..]}";
        Assert.Equal(HttpStatusCode.OK, (await AcceptAsync(b, typed)).StatusCode);
    }

    [Fact]
    public async Task 혼자_쓰던_내역은_합쳐서_가져올_수_있다()
    {
        var (a, _) = await _factory.LoginAsync("a");
        await CreateTxAsync(a, 100);
        var (b, _) = await _factory.LoginAsync("b");
        await CreateTxAsync(b, 200);

        Assert.Equal(HttpStatusCode.OK, (await AcceptAsync(b, await InviteAsync(a), merge: true)).StatusCode);
        Assert.Equal(new List<int> { 100, 200 }, await CostsAsync(a));
    }

    [Fact]
    public async Task 합치지_않으면_예전_내역은_따라오지_않는다()
    {
        var (a, _) = await _factory.LoginAsync("a");
        var (b, _) = await _factory.LoginAsync("b");
        await CreateTxAsync(b, 200);

        Assert.Equal(HttpStatusCode.OK, (await AcceptAsync(b, await InviteAsync(a))).StatusCode);
        Assert.Empty(await CostsAsync(a));
    }

    [Fact]
    public async Task 같이_쓰던_가계부의_내역은_합칠_수_없다()
    {
        var (a, _) = await _factory.LoginAsync("a");
        var (b, _) = await _factory.LoginAsync("b");
        var (c, _) = await _factory.LoginAsync("c");
        Assert.Equal(HttpStatusCode.OK, (await AcceptAsync(b, await InviteAsync(a))).StatusCode);

        // b는 a와 같이 쓰는 중 → c의 초대를 받으면서 내역을 가져갈 수 없음
        Assert.Equal(HttpStatusCode.BadRequest, (await AcceptAsync(b, await InviteAsync(c), merge: true)).StatusCode);
    }

    [Fact]
    public async Task 이미_멤버면_409()
    {
        var (a, _) = await _factory.LoginAsync("a");
        Assert.Equal(HttpStatusCode.Conflict, (await AcceptAsync(a, await InviteAsync(a))).StatusCode);
    }

    [Fact]
    public async Task 초대와_내보내기는_방장만()
    {
        var (a, loginA) = await _factory.LoginAsync("a");
        var (b, _) = await _factory.LoginAsync("b");
        await AcceptAsync(b, await InviteAsync(a));

        Assert.Equal(HttpStatusCode.Forbidden, (await b.PostAsync("/api/invites", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await b.DeleteAsync($"/api/household/members/{loginA.Me.User.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await b.PatchAsJsonAsync("/api/household", new UpdateHouseholdRequest { Name = "뺏기" })).StatusCode);
    }

    [Fact]
    public async Task 최대_10명()
    {
        var (owner, _) = await _factory.LoginAsync("owner");
        for (var i = 1; i < 10; i++)
        {
            var (member, _) = await _factory.LoginAsync($"m{i}");
            Assert.Equal(HttpStatusCode.OK, (await AcceptAsync(member, await InviteAsync(owner))).StatusCode);
        }

        Assert.Equal(HttpStatusCode.Conflict, (await owner.PostAsync("/api/invites", null)).StatusCode);
    }

    [Fact]
    public async Task 코드_시도는_10분에_10번까지()
    {
        var (b, _) = await _factory.LoginAsync("b");
        for (var i = 0; i < 10; i++)
            Assert.Equal(HttpStatusCode.NotFound, (await b.GetAsync($"/api/invites/WRONG{i:000}")).StatusCode);

        Assert.Equal(HttpStatusCode.TooManyRequests, (await b.GetAsync("/api/invites/WRONG999")).StatusCode);
    }

    // ── 나가기·내보내기 ──

    [Fact]
    public async Task 나가면_새_개인_가계부를_받고_쓴_내역은_남는다()
    {
        var (a, _) = await _factory.LoginAsync("a");
        var (b, _) = await _factory.LoginAsync("b", "영희");
        await AcceptAsync(b, await InviteAsync(a));
        await CreateTxAsync(b, 200);

        var res = await b.DeleteAsync("/api/household/members/me");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var meB = (await res.Content.ReadFromJsonAsync<MeDto>())!;
        Assert.Equal("영희의 가계부", meB.Household.Name);

        Assert.Empty(await CostsAsync(b));
        Assert.Equal(new List<int> { 200 }, await CostsAsync(a));
    }

    [Fact]
    public async Task 방장이_나가면_다음_멤버가_방장()
    {
        var (a, _) = await _factory.LoginAsync("a");
        var (b, _) = await _factory.LoginAsync("b");
        await AcceptAsync(b, await InviteAsync(a));

        Assert.Equal(HttpStatusCode.OK, (await a.DeleteAsync("/api/household/members/me")).StatusCode);

        var household = await b.GetFromJsonAsync<HouseholdDto>("/api/household");
        Assert.Equal(eHouseholdRole.Owner, household!.MyRole);
        Assert.Single(household.Members);
    }

    [Fact]
    public async Task 혼자면_나갈_수_없다()
    {
        var (a, _) = await _factory.LoginAsync("a");
        Assert.Equal(HttpStatusCode.BadRequest, (await a.DeleteAsync("/api/household/members/me")).StatusCode);
    }

    [Fact]
    public async Task 내보내면_그_토큰으로도_바로_못_본다()
    {
        var (a, _) = await _factory.LoginAsync("a");
        await CreateTxAsync(a, 100);
        var (b, loginB) = await _factory.LoginAsync("b");
        await AcceptAsync(b, await InviteAsync(a));
        Assert.Equal(new List<int> { 100 }, await CostsAsync(b));

        Assert.Equal(HttpStatusCode.NoContent, (await a.DeleteAsync($"/api/household/members/{loginB.Me.User.Id}")).StatusCode);

        // 같은 토큰인데 소속이 바뀌어 예전 가계부 내역이 안 보임
        Assert.Empty(await CostsAsync(b));
        var household = await a.GetFromJsonAsync<HouseholdDto>("/api/household");
        Assert.Single(household!.Members);
    }

    [Fact]
    public async Task 자기_자신과_남의_가계부_사람은_내보낼_수_없다()
    {
        var (a, loginA) = await _factory.LoginAsync("a");
        var (_, loginC) = await _factory.LoginAsync("c");

        Assert.Equal(HttpStatusCode.BadRequest, (await a.DeleteAsync($"/api/household/members/{loginA.Me.User.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await a.DeleteAsync($"/api/household/members/{loginC.Me.User.Id}")).StatusCode);
    }

    // ── 운영 설정 ──

    [Fact]
    public async Task 개발용_로그인을_끄면_404()
    {
        await using var app = _factory.WithWebHostBuilder(b => b.UseSetting("Auth:DevLoginEnabled", "false"));
        var res = await app.CreateClient().PostAsJsonAsync("/api/auth/dev-login", new DevLoginRequest { Key = "a" });
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task 운영_환경에서는_개발용_로그인과_익명_접근이_막힌다()
    {
        await using var app = _factory.WithWebHostBuilder(b => b.UseEnvironment("Production"));
        var client = app.CreateClient();

        Assert.Equal(HttpStatusCode.NotFound,
            (await client.PostAsJsonAsync("/api/auth/dev-login", new DevLoginRequest { Key = "a" })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/transactions")).StatusCode);
    }

    [Fact]
    public async Task 운영_테스트_로그인은_코드가_맞을_때만_열리고_시도_횟수가_제한된다()
    {
        const string code = "test-code-1234567890";
        await using var app = _factory.WithWebHostBuilder(b => b.UseEnvironment("Production").UseSetting("Auth:TestLoginCode", code));
        var client = app.CreateClient();
        Task<HttpResponseMessage> Login(string? testCode) =>
            client.PostAsJsonAsync("/api/auth/dev-login", new DevLoginRequest { Key = "tester", TestCode = testCode });

        Assert.Equal(HttpStatusCode.NotFound, (await Login(null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Login("wrong-code-000000000")).StatusCode);
        var ok = await Login(code);
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        var login = (await ok.Content.ReadFromJsonAsync<LoginResponse>())!;
        Assert.False(string.IsNullOrEmpty(login.Token));

        // 10번(위 3번 포함)을 넘으면 맞는 코드라도 429
        for (var i = 0; i < 7; i++) await Login("wrong-code-000000000");
        Assert.Equal(HttpStatusCode.TooManyRequests, (await Login(code)).StatusCode);
    }

    [Fact]
    public async Task 짧은_테스트_코드는_무시된다()
    {
        await using var app = _factory.WithWebHostBuilder(b => b.UseEnvironment("Production").UseSetting("Auth:TestLoginCode", "short"));
        var res = await app.CreateClient().PostAsJsonAsync("/api/auth/dev-login", new DevLoginRequest { Key = "tester", TestCode = "short" });
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }
}
