using System;
using GagebuShared;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gagebu_Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddHousehold : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Households",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Households", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Households",
                columns: new[] { "Id", "CreatedAt", "Name" },
                values: new object[] { 1, new DateTime(2026, 9, 25, 0, 0, 0, 0, DateTimeKind.Utc), "우리 가계부" });

            // 기존 내역은 전부 기본 가계부로 (기본값 0이면 없는 가계부를 가리키게 됨 — SQLite는 FK를 나중에 붙일 때 기존 행을 검사하지 않음)
            migrationBuilder.AddColumn<int>(
                name: "HouseholdId",
                table: "Transactions",
                type: "INTEGER",
                nullable: false,
                defaultValue: Household.DefaultId);

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_HouseholdId",
                table: "Transactions",
                column: "HouseholdId");

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_Households_HouseholdId",
                table: "Transactions",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_Households_HouseholdId",
                table: "Transactions");

            migrationBuilder.DropTable(
                name: "Households");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_HouseholdId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "Transactions");
        }
    }
}
