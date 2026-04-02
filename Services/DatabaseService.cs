using Microsoft.Data.SqlClient;
using quiz_app_2.Models;

namespace quiz_app_2.Services
{
    public class DatabaseService
    {
        private readonly string _connectionString;

        public DatabaseService(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("Default")!;
        }

        private SqlConnection GetConnection() => new SqlConnection(_connectionString);

        // ==================
        // USERS
        // ==================

        public async Task<User?> GetUserByEmailAsync(string email)
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            var cmd = new SqlCommand(
                "SELECT id, email, password_hash, is_admin, api_calls_consumed, api_calls_limit, created_at FROM users WHERE email = @Email",
                conn);
            cmd.Parameters.AddWithValue("@Email", email);
            using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;
            return new User
            {
                Id = reader.GetInt32(0),
                Email = reader.GetString(1),
                PasswordHash = reader.GetString(2),
                IsAdmin = reader.GetBoolean(3),
                ApiCallsConsumed = reader.GetInt32(4),
                ApiCallsLimit = reader.GetInt32(5),
                CreatedAt = reader.GetDateTime(6)
            };
        }

        public async Task<User?> GetUserByIdAsync(int id)
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            var cmd = new SqlCommand(
                "SELECT id, email, password_hash, is_admin, api_calls_consumed, api_calls_limit, created_at FROM users WHERE id = @Id",
                conn);
            cmd.Parameters.AddWithValue("@Id", id);
            using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;
            return new User
            {
                Id = reader.GetInt32(0),
                Email = reader.GetString(1),
                PasswordHash = reader.GetString(2),
                IsAdmin = reader.GetBoolean(3),
                ApiCallsConsumed = reader.GetInt32(4),
                ApiCallsLimit = reader.GetInt32(5),
                CreatedAt = reader.GetDateTime(6)
            };
        }

        public async Task<int> CreateUserAsync(string email, string passwordHash)
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            var cmd = new SqlCommand(
                "INSERT INTO users (email, password_hash, is_admin) OUTPUT INSERTED.id VALUES (@Email, @Hash, 0)",
                conn);
            cmd.Parameters.AddWithValue("@Email", email);
            cmd.Parameters.AddWithValue("@Hash", passwordHash);
            return (int)(await cmd.ExecuteScalarAsync())!;
        }

        public async Task<List<User>> GetAllUsersAsync()
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            var cmd = new SqlCommand(
                "SELECT id, email, password_hash, is_admin, api_calls_consumed, api_calls_limit, created_at FROM users",
                conn);
            using var reader = await cmd.ExecuteReaderAsync();
            var users = new List<User>();
            while (await reader.ReadAsync())
            {
                users.Add(new User
                {
                    Id = reader.GetInt32(0),
                    Email = reader.GetString(1),
                    PasswordHash = reader.GetString(2),
                    IsAdmin = reader.GetBoolean(3),
                    ApiCallsConsumed = reader.GetInt32(4),
                    ApiCallsLimit = reader.GetInt32(5),
                    CreatedAt = reader.GetDateTime(6)
                });
            }
            return users;
        }

        public async Task DeleteUserAsync(int id)
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            var cmd = new SqlCommand("DELETE FROM users WHERE id = @Id", conn);
            cmd.Parameters.AddWithValue("@Id", id);
            await cmd.ExecuteNonQueryAsync();
        }

        // ==================
        // CATEGORIES
        // ==================

        public async Task<List<Category>> GetAllCategoriesAsync()
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            var cmd = new SqlCommand("SELECT id, name, description FROM categories", conn);
            using var reader = await cmd.ExecuteReaderAsync();
            var categories = new List<Category>();
            while (await reader.ReadAsync())
            {
                categories.Add(new Category
                {
                    Id = reader.GetInt32(0),
                    Name = reader.GetString(1),
                    Description = reader.IsDBNull(2) ? null : reader.GetString(2)
                });
            }
            return categories;
        }

        public async Task<Category?> GetCategoryByIdAsync(int id)
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            var cmd = new SqlCommand("SELECT id, name, description FROM categories WHERE id = @Id", conn);
            cmd.Parameters.AddWithValue("@Id", id);
            using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;
            return new Category
            {
                Id = reader.GetInt32(0),
                Name = reader.GetString(1),
                Description = reader.IsDBNull(2) ? null : reader.GetString(2)
            };
        }

        public async Task<int> CreateCategoryAsync(string name, string? description)
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            var cmd = new SqlCommand(
                "INSERT INTO categories (name, description) OUTPUT INSERTED.id VALUES (@Name, @Description)",
                conn);
            cmd.Parameters.AddWithValue("@Name", name);
            cmd.Parameters.AddWithValue("@Description", (object?)description ?? DBNull.Value);
            return (int)(await cmd.ExecuteScalarAsync())!;
        }

        public async Task DeleteCategoryAsync(int id)
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            var cmd = new SqlCommand("DELETE FROM categories WHERE id = @Id", conn);
            cmd.Parameters.AddWithValue("@Id", id);
            await cmd.ExecuteNonQueryAsync();
        }

        // ==================
        // QUIZZES
        // ==================

        public async Task<List<Quiz>> GetAllQuizzesAsync()
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            var cmd = new SqlCommand("SELECT id, category_id, title, description, autoplay FROM quizzes", conn);
            using var reader = await cmd.ExecuteReaderAsync();
            var quizzes = new List<Quiz>();
            while (await reader.ReadAsync())
            {
                quizzes.Add(new Quiz
                {
                    Id = reader.GetInt32(0),
                    CategoryId = reader.GetInt32(1),
                    Title = reader.GetString(2),
                    Description = reader.IsDBNull(3) ? null : reader.GetString(3),
                    Autoplay = reader.GetBoolean(4)
                });
            }
            return quizzes;
        }

        public async Task<Quiz?> GetQuizByIdAsync(int id)
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            var cmd = new SqlCommand("SELECT id, category_id, title, description, autoplay FROM quizzes WHERE id = @Id", conn);
            cmd.Parameters.AddWithValue("@Id", id);
            using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;
            return new Quiz
            {
                Id = reader.GetInt32(0),
                CategoryId = reader.GetInt32(1),
                Title = reader.GetString(2),
                Description = reader.IsDBNull(3) ? null : reader.GetString(3),
                Autoplay = reader.GetBoolean(4)
            };
        }

        public async Task<List<Quiz>> GetAutoplayQuizzesAsync()
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            var cmd = new SqlCommand("SELECT id, category_id, title, description, autoplay FROM quizzes WHERE autoplay = 1", conn);
            using var reader = await cmd.ExecuteReaderAsync();
            var quizzes = new List<Quiz>();
            while (await reader.ReadAsync())
            {
                quizzes.Add(new Quiz
                {
                    Id = reader.GetInt32(0),
                    CategoryId = reader.GetInt32(1),
                    Title = reader.GetString(2),
                    Description = reader.IsDBNull(3) ? null : reader.GetString(3),
                    Autoplay = reader.GetBoolean(4)
                });
            }
            return quizzes;
        }

        public async Task<int> CreateQuizAsync(int categoryId, string title, string? description, bool autoplay)
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            var cmd = new SqlCommand(
                "INSERT INTO quizzes (category_id, title, description, autoplay) OUTPUT INSERTED.id VALUES (@CategoryId, @Title, @Description, @Autoplay)",
                conn);
            cmd.Parameters.AddWithValue("@CategoryId", categoryId);
            cmd.Parameters.AddWithValue("@Title", title);
            cmd.Parameters.AddWithValue("@Description", (object?)description ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@Autoplay", autoplay);
            return (int)(await cmd.ExecuteScalarAsync())!;
        }

        public async Task DeleteQuizAsync(int id)
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            var cmd = new SqlCommand("DELETE FROM quizzes WHERE id = @Id", conn);
            cmd.Parameters.AddWithValue("@Id", id);
            await cmd.ExecuteNonQueryAsync();
        }

        // ==================
        // QUESTIONS & ANSWERS
        // ==================

        public async Task<List<Question>> GetQuestionsByQuizIdAsync(int quizId)
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            var cmd = new SqlCommand(
                "SELECT id, quiz_id, question_text, question_type, media_url, media_type, display_order, created_at FROM questions WHERE quiz_id = @QuizId ORDER BY display_order",
                conn);
            cmd.Parameters.AddWithValue("@QuizId", quizId);
            using var reader = await cmd.ExecuteReaderAsync();
            var questions = new List<Question>();
            while (await reader.ReadAsync())
            {
                questions.Add(new Question
                {
                    Id = reader.GetInt32(0),
                    QuizId = reader.GetInt32(1),
                    Text = reader.GetString(2),
                    QuestionType = reader.GetString(3),
                    MediaUrl = reader.IsDBNull(4) ? null : reader.GetString(4),
                    MediaType = reader.IsDBNull(5) ? null : reader.GetString(5),
                    DisplayOrder = reader.GetInt32(6),
                    CreatedAt = reader.GetDateTime(7)
                });
            }
            return questions;
        }

        public async Task<List<Answer>> GetAnswersByQuestionIdAsync(int questionId)
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            var cmd = new SqlCommand(
                "SELECT id, question_id, answer_text, is_correct, display_order FROM answers WHERE question_id = @QuestionId ORDER BY display_order",
                conn);
            cmd.Parameters.AddWithValue("@QuestionId", questionId);
            using var reader = await cmd.ExecuteReaderAsync();
            var answers = new List<Answer>();
            while (await reader.ReadAsync())
            {
                answers.Add(new Answer
                {
                    Id = reader.GetInt32(0),
                    QuestionId = reader.GetInt32(1),
                    Text = reader.GetString(2),
                    IsCorrect = reader.GetBoolean(3),
                    DisplayOrder = reader.GetInt32(4)
                });
            }
            return answers;
        }

        public async Task<int> CreateQuestionAsync(int quizId, string text, string questionType, string? mediaUrl, string? mediaType, int displayOrder)
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            var cmd = new SqlCommand(
                "INSERT INTO questions (quiz_id, question_text, question_type, media_url, media_type, display_order) OUTPUT INSERTED.id VALUES (@QuizId, @Text, @QuestionType, @MediaUrl, @MediaType, @DisplayOrder)",
                conn);
            cmd.Parameters.AddWithValue("@QuizId", quizId);
            cmd.Parameters.AddWithValue("@Text", text);
            cmd.Parameters.AddWithValue("@QuestionType", questionType);
            cmd.Parameters.AddWithValue("@MediaUrl", (object?)mediaUrl ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@MediaType", (object?)mediaType ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@DisplayOrder", displayOrder);
            return (int)(await cmd.ExecuteScalarAsync())!;
        }

        public async Task<int> CreateAnswerAsync(int questionId, string text, bool isCorrect, int displayOrder = 0)
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            var cmd = new SqlCommand(
                "INSERT INTO answers (question_id, answer_text, is_correct, display_order) OUTPUT INSERTED.id VALUES (@QuestionId, @Text, @IsCorrect, @DisplayOrder)",
                conn);
            cmd.Parameters.AddWithValue("@QuestionId", questionId);
            cmd.Parameters.AddWithValue("@Text", text);
            cmd.Parameters.AddWithValue("@IsCorrect", isCorrect);
            cmd.Parameters.AddWithValue("@DisplayOrder", displayOrder);
            return (int)(await cmd.ExecuteScalarAsync())!;
        }

        public async Task<bool> CheckAnswerAsync(int answerId)
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            var cmd = new SqlCommand("SELECT is_correct FROM answers WHERE id = @Id", conn);
            cmd.Parameters.AddWithValue("@Id", answerId);
            var result = await cmd.ExecuteScalarAsync();
            return result is true;
        }

        public async Task DeleteQuestionAsync(int id)
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            var cmd = new SqlCommand("DELETE FROM questions WHERE id = @Id", conn);
            cmd.Parameters.AddWithValue("@Id", id);
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task<List<Quiz>> GetQuizzesByCategoryAsync(int categoryId)
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            var cmd = new SqlCommand(
                "SELECT id, category_id, title, description, autoplay FROM quizzes WHERE category_id = @CategoryId",
                conn);
            cmd.Parameters.AddWithValue("@CategoryId", categoryId);
            using var reader = await cmd.ExecuteReaderAsync();
            var quizzes = new List<Quiz>();
            while (await reader.ReadAsync())
            {
                quizzes.Add(new Quiz
                {
                    Id = reader.GetInt32(0),
                    CategoryId = reader.GetInt32(1),
                    Title = reader.GetString(2),
                    Description = reader.IsDBNull(3) ? null : reader.GetString(3),
                    Autoplay = reader.GetBoolean(4)
                });
            }
            return quizzes;
        }

        public async Task UpdateQuizAsync(int id, int categoryId, string title, string? description)
        {
            using var conn = GetConnection();
            await conn.OpenAsync();
            var cmd = new SqlCommand(
                "UPDATE quizzes SET category_id = @CategoryId, title = @Title, description = @Description WHERE id = @Id",
                conn);
            cmd.Parameters.AddWithValue("@CategoryId", categoryId);
            cmd.Parameters.AddWithValue("@Title", title);
            cmd.Parameters.AddWithValue("@Description", (object?)description ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@Id", id);
            await cmd.ExecuteNonQueryAsync();
        }
    }
}