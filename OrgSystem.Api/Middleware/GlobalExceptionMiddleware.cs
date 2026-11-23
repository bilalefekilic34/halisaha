using System.Net;
using System.Text.Json;

namespace OrgSystem.Api.Middleware;

// RequestDelegate bir sonraki adımı (middleware veya controller) temsil eder.
public class GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            // İsteği sonraki katmana devret. Herhangi bir yerde yakalanan hata buraya düşer.
            await next(context);
        }
        catch (Exception ex)
        {
            // Hatayı server'a detaylı yazar ama dış dünyaya StackTrace verme.
            // StackTrace: Bir program hata verdiğinde fonksiyonların çalışma sırasını gösteren rapor, genelde sondan başa doğru. 
            logger.LogError(ex, "Beklenmeyen sunucu hatası: {Message}", ex.Message);
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

            var payload = JsonSerializer.Serialize(new
            {
                status = 500,
                message = "Sunucu tarafında beklenmeyen bir hata oluştu."
            });

            await context.Response.WriteAsync(payload);
        }
    }
}