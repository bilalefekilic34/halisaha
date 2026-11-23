using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OrgSystem.Api.Data;
using OrgSystem.Api.DTOs;
using OrgSystem.Api.Entities;

namespace OrgSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReservationsController(AppDbContext db) : ControllerBase
{
    // Takvimde dolu saatleri göstermek için herkese açık doluluk sorgusu
    [HttpGet("schedule")]
    public async Task<ActionResult<List<object>>> GetSchedule([FromQuery] int pitchId, [FromQuery] DateTime date)
    {
        var dayStart = date.Date;
        var dayEnd = dayStart.AddDays(1);

        var slots = await db.Reservations
            .AsNoTracking()
            .Where(r => r.PitchId == pitchId
                     && r.Status != "Cancelled"
                     && r.StartTime < dayEnd
                     && r.EndTime > dayStart)
            .OrderBy(r => r.StartTime)
            .Select(r => new
            {
                r.Id,
                r.StartTime,
                r.EndTime
            })
            .ToListAsync();

        return Ok(slots);
    }

    [Authorize]
    [HttpGet]
    public async Task<ActionResult<List<ReservationResponse>>> GetMyOrAllReservations()
    {
        // Kullanıcı ID'sini istemciden (query/body) değil, imzalı JWT token içerisinden okuyoruz
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var isAdmin = User.IsInRole("Admin");

        var query = db.Reservations
            .AsNoTracking()
            .Include(r => r.Pitch)
            .Include(r => r.User)
            .AsQueryable();

        // Admin değilse kullanıcı sadece kendi rezervasyonlarını görebilir.
        if (!isAdmin)
            query = query.Where(r => r.UserId == userId);

        var list = await query
            .OrderByDescending(r => r.StartTime)
            .Select(r => new ReservationResponse(
                r.Id,
                r.PitchId,
                r.Pitch.Name,
                r.UserId,
                r.User.FullName,
                r.User.Phone,
                r.StartTime,
                r.EndTime,
                r.TotalPrice,
                r.Status
            ))
            .ToListAsync();

        return Ok(list);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<ReservationResponse>> Create(CreateReservationRequest request)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // Rezervasyonlarda sadece tam saat (13.00 gibi) kabul ediyoruz
        var start = new DateTime(
            request.StartTime.Year,
            request.StartTime.Month,
            request.StartTime.Day,
            request.StartTime.Hour, 0, 0, DateTimeKind.Local);

        if (start <= DateTime.Now)
            return BadRequest(new { message = "Geçmiş bir tarih veya saate rezervasyon yapılamaz." });

        var end = start.AddHours(request.DurationHours);

        // Müsaitlik kontrolü ile INSERT arasında race condition olmaması için await kullanıyoruz.
        await using var transaction = await db.Database.BeginTransactionAsync();
        try
        {
            var pitch = await db.Pitches.FirstOrDefaultAsync(p => p.Id == request.PitchId && p.IsActive);
            if (pitch is null)
                return NotFound(new { message = "Seçilen saha bulunamadı veya hizmet dışı." });

            // Status != "Cancelled": Hem Pending (onay bekleyen) hem Confirmed (onaylı) kayıtlar saati dolu gösterir.
            // Zaman Çakışması Engellemek İçin : (A_Start < B_End && A_End > B_Start)
            bool hasConflict = await db.Reservations.AnyAsync(r =>
                r.PitchId == request.PitchId &&
                r.Status != "Cancelled" &&
                r.StartTime < end &&
                r.EndTime > start);

            if (hasConflict)
                return Conflict(new { message = "Seçilen saat aralığında bu saha zaten rezerve edilmiş." });

            var reservation = new Reservation
            {
                PitchId = pitch.Id,
                UserId = userId,
                StartTime = start,
                EndTime = end,
                TotalPrice = pitch.HourlyPrice * request.DurationHours,
                Status = "Pending" // Talep ilk başta onaya düşer, admin onayladıktan sonra onaylandı olarak gözükür.
            };

            db.Reservations.Add(reservation);
            await db.SaveChangesAsync();
            await transaction.CommitAsync();

            var user = await db.Users.AsNoTracking().FirstAsync(u => u.Id == userId);

            return Ok(new ReservationResponse(
                reservation.Id,
                pitch.Id,
                pitch.Name,
                user.Id,
                user.FullName,
                user.Phone,
                reservation.StartTime,
                reservation.EndTime,
                reservation.TotalPrice,
                reservation.Status
            ));
        }
        catch
        {
            await transaction.RollbackAsync(); // Herhangi bir hata olursa yarım kalan işlemi geri al.
            throw; // GlobalExceptionMiddleware hatayı yakalasın.
        }
    }

    // REST standardı PATCH kullanıyoruz, kısmi güncelleme -> sadece status güncelleniyor.
    [Authorize(Roles = "Admin")]
    [HttpPatch("{id:int}/approve")]
    public async Task<IActionResult> Approve(int id)
    {
        var reservation = await db.Reservations.FirstOrDefaultAsync(r => r.Id == id);
        if (reservation is null)
            return NotFound(new { message = "Rezervasyon bulunamadı." });

        // İptal edilmiş rezervasyonlar onaylanamaz.
        if (reservation.Status != "Pending")
            return BadRequest(new { message = "Yalnızca onay bekleyen rezervasyonlar onaylanabilir." });

        reservation.Status = "Confirmed";
        await db.SaveChangesAsync();

        return Ok(new { message = "Rezervasyon onaylandı." });
    }

    [Authorize]
    [HttpPatch("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var isAdmin = User.IsInRole("Admin");

        var reservation = await db.Reservations.FirstOrDefaultAsync(r => r.Id == id);
        if (reservation is null)
            return NotFound(new { message = "Rezervasyon bulunamadı." });
            
        // IDOR Koruması: Kullanıcı URL'deki {id} değerini değiştirip başkasının rezervasyonunu iptal edemez.
        if (!isAdmin && reservation.UserId != userId)
            return Forbid();

        if (!isAdmin && reservation.StartTime <= DateTime.Now.AddHours(2))
            return BadRequest(new {message = "Maç saatine 2 saatten az kaldığı için rezervasyon iptal edilemez."});

        if (reservation.Status == "Cancelled")
            return BadRequest(new { message = "Bu rezervasyon zaten iptal edilmiş." });

        reservation.Status = "Cancelled";
        await db.SaveChangesAsync();

        return Ok(new { message = "Rezervasyon iptal edildi." });
    }
}