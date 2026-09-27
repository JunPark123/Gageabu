using System.Net;
using System.Net.Http.Json;
using Gagebu_Server.DTO;
using GagebuShared;
using Microsoft.EntityFrameworkCore;

namespace Gagebu_Server.Tests;

[Collection(ApiCollection.Name)]
public class TransactionsApiTests : IAsyncLifetime
{
    private const string Url = "/api/transactions";
    private readonly ApiFactory _factory;
    private readonly HttpClient _client;

    public TransactionsApiTests(ApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public Task InitializeAsync() => _factory.ResetAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    private static TransactionDto Tx(string date, int cost = 1000, ePayType payType = ePayType.Expense, string type = "점심") => new()
    {
        Type = type,
        Cost = cost,
        Date = DateTimeOffset.Parse(date),
        Paytype = payType,
        Category = "식비",
        Content = "메모",
    };

    private async Task<TransactionDto> CreateAsync(TransactionDto dto)
    {
        var res = await _client.PostAsJsonAsync(Url, dto);
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<TransactionDto>())!;
    }

    [Fact]
    public async Task 생성_조회_수정_삭제()
    {
        var created = await CreateAsync(Tx("2026-09-27T12:30:00+09:00", 12000));
        Assert.True(created.Id > 0);
        Assert.Equal("점심", created.Type);

        var got = await _client.GetFromJsonAsync<TransactionDto>($"{Url}/{created.Id}");
        Assert.Equal(12000, got!.Cost);
        Assert.Equal("메모", got.Content);

        var update = Tx("2026-09-28T08:00:00+09:00", 5000, ePayType.Income, "용돈");
        update.Id = created.Id;
        Assert.Equal(HttpStatusCode.NoContent, (await _client.PutAsJsonAsync(Url, update)).StatusCode);

        got = await _client.GetFromJsonAsync<TransactionDto>($"{Url}/{created.Id}");
        Assert.Equal(5000, got!.Cost);
        Assert.Equal(ePayType.Income, got.Paytype);
        Assert.Equal("용돈", got.Type);

        Assert.Equal(HttpStatusCode.NoContent, (await _client.DeleteAsync($"{Url}/{created.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync($"{Url}/{created.Id}")).StatusCode);
    }

    [Fact]
    public async Task 날짜는_UTC로_저장되고_UTC로_응답한다()
    {
        var created = await CreateAsync(Tx("2026-09-27T00:30:00+09:00"));

        // 응답: UTC(+00:00)
        Assert.Equal(TimeSpan.Zero, created.Date.Offset);
        Assert.Equal(new DateTimeOffset(2026, 9, 26, 15, 30, 0, TimeSpan.Zero), created.Date);

        // DB: 같은 순간
        var stored = await _factory.WithDbAsync(db => db.Transactions.SingleAsync(t => t.Id == created.Id));
        Assert.Equal(new DateTime(2026, 9, 26, 15, 30, 0, DateTimeKind.Utc), stored.Date);
        Assert.Equal(DateTimeKind.Utc, stored.Date.Kind);
    }

    [Fact]
    public async Task 요약은_from_포함_to_제외_구간이다()
    {
        // 2026년 9월 (KST) = [08-31T15:00Z, 09-30T15:00Z)
        await CreateAsync(Tx("2026-08-31T14:59:59Z", 1));            // 8월 31일 23:59:59 KST → 제외
        await CreateAsync(Tx("2026-08-31T15:00:00Z", 10));           // 9월 1일 00:00 KST → 포함
        await CreateAsync(Tx("2026-09-30T14:59:59Z", 100, ePayType.Income)); // 9월 30일 23:59:59 KST → 포함
        await CreateAsync(Tx("2026-09-30T15:00:00Z", 1000));         // 10월 1일 00:00 KST → 제외

        var summary = await _client.GetFromJsonAsync<TransactionSummaryDto>(
            $"{Url}/summary?from=2026-08-31T15:00:00Z&to=2026-09-30T15:00:00Z");

        Assert.Equal(2, summary!.Statistics.TotalCount);
        Assert.Equal(10, summary.Statistics.TotalExpense);
        Assert.Equal(100, summary.Statistics.TotalIncome);
        Assert.Equal(90, summary.Statistics.NetAmount);
        // 날짜 오름차순
        Assert.Equal(new[] { 10, 100 }, summary.Transactions.Select(t => t.Cost));
    }

    [Fact]
    public async Task 요약은_KST_오프셋으로_보내도_같은_구간이다()
    {
        await CreateAsync(Tx("2026-09-01T00:00:00+09:00", 10));
        await CreateAsync(Tx("2026-10-01T00:00:00+09:00", 1000));

        var summary = await _client.GetFromJsonAsync<TransactionSummaryDto>(
            $"{Url}/summary?from={Uri.EscapeDataString("2026-09-01T00:00:00+09:00")}&to={Uri.EscapeDataString("2026-10-01T00:00:00+09:00")}");

        Assert.Equal(1, summary!.Statistics.TotalCount);
        Assert.Equal(10, summary.Statistics.TotalExpense);
    }

    [Fact]
    public async Task 요약_입출금_필터()
    {
        await CreateAsync(Tx("2026-09-10T00:00:00Z", 10, ePayType.Expense));
        await CreateAsync(Tx("2026-09-11T00:00:00Z", 100, ePayType.Income));

        var summary = await _client.GetFromJsonAsync<TransactionSummaryDto>($"{Url}/summary?payType={(int)ePayType.Income}");

        Assert.Equal(1, summary!.Statistics.TotalCount);
        Assert.Equal(100, summary.Statistics.TotalIncome);
        Assert.Equal(0, summary.Statistics.TotalExpense);
    }

    [Theory]
    [InlineData("from=2026-09-01T00:00:00Z")]                                  // to 없음
    [InlineData("from=2026-10-01T00:00:00Z&to=2026-09-01T00:00:00Z")]          // 순서 반대
    [InlineData("from=2026-09-01T00:00:00Z&to=2026-09-01T00:00:00Z")]          // 빈 구간
    public async Task 요약_잘못된_구간은_400(string query)
    {
        var res = await _client.GetAsync($"{Url}/summary?{query}");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task 잘못된_입력은_400()
    {
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.PostAsJsonAsync(Url, Tx("2026-09-27T00:00:00Z", cost: 0))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.PostAsJsonAsync(Url, Tx("2026-09-27T00:00:00Z", payType: ePayType.None))).StatusCode);

        var noDate = Tx("2026-09-27T00:00:00Z");
        noDate.Date = default;
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.PostAsJsonAsync(Url, noDate)).StatusCode);
    }

    [Fact]
    public async Task 없는_거래는_404()
    {
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync($"{Url}/999999")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.DeleteAsync($"{Url}/999999")).StatusCode);

        var missing = Tx("2026-09-27T00:00:00Z");
        missing.Id = 999999;
        Assert.Equal(HttpStatusCode.NotFound, (await _client.PutAsJsonAsync(Url, missing)).StatusCode);
    }

    [Fact]
    public async Task 다른_가계부_거래는_보이지도_바뀌지도_않는다()
    {
        // 다른 가계부와 그 거래를 DB에 직접 넣는다 (시드 뒤 identity 시퀀스가 맞는지도 함께 확인: 새 Id는 1이 아님)
        var otherTxId = await _factory.WithDbAsync(async db =>
        {
            var other = new Household { Name = "남의 가계부", CreatedAt = DateTime.UtcNow };
            db.Households.Add(other);
            await db.SaveChangesAsync();
            Assert.NotEqual(Household.DefaultId, other.Id);

            var tx = new GagebuTransaction
            {
                HouseholdId = other.Id, Type = "비밀", Cost = 777, Date = DateTime.UtcNow, Paytype = (int)ePayType.Expense,
            };
            db.Transactions.Add(tx);
            await db.SaveChangesAsync();
            return tx.Id;
        });
        await CreateAsync(Tx("2026-09-27T00:00:00Z", 10));

        var all = await _client.GetFromJsonAsync<List<TransactionDto>>(Url);
        Assert.Single(all!);
        Assert.DoesNotContain(all!, t => t.Id == otherTxId);

        var summary = await _client.GetFromJsonAsync<TransactionSummaryDto>($"{Url}/summary");
        Assert.Equal(10, summary!.Statistics.TotalExpense);

        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync($"{Url}/{otherTxId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.DeleteAsync($"{Url}/{otherTxId}")).StatusCode);
        var hijack = Tx("2026-09-27T00:00:00Z", 1);
        hijack.Id = otherTxId;
        Assert.Equal(HttpStatusCode.NotFound, (await _client.PutAsJsonAsync(Url, hijack)).StatusCode);

        // 남의 거래는 그대로
        var untouched = await _factory.WithDbAsync(db => db.Transactions.IgnoreQueryFilters().SingleAsync(t => t.Id == otherTxId));
        Assert.Equal(777, untouched.Cost);
    }

    [Fact]
    public async Task 헬스체크()
    {
        var res = await _client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }
}
