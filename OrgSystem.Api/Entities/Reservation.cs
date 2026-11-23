namespace OrgSystem.Api.Entities;

public class Reservation{
    public int Id { get; set; }

    public int PitchId { get; set; }
    public Pitch Pitch { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime StartTime { get; set; }                 // Örn: 2026-11-20 21:00
    public DateTime EndTime { get; set; }                   // Örn: 2026-11-20 22:00
    public decimal TotalPrice { get; set; }
    public string Status { get; set; } = "Pending";       // "Confirmed", "Pending" veya "Cancelled"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}