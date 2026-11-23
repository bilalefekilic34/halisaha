using Microsoft.EntityFrameworkCore;
using OrgSystem.Api.Entities;

namespace OrgSystem.Api.Data;

// Constructor
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    
    public DbSet<User> Users => Set<User>();
    public DbSet<Pitch> Pitches => Set<Pitch>();
    public DbSet<Reservation> Reservations => Set<Reservation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            // Aynı email ile birden fazla hesap açılmasını engellemek için email de unique oldu.
            // Ayrıca login sorgularını hızlandırır.
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Email).IsRequired().HasMaxLength(128);
            e.Property(u => u.FullName).IsRequired().HasMaxLength(100);
            e.Property(u => u.Phone).IsRequired().HasMaxLength(20);
            e.Property(u => u.Role).IsRequired().HasMaxLength(32);
        });

        modelBuilder.Entity<Pitch>(e =>
        {
            e.Property(p => p.Name).IsRequired().HasMaxLength(100);
            e.Property(p => p.SurfaceType).IsRequired().HasMaxLength(50);
            e.Property(p => p.HourlyPrice).HasPrecision(10, 2); // Para birimlerinde yuvarlama hatası olmaması için
        });

        modelBuilder.Entity<Reservation>(e =>
        {
            // En sık sorgulanacak olan "bu saat dolu mu" sorusuna hızlı cevap almak için bu üçlüye indeks atıyoruz.
            e.HasIndex(r => new { r.PitchId, r.StartTime, r.EndTime });
            e.Property(r => r.TotalPrice).HasPrecision(10, 2);
            e.Property(r => r.Status).IsRequired().HasMaxLength(32);

            // DeleteBehavior.Restrict'in buradaki önemi bir saha veya kullanıcı silinirse geçmiş rezervasyonların
            // silinmemesi için veritabanı seviyesinde silmeyi kısıtlaması.
            e.HasOne(r => r.Pitch)
                .WithMany(p => p.Reservations)
                .HasForeignKey(r => r.PitchId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(r => r.User)
                .WithMany(u => u.Reservations)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}