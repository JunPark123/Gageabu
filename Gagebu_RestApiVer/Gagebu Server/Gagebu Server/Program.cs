using Gagebu_Server.Data;
using Microsoft.EntityFrameworkCore;
using GagebuShared;
using Gagebu_Server.Servecies;


namespace Gagebu_Server
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);
            builder.WebHost.ConfigureKestrel(options =>
            {
                options.ListenAnyIP(5067); // 외부에서도 접속 가능하게 열기
            });
            Console.WriteLine(" Program 시작!");

            // DB 설정을 `AddDbContext`에서 직접 지정
            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseSqlite($"Data Source={MgrDB.Instance.dbPath}\\{MgrDB.Instance.dbName}"));
            Console.WriteLine(" DB 컨텍스트 등록 완료!");
            builder.Services.AddScoped<iTransactionService, TransactionService>();
            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();
            Console.WriteLine("서비스 등록 완료!");
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowAll", policy =>
                {
                    policy.AllowAnyOrigin()
                          .AllowAnyMethod()
                          .AllowAnyHeader();
                });
            });
            var app = builder.Build();

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
                Console.WriteLine(" Swagger 활성화됨!");
            }
            app.UseCors("AllowAll");
            if (!app.Environment.IsDevelopment())
            {
                app.UseHttpsRedirection(); // 운영 환경일 때만 HTTPS 모바일 환경에서는 https로 접속이 안되서 redirection use 하면 안됨
            }
            app.UseAuthorization();
            app.MapControllers();
            Console.WriteLine(" 서버 실행 중...");
            app.Run();
            
            
            /*
            var builder = WebApplication.CreateBuilder(args);

            // ? SQLite DB 컨텍스트 등록
            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

            // ? CORS 설정 (웹, 모바일 접근 허용)
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowAllOrigins", builder =>
                    builder.AllowAnyOrigin()
                           .AllowAnyMethod()
                           .AllowAnyHeader());
            });

            // ? API 서비스 추가
            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            var app = builder.Build();

            // ? 개발 환경에서 Swagger UI 활성화
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            // ? CORS 적용
            app.UseCors("AllowAllOrigins");

            // ? HTTPS 리디렉션
            app.UseHttpsRedirection();

            app.UseAuthorization();

            app.MapControllers();

            app.Run();*/
        }
    }
}
