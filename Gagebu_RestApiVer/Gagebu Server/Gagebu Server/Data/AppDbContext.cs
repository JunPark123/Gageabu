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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // 날짜는 UTC DateTime으로 저장한다. (SQLite 프로바이더는 DateTimeOffset 비교·정렬을 SQL로 못 바꿈)
            // DB에서 읽은 값은 Kind가 Unspecified라서 Utc로 지정
            modelBuilder.Entity<GagebuTransaction>()
                .Property(t => t.Date)
                .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
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
