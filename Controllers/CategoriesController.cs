using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using quiz_app_2.Services;

namespace quiz_app_2.Controllers
{
    [ApiController]
    [Authorize]
    public class CategoriesController : ControllerBase
    {
        private readonly DatabaseService _db;

        public CategoriesController(DatabaseService db)
        {
            _db = db;
        }

        [HttpGet("/categories")]
        public async Task<IActionResult> GetAll()
        {
            var categories = await _db.GetAllCategoriesAsync();
            return Ok(categories);
        }

        [HttpGet("/categories/{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var category = await _db.GetCategoryByIdAsync(id);
            if (category == null) return NotFound(new { error = "Category not found" });

            var quizzes = await _db.GetAllQuizzesAsync();
            var filtered = quizzes.Where(q => q.CategoryId == id).ToList();

            return Ok(filtered);
        }
    }
}