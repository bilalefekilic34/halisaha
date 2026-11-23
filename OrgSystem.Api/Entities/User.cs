namespace OrgSystem.Api.Entities;

public class User{
    public int Id {get; set;}
    public string FullName {get; set;} = string.Empty;
    public string Email {get; set;} = string.Empty;
    public string PasswordHash {get; set;} = string.Empty;
    public string Phone {get; set;} = string.Empty;
    public string PasswordSalt {get; set;} = string.Empty;
    public string Role {get; set;} = "Participant"; // Participant or Organizer
    public DateTime CreatedAt {get; set;} = DateTime.UtcNow;

    public ICollection<Reservation> Reservations { get; set; } = [];
}