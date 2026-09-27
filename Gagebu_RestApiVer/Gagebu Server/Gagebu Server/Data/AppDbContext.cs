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
            // 날짜는 UTC DateTime → timestamp with time zone. Npgsql은 Kind=Utc만 저장을 허용하고, 읽을 때도 Utc로 준다
            modelBuilder.Entity<GagebuTransaction>()
                .HasOne<Household>()
                .WithMany()
                .HasForeignKey(t => t.HouseholdId)
                .OnDelete(DeleteBehavior.Restrict);

            // 모든 내역 조회·수정·삭제에 자동 적용 (서비스에서 빠뜨려도 다른 가계부 내역이 새지 않게)
            modelBuilder.Entity<GagebuTransaction>()
                .HasQueryFilter(t => t.HouseholdId == _householdId);

            modelBuilder.Entity<Household>().HasData(new Household
            {
                Id = Household.DefaultId,
                Name = "우리 가계부",
                CreatedAt = new DateTime(2026, 9, 25, 0, 0, 0, DateTimeKind.Utc),
            });
        }
    }
}
