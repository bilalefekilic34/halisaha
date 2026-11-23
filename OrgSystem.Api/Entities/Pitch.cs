namespace OrgSystem.Api.Entities;

public class Pitch{
    public int Id {get; set;}
    public string Name {get; set;} = string.Empty;
    public string SurfaceType {get; set;} = "Suni Çim"; // Suni Çim, Hibrit, vs.
    public decimal HourlyPrice {get; set;}
    public bool IsActive {get; set;} = true;
    public DateTime CreatedAt {get; set;} = DateTime.UtcNow;

    public ICollection<Reservation> Reservations {get; set;} = [];
}