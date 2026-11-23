# OrgSystem — Halısaha Rezervasyon & Yönetim Sistemi

Çok rollü (Admin & Müşteri), çift rezervasyon (double booking) korumalı, uçtan uca halısaha kiralama ve tesis yönetim uygulaması.

## Özellikler

- **Kimlik Doğrulama & Yetkilendirme (JWT & RBAC):** Stateless JWT tabanlı oturum yönetimi ve `Admin` / `Customer` rol bazlı erişim kontrolü.
- **Çift Rezervasyon Önleme (Concurrency Control):** Aynı saha ve saat aralığı için `Transaction` bloğu içerisinde zaman kesişim (`StartTime < end && EndTime > start`) kontrolü ve veritabanı seviyesinde bileşik indeks (`Composite Index`).
- **Kriptografik Parola Güvenliği:** 16-byte rastgele Salt + 100.000 iterasyonlu `PBKDF2-SHA256` hashleme ve Timing Attack korumalı `FixedTimeEquals` doğrulaması.
- **Veri Bütünlüğü & Soft Delete:** Geçmiş finansal ve rezervasyon kayıtlarının kaybolmaması için `DeleteBehavior.Restrict` yabancı anahtar kısıtları ve fiziksel silme yerine durum tabanlı pasife çekme (`IsActive = false`, `Status = Cancelled`).
- **İnteraktif Doluluk Takvimi:** Müşteriler için saha ve tarih bazlı canlı saat slotu görüntüleme, yöneticiler için talep onaylama/iptal etme ve yeni saha ekleme paneli.

---

## Teknoloji Yığını

| Katman | Teknoloji |
| :--- | :--- |
| **Backend** | .NET 10 Web API, C#, Entity Framework Core |
| **Veritabanı** | SQLite |
| **Güvenlik** | JWT Bearer Authentication, PBKDF2-SHA256, DTO (Over-posting koruması), Global Exception Middleware |
| **Frontend** | React, TypeScript, Vite |

---

## Proje Yapısı

```text
├── OrgSystem.Api/                  # .NET 10 Web API
│   ├── Controllers/                # Auth, Pitches, Reservations uç noktaları
│   ├── Data/                       # AppDbContext, ilişkiler ve indeks konfigürasyonları
│   ├── DTOs/                       # Request & Response veri transfer modelleri
│   ├── Entities/                   # User, Pitch, Reservation veritabanı varlıkları
│   ├── Middleware/                 # GlobalExceptionMiddleware
│   ├── Services/                   # JwtTokenService, PasswordHasher
│   └── Program.cs                  # DI, CORS, Auth pipeline ve Seed Data
│
└── org-client/                     # React + TypeScript Frontend
    └── src/
        ├── components/             # AuthScreen, BookingDashboard, AdminPanel
        ├── api.ts                  # Merkezi fetch istemcisi & Bearer token yönetimi
        ├── AuthContext.tsx         # Oturum state yönetimi
        └── types.ts                # TypeScript arayüzleri ve Union tipleri
```

---

## Kurulum ve Çalıştırma

### Gereksinimler
- [.NET 10 SDK](https://dotnet.microsoft.com/)
- [Node.js (v18+)](https://nodejs.org/)

### 1. Backend'i Ayağa Kaldırma

```bash
cd OrgSystem.Api
dotnet restore
dotnet run --urls "http://localhost:5000"
```

*Not: Uygulama ilk kez çalıştırıldığında SQLite veritabanı otomatik oluşturulur ve örnek saha/kullanıcı verileri (Seed Data) yüklenir.*

### 2. Frontend'i Ayağa Kaldırma

Yeni bir terminal açarak:

```bash
cd org-client
npm install
npm run dev
```

Tarayıcıda `http://localhost:5173` adresine giderek uygulamayı kullanabilirsiniz.

---

## Varsayılan Test Hesapları

| Rol | E-posta | Parola |
| :--- | :--- | :--- |
| **Admin** | `admin@halisaha.com` | `Admin123!` |
| **Müşteri** | `ahmet@halisaha.com` | `User123!` |

*(Not: Parolalar veritabanında hashlenmiş olarak saklanır; kendi `Program.cs` dosyanızdaki seed parolalarına göre bu tabloyu güncelleyebilirsiniz.)*

---

## Temel API Uç Noktaları

| Metot | Uç Nokta | Yetki | Açıklama |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Herkese Açık | Yeni müşteri kaydı oluşturur |
| `POST` | `/api/auth/login` | Herkese Açık | Giriş yapar ve JWT döner |
| `GET` | `/api/pitches` | Giriş Yapmış | Aktif sahaları listeler |
| `POST` | `/api/pitches` | `Admin` | Yeni halısaha tanımlar |
| `PUT` | `/api/pitches/{id}` | `Admin` | Saha bilgilerini günceller |
| `DELETE` | `/api/pitches/{id}` | `Admin` | Sahayı pasife çeker (Soft Delete) |
| `GET` | `/api/reservations` | Giriş Yapmış | Müşterinin kendi rezervasyonlarını, Admin'in tüm kayıtları döner |
| `POST` | `/api/reservations` | Giriş Yapmış | Çakışma kontrolü yaparak yeni rezervasyon talebi oluşturur |
| `PATCH` | `/api/reservations/{id}/approve` | `Admin` | Bekleyen rezervasyonu onaylar (`Confirmed`) |
| `PATCH` | `/api/reservations/{id}/cancel` | Sahibi / `Admin` | Rezervasyonu iptal eder (`Cancelled`) |
