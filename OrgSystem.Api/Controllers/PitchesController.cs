using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OrgSystem.Api.Data;
using OrgSystem.Api.DTOs;
using OrgSystem.Api.Entities;

namespace OrgSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PitchesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<PitchResponse>>> GetAll([FromQuery] bool includeInactive = false)
    {
        var query = db.Pitches.AsNoTracking();

        // Sadece aktif sahaların gözükmesi için
        if (!includeInactive)
            query = query.Where(p => p.IsActive);

        // Projection (Select): Veritabanından tüm kolonları değil, sadece DTO için gereken alanları çekiyoruz.
        var pitches = await query
            .OrderBy(p => p.Id)
            .Select(p => new PitchResponse(p.Id, p.Name, p.SurfaceType, p.HourlyPrice, p.IsActive))
            .ToListAsync();

        return Ok(pitches);
    }
    // RBAC: Token yoksa 401 Unauthorized, Token Customer rolündeyse 403 Forbidden döner.
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<PitchResponse>> Create(CreatePitchRequest request)
    {
        var pitch = new Pitch
        {
            Name = request.Name.Trim(),
            SurfaceType = request.SurfaceType.Trim(),
            HourlyPrice = request.HourlyPrice,
            IsActive = true
        };

        db.Pitches.Add(pitch);
        await db.SaveChangesAsync();

        var response = new PitchResponse(pitch.Id, pitch.Name, pitch.SurfaceType, pitch.HourlyPrice, pitch.IsActive);
        return CreatedAtAction(nameof(GetAll), new { id = pitch.Id }, response);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")] // Kaydın tamamı güncellendiği için HTTP PUT.
    public async Task<ActionResult<PitchResponse>> Update(int id, UpdatePitchRequest request)
    {
        var pitch = await db.Pitches.FindAsync(id);
        if (pitch is null)
            return NotFound(new { message = "Saha bulunamadı." });

        pitch.Name = request.Name.Trim();
        pitch.SurfaceType = request.SurfaceType.Trim();
        pitch.HourlyPrice = request.HourlyPrice;
        pitch.IsActive = request.IsActive;

        await db.SaveChangesAsync();

        return Ok(new PitchResponse(pitch.Id, pitch.Name, pitch.SurfaceType, pitch.HourlyPrice, pitch.IsActive));
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var pitch = await db.Pitches.FindAsync(id);
        if (pitch is null)
            return NotFound(new { message = "Saha bulunamadı." });

        // Geçmiş rezervasyonları bozmamak için pasife çekiyoruz.
        pitch.IsActive = false;
        await db.SaveChangesAsync();

        return NoContent(); // İşlem başarılı.
    }
}