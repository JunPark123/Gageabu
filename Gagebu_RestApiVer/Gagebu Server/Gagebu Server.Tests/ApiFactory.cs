using System.Net.Http.Headers;
using System.Net.Http.Json;
using Gagebu_Server.Data;
using Gagebu_Server.DTO;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace Gagebu_Server.Tests;

// 실제 PostgreSQL(compose의 db 서비스)에 테스트 전용 DB를 만들어 API를 띄운다.
// 실행: 컨테이너에서 dotnet test (docs/DEVELOPMENT.md "서버 테스트")
public class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly string _connectionString;

    public ApiFactory()
    {
        // Program.cs가 builder를 만들자마자 접속 정보를 읽으므로 설정 대신 환경변수로 바꾼다
        var baseConnection = Environment.GetEnvironmentVariable("ConnectionStrings__Gagebu")
            ?? throw new InvalidOperationException("ConnectionStrings__Gagebu가 없습니다. api 컨테이너 안에서 실행하세요.");
        _connectionString = new NpgsqlConnectionStringBuilder(baseConnection)
        {
            Database = $"gageabu_test_{Guid.NewGuid():N}",
        }.ConnectionString;
        Environment.SetEnvironmentVariable("ConnectionStrings__Gagebu", _connectionString);
        // compose가 넣는 카카오 설정은 테스트에서 쓰지 않는다 (테스트마다 UseSetting으로 정함)
        Environment.SetEnvironmentVariable("Kakao__AppId", null);
    }

    // 인증 설정은 compose 값과 상관없이 테스트에서 고정 (개발 모드: 개발용 로그인·익명 허용 켬)
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Auth:JwtKey", "test-only-jwt-signing-key-0123456789abcdef");
        builder.UseSetting("Auth:DevLoginEnabled", "true");
        builder.UseSetting("Auth:AllowAnonymous", "true");
    }

    public Task InitializeAsync()
    {
        // 서버 시작 = 마이그레이션으로 테스트 DB 생성
        _ = Server;
        return Task.CompletedTask;
    }

    // 각 테스트 시작 전: 기본 가계부(시드)만 남기고 비운다.
    // 사용자 Id는 이어서 매긴다 — 초대 코드 시도 제한이 사용자 Id별로 서버 메모리에 남아 있어서, 다시 1부터 매기면 앞 테스트 횟수가 섞인다
    public async Task ResetAsync()
    {
        await using var scope = Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.ExecuteSqlRawAsync("""
            TRUNCATE "Transactions", "Invites", "HouseholdMembers", "Users", "BudgetOverrides" CASCADE;
            DELETE FROM "Households" WHERE "Id" <> 1;
            UPDATE "Households" SET "Name" = '우리 가계부', "DefaultMonthlyBudget" = NULL WHERE "Id" = 1;
            """);
    }

    // 개발용 로그인 후 토큰을 단 클라이언트
    public async Task<(HttpClient Client, LoginResponse Login)> LoginAsync(string key, string? nickname = null)
    {
        var res = await CreateClient().PostAsJsonAsync("/api/auth/dev-login", new DevLoginRequest { Key = key, Nickname = nickname });
        res.EnsureSuccessStatusCode();
        var login = (await res.Content.ReadFromJsonAsync<LoginResponse>())!;
        var client = CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login.Token);
        return (client, login);
    }

    public async Task<T> WithDbAsync<T>(Func<AppDbContext, Task<T>> action)
    {
        await using var scope = Services.CreateAsyncScope();
        return await action(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await using (var scope = Services.CreateAsyncScope())
        {
            await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureDeletedAsync();
        }
        await base.DisposeAsync();
    }
}

[CollectionDefinition(Name)]
public class ApiCollection : ICollectionFixture<ApiFactory>
{
    public const string Name = "api";
}
