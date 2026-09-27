using Gagebu_Server.Data;
using Microsoft.EntityFrameworkCore;
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
                // 외부에서도 접속 가능하게 열기. 포트는 GAGEBU_PORT로 바꿀 수 있음 (기본 5067)
                var port = int.TryParse(Environment.GetEnvironmentVariable("GAGEBU_PORT"), out var p) ? p : 5067;
                options.ListenAnyIP(port);
            });
            Console.WriteLine(" Program 시작!");

            // DB 설정을 `AddDbContext`에서 직접 지정
            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseSqlite(DbSettings.ConnectionString));
            Console.WriteLine(" DB 컨텍스트 등록 완료!");
            builder.Services.AddScoped<ICurrentHousehold, DefaultHousehold>();
            builder.Services.AddScoped<ITransactionService, TransactionService>();
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

            using (var scope = app.Services.CreateScope())
            {
                DbInitializer.Migrate(scope.ServiceProvider.GetRequiredService<AppDbContext>());
            }

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
            app.MapGet("/health", async (AppDbContext db, CancellationToken cancellationToken) =>
                await db.Database.CanConnectAsync(cancellationToken)
                    ? Results.Ok(new { status = "ok" })
                    : Results.StatusCode(StatusCodes.Status503ServiceUnavailable));
            Console.WriteLine(" 서버 실행 중...");
            app.Run();
        }
    }
}
