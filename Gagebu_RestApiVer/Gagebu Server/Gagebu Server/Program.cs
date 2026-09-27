using System.Text;
using System.Threading.RateLimiting;
using Gagebu_Server.Auth;
using Gagebu_Server.Controllers;
using Gagebu_Server.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
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

            // PostgreSQL. 접속 정보는 ConnectionStrings__Gagebu 환경변수 (컨테이너는 docker-compose.yml에서 지정)
            var connectionString = builder.Configuration.GetConnectionString("Gagebu")
                ?? throw new InvalidOperationException("ConnectionStrings__Gagebu 환경변수가 없습니다. docs/DEVELOPMENT.md 참고");
            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(connectionString));
            Console.WriteLine(" DB 컨텍스트 등록 완료!");

            // 인증: 서버가 발급한 JWT (Authorization: Bearer). 설정은 Auth 섹션 (docs/DEVELOPMENT.md)
            builder.Services.AddOptions<AuthSettings>()
                .Bind(builder.Configuration.GetSection(AuthSettings.Section))
                .Validate(s => Encoding.UTF8.GetByteCount(s.JwtKey) >= 32, "Auth:JwtKey는 32바이트 이상이어야 합니다")
                .ValidateOnStart();
            builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
            builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
                .Configure<IOptions<AuthSettings>>((options, auth) =>
                {
                    options.MapInboundClaims = false; // sub를 그대로
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidIssuer = auth.Value.Issuer,
                        ValidAudience = auth.Value.Issuer,
                        IssuerSigningKey = TokenService.SigningKey(auth.Value),
                        ClockSkew = TimeSpan.FromMinutes(1),
                    };
                });
            builder.Services.AddScoped<CurrentUser>();
            builder.Services.AddSingleton<TokenService>();

            // 초대 코드 추측 방지: 사용자(없으면 IP)마다 10분에 10번
            builder.Services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
                options.AddPolicy(InvitesController.CodeAttemptPolicy, context =>
                {
                    var userId = context.RequestServices.GetRequiredService<CurrentUser>().UserId;
                    var key = userId is int id ? $"user:{id}" : $"ip:{context.Connection.RemoteIpAddress}";
                    return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 10,
                        Window = TimeSpan.FromMinutes(10),
                    });
                });
            });

            builder.Services.AddScoped<ITransactionService, TransactionService>();
            builder.Services.AddScoped<HouseholdService>();
            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(c =>
            {
                // Swagger UI의 Authorize 버튼: dev-login으로 받은 토큰을 넣으면 로그인한 사용자로 호출
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                });
                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = Array.Empty<string>(),
                });
            });
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

            // 서버 시작 시 1회: 밀린 마이그레이션 적용
            using (var scope = app.Services.CreateScope())
            {
                scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
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
            app.UseAuthentication();
            app.UseMiddleware<CurrentUserMiddleware>();
            app.UseRateLimiter();
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
