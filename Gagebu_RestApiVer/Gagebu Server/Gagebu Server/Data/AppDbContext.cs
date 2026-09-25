using Microsoft.EntityFrameworkCore;
using GagebuShared;


namespace Gagebu_Server.Data
{
    public class AppDbContext : DbContext
    {
        public DbSet<GagebuTransaction> Transactions { get; set; }

        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }
    }

    // DB 위치: 환경변수 GAGEBU_DB_DIR / GAGEBU_DB_NAME (컨테이너는 docker-compose.yml에서 지정)
    public static class DbSettings
    {
        public static string DbDir =>
            Environment.GetEnvironmentVariable("GAGEBU_DB_DIR") ?? @"C:\Gagebu\DB";
        public static string DbName =>
            Environment.GetEnvironmentVariable("GAGEBU_DB_NAME") ?? "gageabu.db";

        public static string ConnectionString =>
            $"Data Source={Path.Combine(DbDir, DbName)}";
    }
}
