using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using quiz_app_2.Services;

namespace quiz_app_2.Controllers
{
    [ApiController]
    [Authorize]
    public class AdminController : ControllerBase
    {
        private readonly DatabaseService _db;

        public AdminController(DatabaseService db)
        {
            _db = db;
        }

        private bool IsAdmin()
        {
            var claim = User.Claims.FirstOrDefault(c => c.Type == "isAdmin");
            return claim?.Value == "true";
        }

        // ==================
        // USERS
        // ==================

        [HttpGet("/admin/users")]
        public async Task<IActionResult> GetUsers()
        {
            if (!IsAdmin()) return Forbid();
            var users = await _db.GetAllUsersAsync();
            return Ok(users);
        }

        [HttpDelete("/admin/delete-user/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            if (!IsAdmin()) return Forbid();
            await _db.DeleteUserAsync(id);
            return Ok(new { success = true });
        }

        // ==================
        // CATEGORIES
        // ==================

        [HttpPost("/admin/categories")]
        public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest req)
        {
            if (!IsAdmin()) return Forbid();
            if (string.IsNullOrWhiteSpace(req.Name))
                return BadRequest(new { error = "Name is required" });

            var id = await _db.CreateCategoryAsync(req.Name, req.ImageUrl);
            return Ok(new { success = true, id });
        }

        [HttpDelete("/admin/categories/{id}")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            if (!IsAdmin()) return Forbid();
            await _db.DeleteCategoryAsync(id);
            return Ok(new { success = true });
        }

        // ==================
        // QUIZZES
        // ==================

        [HttpPost("/admin/quizzes")]
        public async Task<IActionResult> CreateQuiz([FromBody] CreateQuizRequest req)
        {
            if (!IsAdmin()) return Forbid();
            if (string.IsNullOrWhiteSpace(req.Title))
                return BadRequest(new { error = "Title is required" });

            var id = await _db.CreateQuizAsync(req.CategoryId, req.Title, req.Description, req.Autoplay);
            return Ok(new { success = true, id });
        }

        [HttpGet("/admin/quizzes")]
        public async Task<IActionResult> GetQuizzes()
        {
            if (!IsAdmin()) return Forbid();
            var quizzes = await _db.GetAllQuizzesAsync();
            return Ok(quizzes);
        }

        [HttpGet("/admin/quizzes/{id}/questions")]
        public async Task<IActionResult> GetQuizQuestions(int id)
        {
            if (!IsAdmin()) return Forbid();
            var questions = await _db.GetQuestionsByQuizIdAsync(id);
            var result = new List<object>();
            foreach (var q in questions)
            {
                var answers = await _db.GetAnswersByQuestionIdAsync(q.Id);
                result.Add(new { question = q, answers });
            }
            return Ok(result);
        }

        [HttpDelete("/admin/quizzes/{id}")]
        public async Task<IActionResult> DeleteQuiz(int id)
        {
            if (!IsAdmin()) return Forbid();
            await _db.DeleteQuizAsync(id);
            return Ok(new { success = true });
        }

        [HttpPatch("/admin/quizzes/{id}")]
        public async Task<IActionResult> UpdateQuiz(int id, [FromBody] UpdateQuizRequest req)
        {
            if (!IsAdmin()) return Forbid();
            if (string.IsNullOrWhiteSpace(req.Title))
                return BadRequest(new { error = "Title is required" });

            await _db.UpdateQuizAsync(id, req.CategoryId, req.Title, req.Description);
            return Ok(new { success = true });
        }

        // ==================
        // QUESTIONS
        // ==================

        [HttpPost("/admin/questions")]
        public async Task<IActionResult> CreateQuestion([FromBody] CreateQuestionRequest req)
        {
            if (!IsAdmin()) return Forbid();
            if (string.IsNullOrWhiteSpace(req.Text))
                return BadRequest(new { error = "Question text is required" });

            var questionId = await _db.CreateQuestionAsync(
            req.QuizId, req.Text, req.QuestionType, req.MediaUrl, req.MediaType, req.DisplayOrder);

            foreach (var answer in req.Answers)
            {
                await _db.CreateAnswerAsync(questionId, answer.Text, answer.IsCorrect);
            }

            return Ok(new { success = true, id = questionId });
        }

        [HttpDelete("/admin/questions/{id}")]
        public async Task<IActionResult> DeleteQuestion(int id)
        {
            if (!IsAdmin()) return Forbid();
            await _db.DeleteQuestionAsync(id);
            return Ok(new { success = true });
        }




    }

    public record CreateCategoryRequest(string Name, string? ImageUrl);
    public record CreateQuizRequest(int CategoryId, string Title, string? Description, bool Autoplay);
    public record UpdateQuizRequest(int CategoryId, string Title, string? Description);
    public record CreateQuestionRequest(
    int QuizId,
    string Text,
    string QuestionType,
    string? MediaUrl,
    string? MediaType,
    int DisplayOrder,
    List<AnswerInput> Answers);
    public record AnswerInput(string Text, bool IsCorrect);
}