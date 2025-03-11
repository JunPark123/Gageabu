using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace GagaebuControlService
{
    public class AppDbContext : DbContext
    {
        public DbSet<Model.Transaction> Transactions { get; set; }

        protected override void OnConfiguring(DbContextOptionsBuilder options)
        {
            string path = Directory.GetCurrentDirectory();
            // 프로젝트 루트 폴더 설정
            string projectRoot = Path.Combine(Directory.GetCurrentDirectory(),"..", "..", "..", "..");
            string dbFolderPath = Path.Combine(projectRoot, "DB");
            string dbFilePath = Path.Combine(dbFolderPath, "household_ledger.db");

            // DB 폴더가 없으면 생성
            if (!Directory.Exists(dbFolderPath))
            {
                Directory.CreateDirectory(dbFolderPath);
            }
            Console.WriteLine($"📁 DB 저장 경로: {dbFilePath}");

            SQLitePCL.Batteries.Init();
            options.UseSqlite($"Data Source={dbFilePath}");
        }
    }
}
