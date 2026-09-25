using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gagebu_Server.Data.Migrations
{
    /// <summary>
    /// 기존 데이터는 KST 벽시계 시각을 UTC인 척 저장했음(클라 getFakeUTCISOStringFromKST).
    /// 진짜 UTC로 바꾸려면 9시간 빼면 된다. (한국은 서머타임 없음, 초 미만은 버림)
    /// </summary>
    public partial class ConvertDatesToUtc : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""UPDATE "Transactions" SET "Date" = datetime("Date", '-9 hours');""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""UPDATE "Transactions" SET "Date" = datetime("Date", '+9 hours');""");
        }
    }
}
