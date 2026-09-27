using System.Text;
using System.Threading.RateLimiting;
using Gagebu_Server.Auth;
using Gagebu_Server.Controllers;
using Gagebu_Server.Data;
using Gagebu_Server.Realtime;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
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
                    // 웹소켓은 헤더를 못 붙여서 SignalR이 토큰을 쿼리(access_token)로 보낸다 — 허브 경로에서만 받는다
                    options.Events = new JwtBearerEvents
                    {
                        OnMessageReceived = ctx =>
                        {
                            var token = ctx.Request.Query["access_token"];
                            if (!string.IsNullOrEmpty(token) && ctx.HttpContext.Request.Path.StartsWithSegments(HouseholdHub.Path))
                                ctx.Token = token;
                            return Task.CompletedTask;
                        },
                    };
                });
            builder.Services.AddScoped<CurrentUser>();
            builder.Services.AddSingleton<TokenService>();
            builder.Services.AddOptions<KakaoSettings>().Bind(builder.Configuration.GetSection(KakaoSettings.Section));
            builder.Services.AddHttpClient<IKakaoApi, KakaoApi>(c =>
            {
                c.BaseAddress = new Uri(KakaoApi.BaseAddress);
                c.Timeout = TimeSpan.FromSeconds(10);
            });

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
            builder.Services.AddScoped<BudgetService>();
            builder.Services.AddSignalR();
            builder.Services.AddAuthorization(o => o.AddPolicy(HouseholdHub.Policy, p => p.RequireAssertion(ctx =>
                ctx.Resource is HttpContext http && http.RequestServices.GetRequiredService<CurrentUser>().HouseholdId != null)));
            builder.Services.AddSingleton<IHouseholdNotifier, HouseholdNotifier>();
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
            // CORS는 브라우저에서 부를 때만 의미가 있다 (폰 앱은 상관없음).
            // 개발: 전부 허용(웹 미리보기). 운영: Cors__AllowedOrigins__0=https://... 로 지정한 곳만 (없으면 전부 거부)
            var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
            builder.Services.AddCors(options =>
            {
                options.AddDefaultPolicy(policy =>
                {
                    if (builder.Environment.IsDevelopment())
                        policy.AllowAnyOrigin();
                    else
                        policy.WithOrigins(allowedOrigins);
                    policy.AllowAnyMethod().AllowAnyHeader();
                });
            });

            // 운영에서는 Caddy(HTTPS)가 앞에서 받아 http로 넘긴다 → 원래 주소·프로토콜을 헤더에서 읽는다.
            // API 포트는 운영 compose에서 밖으로 열지 않으므로 프록시 목록 제한을 푼다
            builder.Services.Configure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
                options.KnownNetworks.Clear();
                options.KnownProxies.Clear();
            });
            var app = builder.Build();

            // 서버 시작 시 1회: 밀린 마이그레이션 적용
            using (var scope = app.Services.CreateScope())
            {
                scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
            }

            app.UseForwardedHeaders();
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
                Console.WriteLine(" Swagger 활성화됨!");
            }
            app.UseCors();
            // HTTPS 전환은 운영의 Caddy가 한다 (개발은 폰이 http로 붙어야 해서 하지 않음)
            app.UseAuthentication();
            app.UseMiddleware<CurrentUserMiddleware>();
            app.UseRateLimiter();
            app.UseAuthorization();
            app.MapControllers();
            // 가계부가 정해진 요청만 연결 (틀린 토큰은 연결 단계에서 401)
            app.MapHub<HouseholdHub>(HouseholdHub.Path).RequireAuthorization(HouseholdHub.Policy);
            app.MapGet("/health", async (AppDbContext db, CancellationToken cancellationToken) =>
                await db.Database.CanConnectAsync(cancellationToken)
                    ? Results.Ok(new { status = "ok" })
                    : Results.StatusCode(StatusCodes.Status503ServiceUnavailable));
            Console.WriteLine(" 서버 실행 중...");
            app.Run();
        }
    }
}
