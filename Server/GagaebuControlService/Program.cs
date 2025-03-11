using System.Collections.Generic;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Threading;


namespace GagaebuControlService
{
    internal class Program
    {
        static void Main()
        {
            using var db = new AppDbContext();
            db.Database.EnsureCreated();

            while (true)
            {
                Console.WriteLine("\n===== 가계부 관리 =====");
                Console.WriteLine("1. 지출 추가");
                Console.WriteLine("2. 지출 목록 조회");
                Console.WriteLine("3. 종료");
                Console.Write("선택: ");

                string choice = Console.ReadLine() ?? "";
                switch (choice)
                {
                    case "1":
                        AddTransaction(db);
                        break;
                    case "2":
                        ListTransactions(db);
                        break;
                    case "3":
                        return;
                    default:
                        Console.WriteLine("잘못된 입력입니다. 다시 선택하세요.");
                        break;
                }
            }
        }

        static void AddTransaction(AppDbContext db)
        {
            Console.Write("설명: ");
            string description = Console.ReadLine() ?? "";

            Console.Write("금액: ");
            if (!decimal.TryParse(Console.ReadLine(), out decimal amount))
            {
                Console.WriteLine("올바른 숫자를 입력하세요.");
                return;
            }

            Console.Write("날짜 (YYYY-MM-DD): ");
            if (!DateTime.TryParse(Console.ReadLine(), out DateTime date))
            {
                Console.WriteLine("올바른 날짜를 입력하세요.");
                return;
            }

            Console.Write("카테고리: ");
            string category = Console.ReadLine() ?? "";

            var transaction = new Model.Transaction
            {
                Description = description,
                Amount = amount,
                Date = date,
                Category = category
            };

            db.Transactions.Add(transaction);
            db.SaveChanges();
            Console.WriteLine("✅ 지출이 추가되었습니다!");
        }

        static void ListTransactions(AppDbContext db)
        {
            var transactions = db.Transactions.ToList();

            if (transactions.Count == 0)
            {
                Console.WriteLine("📂 저장된 지출이 없습니다.");
                return;
            }

            Console.WriteLine("\n=== 지출 목록 ===");
            foreach (var t in transactions)
            {
                Console.WriteLine($"[{t.Id}] {t.Date:yyyy-MM-dd} | {t.Category} | {t.Description} | {t.Amount}원");
            }
        }
    }
}
