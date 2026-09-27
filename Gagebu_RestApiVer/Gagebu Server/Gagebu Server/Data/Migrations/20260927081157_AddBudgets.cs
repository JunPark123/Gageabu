using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gagebu_Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBudgets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DefaultMonthlyBudget",
                table: "Households",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BudgetOverrides",
                columns: table => new
                {
                    HouseholdId = table.Column<int>(type: "integer", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BudgetOverrides", x => new { x.HouseholdId, x.Year, x.Month });
                    table.ForeignKey(
                        name: "FK_BudgetOverrides_Households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalTable: "Households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "Households",
                keyColumn: "Id",
                keyValue: 1,
                column: "DefaultMonthlyBudget",
                value: null);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BudgetOverrides");

            migrationBuilder.DropColumn(
                name: "DefaultMonthlyBudget",
                table: "Households");
        }
    }
}
