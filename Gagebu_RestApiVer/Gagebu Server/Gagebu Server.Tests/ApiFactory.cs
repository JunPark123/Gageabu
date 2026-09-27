using Gagebu_Server;
using Gagebu_Server.Data;
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
    }

    public Task InitializeAsync()
    {
        // 서버 시작 = 마이그레이션으로 테스트 DB 생성
        _ = Server;
        return Task.CompletedTask;
    }

    // 각 테스트 시작 전: 거래와 기본 가계부 외 데이터를 비운다
    public async Task ResetAsync()
    {
        await using var scope = Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.ExecuteSqlRawAsync("""TRUNCATE "Transactions" RESTART IDENTITY; DELETE FROM "Households" WHERE "Id" <> 1;""");
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
