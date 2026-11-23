using System.ComponentModel.DataAnnotations;

namespace OrgSystem.Api.DTOs;

// --- PITCH DTOs ---
public record CreatePitchRequest(
    [Required, MaxLength(100)] string Name,
    [Required, MaxLength(50)] string SurfaceType,
    [Range(1, 100000)] decimal HourlyPrice
);

public record UpdatePitchRequest(
    [Required, MaxLength(100)] string Name,
    [Required, MaxLength(50)] string SurfaceType,
    [Range(1, 100000)] decimal HourlyPrice,
    bool IsActive
);

public record PitchResponse(
    int Id,
    string Name,
    string SurfaceType,
    decimal HourlyPrice,
    bool IsActive
);

// --- RESERVATION DTOs ---
public record CreateReservationRequest(
    [Required] int PitchId,
    [Required] DateTime StartTime,
    [Range(1, 4)] int DurationHours = 1
);

public record ReservationResponse(
    int Id,
    int PitchId,
    string PitchName,
    int UserId,
    string UserFullName,
    string UserPhone,
    DateTime StartTime,
    DateTime EndTime,
    decimal TotalPrice,
    string Status
);