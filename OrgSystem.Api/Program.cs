using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OrgSystem.Api.Data;
using OrgSystem.Api.Middleware;
using OrgSystem.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// AddDbContext varsayılan olarak Scoped yaşam döngüsündedir
// (Her HTTP isteği için yeni bir DbContext üretilir ve istek bitince Dispose edilir).

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// JwtTokenService durumsuz (stateless) olsa da Scoped olarak kaydettik.
// Singleton da olabilirdi, ama ileride Refresh Token kaydı için Scoped bırakarak Captive Dependency riskini baştan önledik.
// Capt. Dep. : Bir servisin yaşaması gereken süreden daha uzun süre yaşaması. Veri çalınmasına yol açabilir.
builder.Services.AddScoped<JwtTokenService>();

// Token başlığını kontrol etme kuralları
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, // Token'ı bizim API mi üretti?
            ValidateAudience = true, // Bu token bizim frontend için mi üretildi?
            ValidateLifetime = true, // Süresi dolmuş mu?
            ValidateIssuerSigningKey = true, // İmza bizim secret key ile mi üretilmiş?
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!))
        };
    });

builder.Services.AddAuthorization();

// Tarayıcıların farklı porttan (5173 -> 5000) istek atabilmesi için CORS izni.
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    if (!db.Users.Any())
    {
        var (adminHash, adminSalt) = PasswordHasher.HashPassword("Admin123!");
        var (userHash, userSalt) = PasswordHasher.HashPassword("User123!");

        db.Users.AddRange(
            new OrgSystem.Api.Entities.User
            {
                FullName = "Tesis Yöneticisi",
                Email = "admin@halisaha.com",
                Phone = "05550000001",
                PasswordHash = adminHash,
                PasswordSalt = adminSalt,
                Role = "Admin"
            },
            new OrgSystem.Api.Entities.User
            {
                FullName = "Ahmet Yılmaz",
                Email = "ahmet@halisaha.com",
                Phone = "05550000002",
                PasswordHash = userHash,
                PasswordSalt = userSalt,
                Role = "Customer"
            }
        );

        db.Pitches.AddRange(
            new OrgSystem.Api.Entities.Pitch
            {
                Name = "Saha 1 (Kapalı Arena)",
                SurfaceType = "FIFA Onaylı Suni Çim",
                HourlyPrice = 1800
            },
            new OrgSystem.Api.Entities.Pitch
            {
                Name = "Saha 2 (Açık Panoramik)",
                SurfaceType = "Hibrit Çim",
                HourlyPrice = 1500
            }
        );

        await db.SaveChangesAsync();
    }
}

// En tepede GlobalExceptionMiddleware olmalı ki alt katmanlardaki tüm hataları yakalayabilsin.
app.UseMiddleware<GlobalExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Preflight (OPTIONS) isteklerinin engellenmemesi için CORS, Auth'tan önce gelmeli.
app.UseCors("FrontendPolicy");

// Önce kimlik doğrulama (Authentication - Kimsin?), sonra yetkilendirme (Authorization - Yetkin var mı?)
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();