using Microsoft.EntityFrameworkCore;
using GagebuShared;
using Gagebu_Server.Servecies;


namespace Gagebu_Server.Data
{
    public class AppDbContext : DbContext
    {
        public DbSet<GagebuTransaction> Transactions { get; set; }
        public DbSet<Household> Households { get; set; }

        // 쿼리 필터용. 내역은 현재 가계부 것만 보인다
        private readonly int _householdId;

        public AppDbContext(DbContextOptions<AppDbContext> options, ICurrentHousehold currentHousehold) : base(options)
        {
            _householdId = currentHousehold.Id;
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // 날짜는 UTC DateTime으로 저장한다. (SQLite 프로바이더는 DateTimeOffset 비교·정렬을 SQL로 못 바꿈)
            // DB에서 읽은 값은 Kind가 Unspecified라서 Utc로 지정
            modelBuilder.Entity<GagebuTransaction>()
                .Property(t => t.Date)
                .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

            modelBuilder.Entity<GagebuTransaction>()
                .HasOne<Household>()
                .WithMany()
                .HasForeignKey(t => t.HouseholdId)
                .OnDelete(DeleteBehavior.Restrict);

            // 모든 내역 조회·수정·삭제에 자동 적용 (서비스에서 빠뜨려도 다른 가계부 내역이 새지 않게)
            modelBuilder.Entity<GagebuTransaction>()
                .HasQueryFilter(t => t.HouseholdId == _householdId);

            modelBuilder.Entity<Household>()
                .Property(h => h.CreatedAt)
                .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

            modelBuilder.Entity<Household>().HasData(new Household
            {
                Id = Household.DefaultId,
                Name = "우리 가계부",
                CreatedAt = new DateTime(2026, 9, 25, 0, 0, 0, DateTimeKind.Utc),
            });
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
