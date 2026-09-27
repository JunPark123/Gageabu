using System.Net;
using System.Net.Http.Json;
using Gagebu_Server.DTO;
using GagebuShared;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;

namespace Gagebu_Server.Tests;

[Collection(ApiCollection.Name)]
public class ReceiptsApiTests : IAsyncLifetime
{
    private const string Url = "/api/receipts";
    private readonly ApiFactory _factory;
    private readonly HttpClient _worker;

    public ReceiptsApiTests(ApiFactory factory)
    {
        _factory = factory;
        _worker = factory.CreateWorkerClient();
    }

    public Task InitializeAsync() => _factory.ResetAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    private static CreateReceiptRequest Req(string requestId = "req-1") => new()
    {
        ClientRequestId = requestId,
        CapturedAt = DateTimeOffset.Parse("2026-09-27T12:00:00+09:00"),
        Lines =
        {
            new OcrLineDto { Text = "스타벅스 강남점", Top = 10, Left = 5 },
            new OcrLineDto { Text = "아메리카노 4,500", Top = 40, Left = 5 },
            new OcrLineDto { Text = "합계 4,500", Top = 80, Left = 5 },
        },
    };

    private static async Task<ReceiptDto> CreateAsync(HttpClient c, string requestId = "req-1")
    {
        var res = await c.PostAsJsonAsync(Url, Req(requestId));
        Assert.Equal(HttpStatusCode.Accepted, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<ReceiptDto>())!;
    }

    private async Task<ReceiptWorkDto> ClaimAsync()
    {
        var res = await _worker.PostAsync("/internal/receipts/claim", null);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<ReceiptWorkDto>())!;
    }

    private Task<HttpResponseMessage> CompleteAsync(int id, int total = 4500) =>
        _worker.PostAsJsonAsync($"/internal/receipts/{id}/result", new ReceiptResultRequest
        {
            EngineVersion = "rules-0.1",
            Suggestion = new ReceiptSuggestionDto
            {
                Merchant = "스타벅스 강남점",
                Date = DateTimeOffset.Parse("2026-09-27T11:58:00+09:00"),
                Total = total,
                Category = "카페",
                Confidence = new ReceiptConfidenceDto { Merchant = 0.9, Date = 0.8, Total = 0.95, Category = 0.7 },
            },
        });

    private static TransactionDto Tx(int cost, string type = "아메리카노") => new()
    {
        Type = type, Cost = cost, Date = DateTimeOffset.Parse("2026-09-27T11:58:00+09:00"), Paytype = ePayType.Expense, Category = "카페",
    };

    private static Task<HttpResponseMessage> ConfirmAsync(HttpClient c, int id, params TransactionDto[] txs) =>
        c.PostAsJsonAsync($"{Url}/{id}/confirm", new ConfirmReceiptRequest { Transactions = txs.ToList() });

    [Fact]
    public async Task 요청하면_분석_대기_상태이고_같은_요청을_다시_보내면_같은_작업()
    {
        var (a, _) = await _factory.LoginAsync("a");
        var created = await CreateAsync(a);
        Assert.Equal(eReceiptStatus.Pending, created.Status);

        var again = await a.PostAsJsonAsync(Url, Req());
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        Assert.Equal(created.Id, (await again.Content.ReadFromJsonAsync<ReceiptDto>())!.Id);
    }

    [Fact]
    public async Task 빈_OCR은_400()
    {
        var (a, _) = await _factory.LoginAsync("a");
        var req = Req();
        req.Lines = new() { new OcrLineDto { Text = "  " } };
        Assert.Equal(HttpStatusCode.BadRequest, (await a.PostAsJsonAsync(Url, req)).StatusCode);
    }

    [Fact]
    public async Task 워커_추천_후_사용자가_확정하면_거래가_한번에_저장된다()
    {
        var (a, login) = await _factory.LoginAsync("a");
        var receipt = await CreateAsync(a);

        var work = await ClaimAsync();
        Assert.Equal(receipt.Id, work.Id);
        Assert.Equal(3, work.Lines.Count);
        Assert.Equal("합계 4,500", work.Lines[2].Text);
        Assert.Equal(80, work.Lines[2].Top);
        Assert.Equal(1, work.Attempt);
        Assert.Equal(eReceiptStatus.Processing, (await a.GetFromJsonAsync<ReceiptDto>($"{Url}/{receipt.Id}"))!.Status);

        Assert.Equal(HttpStatusCode.NoContent, (await CompleteAsync(work.Id)).StatusCode);
        var ready = (await a.GetFromJsonAsync<ReceiptDto>($"{Url}/{receipt.Id}"))!;
        Assert.Equal(eReceiptStatus.Ready, ready.Status);
        Assert.Equal(4500, ready.Suggestion!.Total);
        Assert.Equal("카페", ready.Suggestion.Category);
        Assert.Equal(0.95, ready.Suggestion.Confidence.Total);

        // 추천만으로는 거래가 생기지 않는다
        Assert.Empty((await a.GetFromJsonAsync<List<TransactionDto>>("/api/transactions"))!);

        // 사용자가 두 건으로 나눠 확정
        var res = await ConfirmAsync(a, receipt.Id, Tx(3000), Tx(1500, "쿠키"));
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var confirmed = (await res.Content.ReadFromJsonAsync<ReceiptDto>())!;
        Assert.Equal(eReceiptStatus.Confirmed, confirmed.Status);
        Assert.Equal(2, confirmed.TransactionIds.Count);

        var txs = (await a.GetFromJsonAsync<List<TransactionDto>>("/api/transactions"))!;
        Assert.Equal(new[] { 1500, 3000 }, txs.Select(t => t.Cost).OrderBy(c => c));
        Assert.All(txs, t => Assert.Equal(login.Me.User.Id, t.CreatedByUserId));

        // 추천과 최종값이 둘 다 남는다
        var job = await _factory.WithDbAsync(db => db.ReceiptJobs.IgnoreQueryFilters().SingleAsync(r => r.Id == receipt.Id));
        Assert.Equal("rules-0.1", job.EngineVersion);
        Assert.Contains("4500", job.SuggestionJson);
        Assert.Contains("쿠키", job.ConfirmedJson);
        Assert.Equal(confirmed.TransactionIds, job.TransactionIds);
    }

    [Fact]
    public async Task 확정을_다시_보내도_거래가_두번_생기지_않는다()
    {
        var (a, _) = await _factory.LoginAsync("a");
        var receipt = await CreateAsync(a);

        var first = (await (await ConfirmAsync(a, receipt.Id, Tx(4500))).Content.ReadFromJsonAsync<ReceiptDto>())!;
        var second = await ConfirmAsync(a, receipt.Id, Tx(4500));
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Equal(first.TransactionIds, (await second.Content.ReadFromJsonAsync<ReceiptDto>())!.TransactionIds);
        Assert.Single((await a.GetFromJsonAsync<List<TransactionDto>>("/api/transactions"))!);
    }

    [Fact]
    public async Task 잘못된_거래로_확정하면_400이고_아무것도_저장되지_않는다()
    {
        var (a, _) = await _factory.LoginAsync("a");
        var receipt = await CreateAsync(a);

        Assert.Equal(HttpStatusCode.BadRequest, (await ConfirmAsync(a, receipt.Id, Tx(4500), Tx(0))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await ConfirmAsync(a, receipt.Id)).StatusCode);
        Assert.Empty((await a.GetFromJsonAsync<List<TransactionDto>>("/api/transactions"))!);
        Assert.Equal(eReceiptStatus.Pending, (await a.GetFromJsonAsync<ReceiptDto>($"{Url}/{receipt.Id}"))!.Status);
    }

    [Fact]
    public async Task 분석_실패해도_직접_입력해서_확정할_수_있다()
    {
        var (a, _) = await _factory.LoginAsync("a");
        var receipt = await CreateAsync(a);
        var work = await ClaimAsync();

        var fail = await _worker.PostAsJsonAsync($"/internal/receipts/{work.Id}/fail", new ReceiptFailRequest { EngineVersion = "rules-0.1", Reason = "합계를 못 찾음" });
        Assert.Equal(HttpStatusCode.NoContent, fail.StatusCode);
        var failed = (await a.GetFromJsonAsync<ReceiptDto>($"{Url}/{receipt.Id}"))!;
        Assert.Equal(eReceiptStatus.Failed, failed.Status);
        Assert.Equal("합계를 못 찾음", failed.FailureReason);

        Assert.Equal(HttpStatusCode.OK, (await ConfirmAsync(a, receipt.Id, Tx(4500))).StatusCode);
    }

    [Fact]
    public async Task 사용자가_먼저_확정하거나_버리면_늦게_온_워커_결과는_409()
    {
        var (a, _) = await _factory.LoginAsync("a");
        var r1 = await CreateAsync(a, "r1");
        var r2 = await CreateAsync(a, "r2");
        var w1 = await ClaimAsync();
        var w2 = await ClaimAsync();

        await ConfirmAsync(a, r1.Id, Tx(4500));
        Assert.Equal(HttpStatusCode.NoContent, (await a.DeleteAsync($"{Url}/{r2.Id}")).StatusCode);

        Assert.Equal(HttpStatusCode.Conflict, (await CompleteAsync(w1.Id)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await CompleteAsync(w2.Id)).StatusCode);
        Assert.Equal(eReceiptStatus.Discarded, (await a.GetFromJsonAsync<ReceiptDto>($"{Url}/{r2.Id}"))!.Status);
    }

    [Fact]
    public async Task 확정한_영수증은_버릴_수_없고_버린_영수증은_확정할_수_없다()
    {
        var (a, _) = await _factory.LoginAsync("a");
        var r1 = await CreateAsync(a, "r1");
        var r2 = await CreateAsync(a, "r2");
        await ConfirmAsync(a, r1.Id, Tx(4500));
        await a.DeleteAsync($"{Url}/{r2.Id}");

        Assert.Equal(HttpStatusCode.Conflict, (await a.DeleteAsync($"{Url}/{r1.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await ConfirmAsync(a, r2.Id, Tx(4500))).StatusCode);
    }

    [Fact]
    public async Task 열린_영수증_목록은_확정_버림_제외()
    {
        var (a, _) = await _factory.LoginAsync("a");
        var r1 = await CreateAsync(a, "r1");
        var r2 = await CreateAsync(a, "r2");
        var r3 = await CreateAsync(a, "r3");
        await ConfirmAsync(a, r1.Id, Tx(4500));
        await a.DeleteAsync($"{Url}/{r2.Id}");

        var open = (await a.GetFromJsonAsync<List<ReceiptDto>>(Url))!;
        Assert.Equal(new[] { r3.Id }, open.Select(r => r.Id));
    }

    [Fact]
    public async Task 다른_가계부_영수증은_못_보고_못_건드린다()
    {
        var (a, _) = await _factory.LoginAsync("a");
        var (b, _) = await _factory.LoginAsync("b");
        var receipt = await CreateAsync(a);

        Assert.Equal(HttpStatusCode.NotFound, (await b.GetAsync($"{Url}/{receipt.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await ConfirmAsync(b, receipt.Id, Tx(4500))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.DeleteAsync($"{Url}/{receipt.Id}")).StatusCode);
        Assert.Empty((await b.GetFromJsonAsync<List<ReceiptDto>>(Url))!);

        // 같은 clientRequestId라도 가계부가 다르면 별개 작업
        var mine = await CreateAsync(b);
        Assert.NotEqual(receipt.Id, mine.Id);
    }

    [Fact]
    public async Task 대기열이_비면_204()
    {
        Assert.Equal(HttpStatusCode.NoContent, (await _worker.PostAsync("/internal/receipts/claim", null)).StatusCode);
    }

    [Fact]
    public async Task 워커가_시간_안에_결과를_안_주면_다시_대기열로_3번_넘으면_실패()
    {
        var (a, _) = await _factory.LoginAsync("a");
        var receipt = await CreateAsync(a);

        async Task ExpireLeaseAsync() => await _factory.WithDbAsync(db => db.ReceiptJobs.IgnoreQueryFilters()
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.ClaimedAt, DateTime.UtcNow.AddMinutes(-3))));

        for (var attempt = 1; attempt <= 3; attempt++)
        {
            var work = await ClaimAsync();
            Assert.Equal(receipt.Id, work.Id);
            Assert.Equal(attempt, work.Attempt);
            // 아직 시간 안이면 다른 워커가 못 가져감
            Assert.Equal(HttpStatusCode.NoContent, (await _worker.PostAsync("/internal/receipts/claim", null)).StatusCode);
            await ExpireLeaseAsync();
        }

        Assert.Equal(HttpStatusCode.NoContent, (await _worker.PostAsync("/internal/receipts/claim", null)).StatusCode);
        var failed = (await a.GetFromJsonAsync<ReceiptDto>($"{Url}/{receipt.Id}"))!;
        Assert.Equal(eReceiptStatus.Failed, failed.Status);
        Assert.Equal("분석 시간 초과", failed.FailureReason);
    }

    [Fact]
    public async Task 워커_API는_키가_있어야_하고_설정이_없으면_404()
    {
        var noKey = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await noKey.PostAsync("/internal/receipts/claim", null)).StatusCode);

        var wrong = _factory.CreateClient();
        wrong.DefaultRequestHeaders.Add("X-Worker-Key", "wrong-key-0123456789");
        Assert.Equal(HttpStatusCode.Unauthorized, (await wrong.PostAsync("/internal/receipts/claim", null)).StatusCode);

        // 앱 사용자 토큰으로도 안 됨
        var (a, _) = await _factory.LoginAsync("a");
        Assert.Equal(HttpStatusCode.Unauthorized, (await a.PostAsync("/internal/receipts/claim", null)).StatusCode);

        await using var off = _factory.WithWebHostBuilder(b => b.UseSetting("Worker:Key", ""));
        var client = off.CreateClient();
        client.DefaultRequestHeaders.Add("X-Worker-Key", ApiFactory.WorkerKey);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsync("/internal/receipts/claim", null)).StatusCode);
    }
}
