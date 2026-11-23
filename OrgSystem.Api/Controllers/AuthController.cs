using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OrgSystem.Api.Data;
using OrgSystem.Api.DTOs;
using OrgSystem.Api.Entities;
using OrgSystem.Api.Services;

namespace OrgSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(AppDbContext db, JwtTokenService jwtService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        // email'de büyük küçük harf - boşluk kaynaklı oluşabilecek sorunları önlem
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        if (await db.Users.AnyAsync(u => u.Email == normalizedEmail))
            return BadRequest(new { message = "Bu e-posta adresi zaten kayıtlı." });

        // Dışarıdan farklı bir rol string'i gönderilse bile rolün alabileceği değerleri belirliyoruz.
        var role = request.Role == "Admin" ? "Admin" : "Customer";
        var (hash, salt) = PasswordHasher.HashPassword(request.Password);

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = normalizedEmail,
            Phone = request.Phone.Trim(),
            PasswordHash = hash,
            PasswordSalt = salt,
            Role = role
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        var token = jwtService.GenerateToken(user);
        // Entity yerine DTO (AuthResponse) dönerek PasswordHash ve Salt'ın dışarı çıkmasını engelliyoruz.
        return Ok(new AuthResponse(token, user.Id, user.FullName, user.Email, user.Role));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var user = await db.Users
            .AsNoTracking() // Sadece okuma
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        // User Enumeration'u engellemek amacıyla genel bir hata mesajı döndürüyoruz.
        if (user is null || !PasswordHasher.Verify(request.Password, user.PasswordHash, user.PasswordSalt))
            return Unauthorized(new { message = "E-posta veya parola hatalı." });

        var token = jwtService.GenerateToken(user);
        return Ok(new AuthResponse(token, user.Id, user.FullName, user.Email, user.Role));
    }
}