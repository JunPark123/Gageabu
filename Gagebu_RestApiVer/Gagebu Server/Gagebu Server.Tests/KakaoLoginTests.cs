using System.Net;
using System.Net.Http.Json;
using System.Text;
using Gagebu_Server.Auth;
using Gagebu_Server.DTO;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace Gagebu_Server.Tests;

[Collection(ApiCollection.Name)]
public class KakaoLoginTests : IAsyncLifetime
{
    private const long OurAppId = 1234;
    private readonly ApiFactory _factory;
    private readonly FakeKakao _kakao = new();

    public KakaoLoginTests(ApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.ResetAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    // 카카오 앱 ID를 설정하고 카카오 API를 가짜로 바꾼 서버
    private WebApplicationFactory<Program> App(string? appId = "1234") => _factory.WithWebHostBuilder(b =>
    {
        b.UseSetting("Kakao:AppId", appId ?? "");
        b.ConfigureTestServices(s => s.AddSingleton<IKakaoApi>(_kakao));
    });

    private static Task<HttpResponseMessage> LoginAsync(WebApplicationFactory<Program> app, string token) =>
        app.CreateClient().PostAsJsonAsync("/api/auth/kakao", new KakaoLoginRequest { AccessToken = token });

    [Fact]
    public async Task 처음이면_카카오_닉네임으로_사용자를_만들고_토큰을_준다()
    {
        _kakao.Add("tok-a", kakaoId: 111, appId: OurAppId, nickname: "철수");
        await using var app = App();

        var res = await LoginAsync(app, "tok-a");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var login = (await res.Content.ReadFromJsonAsync<LoginResponse>())!;
        Assert.Equal("철수", login.Me.User.Nickname);
        Assert.False(string.IsNullOrEmpty(login.Token));

        // 받은 토큰으로 API 사용
        var client = app.CreateClient();
        client.DefaultRequestHeaders.Authorization = new("Bearer", login.Token);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/me")).StatusCode);
    }

    [Fact]
    public async Task 같은_카카오_계정은_같은_사용자()
    {
        _kakao.Add("tok-1", kakaoId: 111, appId: OurAppId, nickname: "철수");
        _kakao.Add("tok-2", kakaoId: 111, appId: OurAppId, nickname: "바뀐닉");
        await using var app = App();

        var first = (await (await LoginAsync(app, "tok-1")).Content.ReadFromJsonAsync<LoginResponse>())!;
        var second = (await (await LoginAsync(app, "tok-2")).Content.ReadFromJsonAsync<LoginResponse>())!;
        Assert.Equal(first.Me.User.Id, second.Me.User.Id);
        Assert.Equal("철수", second.Me.User.Nickname);
    }

    [Fact]
    public async Task 닉네임_동의가_없으면_기본_이름()
    {
        _kakao.Add("tok-a", kakaoId: 111, appId: OurAppId, nickname: null);
        await using var app = App();

        var login = (await (await LoginAsync(app, "tok-a")).Content.ReadFromJsonAsync<LoginResponse>())!;
        Assert.Equal("새 사용자", login.Me.User.Nickname);
    }

    [Fact]
    public async Task 다른_앱에서_발급된_토큰은_401()
    {
        _kakao.Add("tok-other", kakaoId: 111, appId: 9999, nickname: "철수");
        await using var app = App();
        Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(app, "tok-other")).StatusCode);
    }

    [Fact]
    public async Task 유효하지_않은_토큰은_401()
    {
        await using var app = App();
        Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(app, "nope")).StatusCode);
    }

    [Fact]
    public async Task 빈_토큰은_400()
    {
        await using var app = App();
        Assert.Equal(HttpStatusCode.BadRequest, (await LoginAsync(app, " ")).StatusCode);
    }

    [Fact]
    public async Task 앱_ID가_설정되지_않으면_503()
    {
        _kakao.Add("tok-a", kakaoId: 111, appId: OurAppId, nickname: "철수");
        await using var app = App(appId: null);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await LoginAsync(app, "tok-a")).StatusCode);
    }

    [Fact]
    public async Task 운영_환경에서도_동작한다()
    {
        _kakao.Add("tok-a", kakaoId: 111, appId: OurAppId, nickname: "철수");
        await using var app = App().WithWebHostBuilder(b => b.UseEnvironment("Production"));
        Assert.Equal(HttpStatusCode.OK, (await LoginAsync(app, "tok-a")).StatusCode);
    }

    // ── 웹 카카오 로그인 (code → 토큰) ──

    private const string WebRedirect = "https://app.example.com/auth/kakao";

    private WebApplicationFactory<Program> WebApp(FakeKakaoAuth auth, string? restKey = "rest-key") => _factory.WithWebHostBuilder(b =>
    {
        b.UseSetting("Kakao:AppId", "1234");
        b.UseSetting("Kakao:RestApiKey", restKey ?? "");
        b.UseSetting("Kakao:WebRedirectUris", $"{WebRedirect}, http://localhost:8081/auth/kakao");
        b.ConfigureTestServices(s =>
        {
            s.AddSingleton<IKakaoApi>(_kakao);
            s.AddSingleton<IKakaoAuth>(auth);
        });
    });

    private static Task<HttpResponseMessage> WebLoginAsync(WebApplicationFactory<Program> app, string code, string redirect = WebRedirect) =>
        app.CreateClient().PostAsJsonAsync("/api/auth/kakao/web", new KakaoWebLoginRequest { Code = code, RedirectUri = redirect });

    [Fact]
    public async Task 웹_code를_토큰으로_바꿔_로그인하고_앱과_같은_사용자가_된다()
    {
        _kakao.Add("tok-web", kakaoId: 777, appId: OurAppId, nickname: "영희");
        var auth = new FakeKakaoAuth { ["code-1"] = "tok-web" };
        await using var app = WebApp(auth);

        var res = await WebLoginAsync(app, "code-1");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var web = (await res.Content.ReadFromJsonAsync<LoginResponse>())!;
        Assert.Equal("영희", web.Me.User.Nickname);
        Assert.Equal(("code-1", WebRedirect, "rest-key"), auth.Last);

        // 같은 카카오 계정으로 앱에서 로그인해도 같은 사용자
        var native = (await (await LoginAsync(app, "tok-web")).Content.ReadFromJsonAsync<LoginResponse>())!;
        Assert.Equal(web.Me.User.Id, native.Me.User.Id);
    }

    [Fact]
    public async Task 웹_허용되지_않은_주소_잘못된_code_설정_없음()
    {
        var auth = new FakeKakaoAuth();
        await using var app = WebApp(auth);
        Assert.Equal(HttpStatusCode.BadRequest, (await WebLoginAsync(app, "code-x", "https://evil.example/auth/kakao")).StatusCode);
        Assert.Null(auth.Last);   // 카카오에 요청조차 안 함
        Assert.Equal(HttpStatusCode.Unauthorized, (await WebLoginAsync(app, "bad-code")).StatusCode);

        await using var off = WebApp(auth, restKey: null);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await WebLoginAsync(off, "code-1")).StatusCode);
    }

    private class FakeKakaoAuth : Dictionary<string, string>, IKakaoAuth
    {
        public (string Code, string Redirect, string Key)? Last { get; private set; }

        public Task<string?> ExchangeCodeAsync(string code, string redirectUri, string restApiKey, string? clientSecret, CancellationToken ct = default)
        {
            Last = (code, redirectUri, restApiKey);
            return Task.FromResult(TryGetValue(code, out var token) ? token : null);
        }
    }

    private class FakeKakao : IKakaoApi
    {
        private readonly Dictionary<string, (KakaoTokenInfo Info, KakaoProfile Profile)> _tokens = new();

        public void Add(string token, long kakaoId, long appId, string? nickname) =>
            _tokens[token] = (new KakaoTokenInfo(kakaoId, appId), new KakaoProfile(kakaoId, nickname));

        public Task<KakaoTokenInfo?> GetTokenInfoAsync(string accessToken, CancellationToken ct = default) =>
            Task.FromResult(_tokens.TryGetValue(accessToken, out var t) ? t.Info : null);

        public Task<KakaoProfile?> GetProfileAsync(string accessToken, CancellationToken ct = default) =>
            Task.FromResult(_tokens.TryGetValue(accessToken, out var t) ? t.Profile : null);
    }
}

// 카카오 응답(JSON)을 제대로 읽는지 — 실제 카카오 API 문서의 응답 모양
public class KakaoApiParsingTests
{
    private static KakaoApi Api(HttpStatusCode status, string json, List<HttpRequestMessage>? seen = null) =>
        new(new HttpClient(new StubHandler(status, json, seen)) { BaseAddress = new Uri(KakaoApi.BaseAddress) });

    [Fact]
    public async Task 웹_code_교환_요청과_응답()
    {
        var seen = new List<HttpRequestMessage>();
        var bodies = new List<string>();
        var http = new HttpClient(new StubHandler(HttpStatusCode.OK, """{"access_token":"AT","token_type":"bearer","refresh_token":"RT","expires_in":21599}""", seen, bodies)) { BaseAddress = new Uri(KakaoAuth.BaseAddress) };
        var token = await new KakaoAuth(http).ExchangeCodeAsync("the-code", "https://app.example.com/auth/kakao", "rest", "secret");

        Assert.Equal("AT", token);
        Assert.Equal("https://kauth.kakao.com/oauth/token", seen[0].RequestUri!.ToString());
        Assert.Contains("grant_type=authorization_code", bodies[0]);
        Assert.Contains("client_id=rest", bodies[0]);
        Assert.Contains("code=the-code", bodies[0]);
        Assert.Contains("client_secret=secret", bodies[0]);

        var bad = new HttpClient(new StubHandler(HttpStatusCode.BadRequest, """{"error":"invalid_grant","error_code":"KOE320"}""")) { BaseAddress = new Uri(KakaoAuth.BaseAddress) };
        Assert.Null(await new KakaoAuth(bad).ExchangeCodeAsync("used", "https://app.example.com/auth/kakao", "rest", null));
    }

    [Fact]
    public async Task 토큰_정보()
    {
        var seen = new List<HttpRequestMessage>();
        var info = await Api(HttpStatusCode.OK, """{"id":123456789,"expires_in":7199,"app_id":1234}""", seen).GetTokenInfoAsync("tok");

        Assert.Equal(new KakaoTokenInfo(123456789, 1234), info);
        Assert.Equal("https://kapi.kakao.com/v1/user/access_token_info", seen[0].RequestUri!.ToString());
        Assert.Equal("Bearer tok", seen[0].Headers.Authorization!.ToString());
    }

    [Fact]
    public async Task 사용자_정보_닉네임()
    {
        var profile = await Api(HttpStatusCode.OK, """
            {"id":123456789,"connected_at":"2026-09-27T00:00:00Z",
             "kakao_account":{"profile_nickname_needs_agreement":false,"profile":{"nickname":" 홍길동 ","is_default_image":true}}}
            """).GetProfileAsync("tok");
        Assert.Equal(new KakaoProfile(123456789, "홍길동"), profile);
    }

    [Fact]
    public async Task 닉네임이_없으면_null()
    {
        var profile = await Api(HttpStatusCode.OK, """{"id":1,"kakao_account":{"profile_nickname_needs_agreement":true}}""").GetProfileAsync("tok");
        Assert.Null(profile!.Nickname);
    }

    [Fact]
    public async Task 만료된_토큰은_null()
    {
        var info = await Api(HttpStatusCode.Unauthorized, """{"msg":"this access token does not exist","code":-401}""").GetTokenInfoAsync("tok");
        Assert.Null(info);
    }

    private class StubHandler(HttpStatusCode status, string json, List<HttpRequestMessage>? seen = null, List<string>? bodies = null) : HttpMessageHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            seen?.Add(request);
            if (bodies != null) bodies.Add(request.Content == null ? "" : await request.Content.ReadAsStringAsync(ct));
            return new HttpResponseMessage(status) { Content = new StringContent(json, Encoding.UTF8, "application/json") };
        }
    }
}
