using Microsoft.EntityFrameworkCore;
using GagebuShared;
using Gagebu_Server.Auth;


namespace Gagebu_Server.Data
{
    public class AppDbContext : DbContext
    {
        public DbSet<GagebuTransaction> Transactions { get; set; }
        public DbSet<Household> Households { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<HouseholdMember> HouseholdMembers { get; set; }
        public DbSet<Invite> Invites { get; set; }
        public DbSet<BudgetOverride> BudgetOverrides { get; set; }
        public DbSet<ReceiptJob> ReceiptJobs { get; set; }
        public DbSet<UserSession> UserSessions { get; set; }

        private readonly CurrentUser _current;

        // 쿼리 필터용. 가계부가 정해지지 않은 요청은 0 → 아무 내역도 안 보임
        // (필터가 DbContext 속성을 참조하면 EF가 쿼리마다 다시 읽는다)
        private int CurrentHouseholdId => _current.HouseholdId ?? 0;

        public AppDbContext(DbContextOptions<AppDbContext> options, CurrentUser current) : base(options)
        {
            _current = current;
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // 날짜는 UTC DateTime → timestamp with time zone. Npgsql은 Kind=Utc만 저장을 허용하고, 읽을 때도 Utc로 준다
            modelBuilder.Entity<GagebuTransaction>()
                .HasOne<Household>()
                .WithMany()
                .HasForeignKey(t => t.HouseholdId)
                .OnDelete(DeleteBehavior.Restrict);

            // 나간 멤버의 내역도 남긴다 (사용자는 지우지 않음)
            modelBuilder.Entity<GagebuTransaction>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(t => t.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // 모든 내역 조회·수정·삭제에 자동 적용 (서비스에서 빠뜨려도 다른 가계부 내역이 새지 않게)
            modelBuilder.Entity<GagebuTransaction>()
                .HasQueryFilter(t => t.HouseholdId == CurrentHouseholdId);

            modelBuilder.Entity<Household>().HasData(new Household
            {
                Id = Household.DefaultId,
                Name = "우리 가계부",
                CreatedAt = new DateTime(2026, 9, 25, 0, 0, 0, DateTimeKind.Utc),
            });

            modelBuilder.Entity<User>(e =>
            {
                e.HasIndex(u => u.KakaoId).IsUnique();
                e.HasIndex(u => u.DevKey).IsUnique();
            });

            modelBuilder.Entity<HouseholdMember>(e =>
            {
                e.HasKey(m => new { m.HouseholdId, m.UserId });
                e.HasIndex(m => m.UserId);
                e.HasOne<Household>().WithMany().HasForeignKey(m => m.HouseholdId).OnDelete(DeleteBehavior.Cascade);
                e.HasOne<User>().WithMany().HasForeignKey(m => m.UserId).OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<UserSession>(e =>
            {
                e.HasIndex(s => s.RefreshTokenHash).IsUnique();
                e.HasIndex(s => s.PreviousTokenHash);
                e.HasIndex(s => new { s.UserId, s.DeviceId });
                e.Property(s => s.DeviceId).HasMaxLength(64);
                e.HasOne<User>().WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<ReceiptJob>(e =>
            {
                e.HasIndex(r => new { r.HouseholdId, r.ClientRequestId }).IsUnique();
                e.HasIndex(r => new { r.Status, r.Id });   // 워커 대기열 조회
                e.Property(r => r.OcrJson).HasColumnType("jsonb");
                e.Property(r => r.SuggestionJson).HasColumnType("jsonb");
                e.Property(r => r.ConfirmedJson).HasColumnType("jsonb");
                e.HasOne<Household>().WithMany().HasForeignKey(r => r.HouseholdId).OnDelete(DeleteBehavior.Cascade);
                e.HasOne<User>().WithMany().HasForeignKey(r => r.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
                // 앱에서는 자기 가계부 영수증만 (워커는 IgnoreQueryFilters)
                e.HasQueryFilter(r => r.HouseholdId == CurrentHouseholdId);
            });

            modelBuilder.Entity<BudgetOverride>(e =>
            {
                e.HasKey(b => new { b.HouseholdId, b.Year, b.Month });
                e.HasOne<Household>().WithMany().HasForeignKey(b => b.HouseholdId).OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Invite>(e =>
            {
                e.HasIndex(i => i.Code).IsUnique();
                e.HasOne<Household>().WithMany().HasForeignKey(i => i.HouseholdId).OnDelete(DeleteBehavior.Cascade);
                e.HasOne<User>().WithMany().HasForeignKey(i => i.InviterUserId).OnDelete(DeleteBehavior.Restrict);
                e.HasOne<User>().WithMany().HasForeignKey(i => i.UsedByUserId).OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}
