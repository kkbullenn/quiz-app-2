using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using quiz_app_2.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace quiz_app_2.Controllers
{
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly DatabaseService _db;
        private readonly IConfiguration _config;

        public AuthController(DatabaseService db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        private string GenerateToken(int userId, string email, bool isAdmin)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var claims = new[]
            {
                new Claim("userId", userId.ToString()),
                new Claim("email", email),
                new Claim("isAdmin", isAdmin.ToString().ToLower())
            };
            var token = new JwtSecurityToken(claims: claims, expires: DateTime.UtcNow.AddDays(7), signingCredentials: creds);
            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        [HttpPost("/register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
                return BadRequest(new { error = "Email and password are required" });

            if (req.Password.Length < 6)
                return BadRequest(new { error = "Password must be at least 6 characters" });

            var existing = await _db.GetUserByEmailAsync(req.Email);
            if (existing != null)
                return Conflict(new { error = "An account with that email already exists" });

            var hash = BCrypt.Net.BCrypt.HashPassword(req.Password);
            var userId = await _db.CreateUserAsync(req.Email, hash);
            var token = GenerateToken(userId, req.Email, false);

            return Ok(new { success = true, token, isAdmin = false });
        }

        [HttpPost("/login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
                return BadRequest(new { error = "Email and password are required" });

            var user = await _db.GetUserByEmailAsync(req.Email);
            if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
                return Unauthorized(new { error = "Invalid email or password" });

            var token = GenerateToken(user.Id, user.Email, user.IsAdmin);
            return Ok(new { success = true, token, isAdmin = user.IsAdmin });
        }

        [Authorize]
        [HttpGet("/me")]
        public async Task<IActionResult> Me()
        {
            var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "userId")?.Value;
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized(new { error = "Invalid token" });

            var user = await _db.GetUserByIdAsync(userId);
            if (user == null) return NotFound(new { error = "User not found" });

            return Ok(new
            {
                id = user.Id,
                email = user.Email,
                apiCallsConsumed = user.ApiCallsConsumed,
                apiCallsLimit = user.ApiCallsLimit,
                isAdmin = user.IsAdmin
            });
        }
    }

    public record RegisterRequest(string Email, string Password);
    public record LoginRequest(string Email, string Password);
}