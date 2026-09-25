using System.Data.Common;
using Microsoft.EntityFrameworkCore;

namespace Gagebu_Server.Data
{
    public static class DbInitializer
    {
        // 서버 시작 시 1회: 밀린 마이그레이션 적용
        public static void Migrate(AppDbContext db)
        {
            Directory.CreateDirectory(DbSettings.DbDir);
            BaselineLegacyDatabase(db);
            db.Database.Migrate();
        }

        // 마이그레이션 도입 전 EnsureCreated()로 만든 DB는 테이블은 있는데 히스토리가 없다.
        // 그대로 Migrate()하면 InitialCreate가 테이블을 또 만들다 실패하므로, InitialCreate를 적용된 것으로 기록한다.
        private static void BaselineLegacyDatabase(AppDbContext db)
        {
            var conn = db.Database.GetDbConnection();
            conn.Open();
            try
            {
                if (!TableExists(conn, "Transactions") || TableExists(conn, "__EFMigrationsHistory"))
                    return;

                var initialMigration = db.Database.GetMigrations().First();
                using var cmd = conn.CreateCommand();
                cmd.CommandText = """
                    CREATE TABLE "__EFMigrationsHistory" (
                        "MigrationId" TEXT NOT NULL CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY,
                        "ProductVersion" TEXT NOT NULL
                    );
                    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion") VALUES ($id, '9.0.3');
                    """;
                var p = cmd.CreateParameter();
                p.ParameterName = "$id";
                p.Value = initialMigration;
                cmd.Parameters.Add(p);
                cmd.ExecuteNonQuery();
                Console.WriteLine($"기존 DB를 마이그레이션 기준({initialMigration})으로 등록함");
            }
            finally
            {
                conn.Close();
            }
        }

        private static bool TableExists(DbConnection conn, string name)
        {
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = $name";
            var p = cmd.CreateParameter();
            p.ParameterName = "$name";
            p.Value = name;
            cmd.Parameters.Add(p);
            return Convert.ToInt64(cmd.ExecuteScalar()) > 0;
        }
    }
}
