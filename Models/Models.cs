namespace quiz_app_2.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public bool IsAdmin { get; set; }
        public int ApiCallsConsumed { get; set; }
        public int ApiCallsLimit { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class Category
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class Quiz
    {
        public int Id { get; set; }
        public int CategoryId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool Autoplay { get; set; }
    }

    public class Question
    {
        public int Id { get; set; }
        public int QuizId { get; set; }
        public string Text { get; set; } = string.Empty;
        public string QuestionType { get; set; } = "multiple_choice"; // "multiple_choice" | "true_false"
        public string? MediaUrl { get; set; }
        public string? MediaType { get; set; } // "image" | "audio" | "video" | "gif" | null
        public int DisplayOrder { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class Answer
    {
        public int Id { get; set; }
        public int QuestionId { get; set; }
        public string Text { get; set; } = string.Empty;
        public bool IsCorrect { get; set; }
        public int DisplayOrder { get; set; }
    }
}