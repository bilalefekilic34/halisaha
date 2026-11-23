using System.Security.Cryptography;

namespace OrgSystem.Api.Services;

public static class PasswordHasher
{
    private const int SaltSize = 16; // Hash salting için
    private const int KeySize = 32; // 256 bit çıktı
    private const int Iterations = 100_000; // Brute force yavaşlatmak için

    public static (string Hash, string Salt) HashPassword(string password)
    {
        byte[] saltBytes = RandomNumberGenerator.GetBytes(SaltSize);
        byte[] hashBytes = Rfc2898DeriveBytes.Pbkdf2(
            password, saltBytes, Iterations, HashAlgorithmName.SHA256, KeySize);

        return (Convert.ToBase64String(hashBytes), Convert.ToBase64String(saltBytes));
    }

    public static bool Verify(string password, string storedHash, string storedSalt)
    {
        byte[] saltBytes = Convert.FromBase64String(storedSalt);
        byte[] expectedHash = Convert.FromBase64String(storedHash); // Gelmesi gereken hash
        byte[] actualHash = Rfc2898DeriveBytes.Pbkdf2(
            password, saltBytes, Iterations, HashAlgorithmName.SHA256, KeySize); // Gelen hash
        
        // Normal "==" ilk hatalı byte'ta false döner, timing attack açığı. Bunu çözmek için FixedTimeEquals, tüm byte'ları sabit sürede karşılaştırır. 
        return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash); 
    }
}