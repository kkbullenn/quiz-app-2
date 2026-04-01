using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using quiz_app_2.Services;

namespace quiz_app_2.Controllers
{
    [ApiController]
    [Authorize]
    public class QuizzesController : ControllerBase
    {
        private readonly DatabaseService _db;

        public QuizzesController(DatabaseService db)
        {
            _db = db;
        }

        [HttpGet("/quizzes")]
        public async Task<IActionResult> GetAll()
        {
            var quizzes = await _db.GetAllQuizzesAsync();
            return Ok(quizzes);
        }

        [HttpGet("/quizzes/autoplay")]
        public async Task<IActionResult> GetAutoplay()
        {
            var quizzes = await _db.GetAutoplayQuizzesAsync();
            return Ok(quizzes);
        }

        [HttpGet("/quizzes/{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var quiz = await _db.GetQuizByIdAsync(id);
            if (quiz == null) return NotFound(new { error = "Quiz not found" });
            return Ok(quiz);
        }

        [HttpGet("/quizzes/{id}/questions")]
        public async Task<IActionResult> GetQuestions(int id)
        {
            var quiz = await _db.GetQuizByIdAsync(id);
            if (quiz == null) return NotFound(new { error = "Quiz not found" });

            var questions = await _db.GetQuestionsByQuizIdAsync(id);

            var result = new List<object>();
            foreach (var q in questions)
            {
                var answers = await _db.GetAnswersByQuestionIdAsync(q.Id);
                result.Add(new { question = q, answers });
            }

            return Ok(result);
        }

        [HttpPost("/questions/{id}/answer")]
        public async Task<IActionResult> SubmitAnswer(int id)
        {
            var isCorrect = await _db.CheckAnswerAsync(id);
            return Ok(new { isCorrect });
        }
    }
}