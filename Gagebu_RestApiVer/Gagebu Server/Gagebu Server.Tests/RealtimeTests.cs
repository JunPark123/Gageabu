using System.Net.Http.Json;
using System.Threading.Channels;
using Gagebu_Server.DTO;
using Gagebu_Server.Realtime;
using GagebuShared;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR.Client;

namespace Gagebu_Server.Tests;

[Collection(ApiCollection.Name)]
public class RealtimeTests : IAsyncLifetime
{
    private static readonly TimeSpan Wait = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan Silence = TimeSpan.FromMilliseconds(700);

    private readonly ApiFactory _factory;
    private readonly List<HubConnection> _connections = new();

    public RealtimeTests(ApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.ResetAsync();

    public async Task DisposeAsync()
    {
        foreach (var c in _connections) await c.DisposeAsync();
    }

    // 허브에 연결하고 받은 "changed" 신호를 채널에 쌓는다. token이 null이면 로그인 없이
    private async Task<ChannelReader<ChangedMessage>> ConnectAsync(string? token)
    {
        var channel = Channel.CreateUnbounded<ChangedMessage>();
        var connection = new HubConnectionBuilder()
            .WithUrl(new Uri(_factory.Server.BaseAddress, HouseholdHub.Path.TrimStart('/')), o =>
            {
                o.HttpMessageHandlerFactory = _ => _factory.Server.CreateHandler();
                o.Transports = HttpTransportType.LongPolling; // TestServer에서는 롱폴링 (실제 앱은 웹소켓)
                if (token != null) o.AccessTokenProvider = () => Task.FromResult<string?>(token);
            })
            .Build();
        connection.On<ChangedMessage>(HouseholdHub.ChangedEvent, m => channel.Writer.TryWrite(m));
        await connection.StartAsync();
        _connections.Add(connection);
        return channel.Reader;
    }

    private static async Task<ChangedMessage> NextAsync(ChannelReader<ChangedMessage> reader)
    {
        using var cts = new CancellationTokenSource(Wait);
        return await reader.ReadAsync(cts.Token);
    }

    private static async Task ExpectAsync(ChannelReader<ChangedMessage> reader, string kind)
    {
        // 같은 동작에서 다른 종류 신호가 먼저 올 수 있으니 원하는 종류가 올 때까지 읽는다
        while (true)
        {
            if ((await NextAsync(reader)).Kind == kind) return;
        }
    }

    private static async Task ExpectNothingAsync(ChannelReader<ChangedMessage> reader)
    {
        await Task.Delay(Silence);
        Assert.False(reader.TryRead(out var m), $"받으면 안 되는 신호: {m?.Kind}");
    }

    private static TransactionDto Tx(int cost) => new()
    {
        Type = "테스트", Cost = cost, Date = DateTimeOffset.Parse("2026-09-27T12:00:00+09:00"), Paytype = ePayType.Expense,
    };

    private static async Task<string> InviteAsync(HttpClient owner) =>
        (await (await owner.PostAsync("/api/invites", null)).Content.ReadFromJsonAsync<InviteDto>())!.Code;

    [Fact]
    public async Task 같은_가계부_멤버가_기록하면_신호가_오고_다른_가계부에는_안_온다()
    {
        var (a, loginA) = await _factory.LoginAsync("a");
        var (b, loginB) = await _factory.LoginAsync("b");
        var (_, loginC) = await _factory.LoginAsync("c");
        await b.PostAsJsonAsync($"/api/invites/{await InviteAsync(a)}/accept", new AcceptInviteRequest());

        var toA = await ConnectAsync(loginA.Token);
        var toC = await ConnectAsync(loginC.Token);

        await b.PostAsJsonAsync("/api/transactions", Tx(100));

        await ExpectAsync(toA, HouseholdNotifier.Transactions);
        await ExpectNothingAsync(toC);
    }

    [Fact]
    public async Task 수정_삭제와_예산_변경도_신호가_온다()
    {
        var (a, loginA) = await _factory.LoginAsync("a");
        var created = (await (await a.PostAsJsonAsync("/api/transactions", Tx(100))).Content.ReadFromJsonAsync<TransactionDto>())!;
        var toA = await ConnectAsync(loginA.Token);

        var update = Tx(200);
        update.Id = created.Id;
        await a.PutAsJsonAsync("/api/transactions", update);
        await ExpectAsync(toA, HouseholdNotifier.Transactions);

        await a.DeleteAsync($"/api/transactions/{created.Id}");
        await ExpectAsync(toA, HouseholdNotifier.Transactions);

        await a.PutAsJsonAsync("/api/budget/default", new SetDefaultBudgetRequest { Amount = 500_000 });
        await ExpectAsync(toA, HouseholdNotifier.Budget);
    }

    [Fact]
    public async Task 멤버가_들어오면_기존_멤버에게_신호()
    {
        var (a, loginA) = await _factory.LoginAsync("a");
        var (b, _) = await _factory.LoginAsync("b");
        var toA = await ConnectAsync(loginA.Token);

        await b.PostAsJsonAsync($"/api/invites/{await InviteAsync(a)}/accept", new AcceptInviteRequest());

        await ExpectAsync(toA, HouseholdNotifier.Household);
    }

    [Fact]
    public async Task 로그인_없는_개발_모드는_기본_가계부_신호를_받는다()
    {
        var toAnonymous = await ConnectAsync(null);

        await _factory.CreateClient().PostAsJsonAsync("/api/transactions", Tx(100));

        await ExpectAsync(toAnonymous, HouseholdNotifier.Transactions);
    }

    [Fact]
    public async Task 틀린_토큰으로는_연결되지_않는다()
    {
        await Assert.ThrowsAnyAsync<Exception>(() => ConnectAsync("not-a-token"));
    }
}
