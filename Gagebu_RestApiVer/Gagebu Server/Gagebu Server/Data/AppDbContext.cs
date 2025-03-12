using Microsoft.EntityFrameworkCore;
using System.IO;
using Microsoft.Extensions.Logging;
using System.Text;
using System.Xml;
using System.Diagnostics;


namespace Gagebu_Server.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) 
        {
            Database.EnsureCreated();
        }
        public DbSet<GagebuShared.GagebuTransaction> Transactions { get; set; }

        protected override void OnConfiguring(DbContextOptionsBuilder options)
        {
            string dbFolder = MgrDB.Instance.dbPath;
            string dbFilePath = Path.Combine(dbFolder, MgrDB.Instance.dbName);


            if (!Directory.Exists(dbFolder))
            {
                Directory.CreateDirectory(dbFolder);
                Console.WriteLine($"DB 폴더 생성됨: {dbFolder}");
                
            }

            if (!File.Exists(dbFilePath))
            {
                Console.WriteLine($" DB 파일이 없습니다. 생성 예정: {dbFilePath}");
            }

            options.UseSqlite($"Data Source={dbFilePath}");
            Console.WriteLine($"SQLite 연결 완료: {dbFilePath}");
        }
       
    }

    public class MgrDB
    {
        private static readonly MgrDB _instance = new MgrDB();
        public static MgrDB Instance => _instance;

        public string dbPath { get; set; } = @"C:\Gagebu\DB";
        public string dbName { get; set; } = "household_ledger.db";

        static MgrDB()
        {
        }
    }
}
