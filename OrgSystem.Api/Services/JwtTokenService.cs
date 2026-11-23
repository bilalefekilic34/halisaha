using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using OrgSystem.Api.Entities;

namespace OrgSystem.Api.Services;

public class JwtTokenService(IConfiguration config)
{
    public string GenerateToken(User user)
    {
        // JWT key
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Token içine gömülen kimlik bilgileri - claim
        // Token encrypted değildir, bu yüzden içinde şifre gibi hassas bilgiler koyulmaz.
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), // Controller'da UserID'yi buradan okuruz.
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role) // [Authorize(Roles="Admin)] burayı okur, değiştirilirse HTTP 401 veya HTTP 403.
        };

        // DB'den birini admin'den user'a düşürürsek 
        // JTW "stateless olduğundan" ExpiresHours dolana kadar token içindeki claim geçerli kalmaya devam eder.
        
        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(double.Parse(config["Jwt:ExpiresHours"] ?? "8")),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}