using System.ComponentModel.DataAnnotations;

namespace OrgSystem.Api.DTOs;

public record RegisterRequest(
    [Required, MaxLength(100)] string FullName,
    [Required, EmailAddress, MaxLength(128)] string Email,
    [Required, MaxLength(20)] string Phone,
    [Required, MinLength(6)] string Password,
    string? Role // Opsiyonel: "Admin" veya "Customer" (varsayılan Customer)
);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password
);

public record AuthResponse(
    string Token,
    int UserId,
    string FullName,
    string Email,
    string Role
);