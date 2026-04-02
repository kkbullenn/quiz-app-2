# CineQuiz

A movie trivia quiz web app built to support individual and moderated quiz modes with real-time WebSocket functionality.

## Tech Stack

- **Backend:** ASP.NET Core 10 Web API (C#)
- **Database:** SQL Server 2022 (Docker container)
- **Auth:** JWT (Bearer tokens), BCrypt password hashing
- **Frontend:** Vanilla JS, HTML, Tailwind CSS
- **Containerization:** Docker
- **CI/CD:** GitHub Actions

## Project Structure

```
quiz-app-2/
├── Controllers/
│   ├── AuthController.cs         # /register, /login
│   ├── AdminController.cs        # /admin/* (admin only)
│   ├── CategoriesController.cs   # /categories/*
│   └── QuizzesController.cs      # /quizzes/*
├── Models/
│   └── Models.cs                 # User, Category, Quiz, Question, Answer
├── Services/
│   └── DatabaseService.cs        # All SQL Server interactions
├── static/                       # Frontend static files
│   ├── js/
│   │   ├── client.js             # Auth, login, register, admin, categories
│   │   ├── edit.js               # Edit quiz page logic
│   │   ├── create.js             # Create quiz page logic
│   │   └── quizzes.js            # Quizzes list page logic
│   ├── admin.html
│   ├── categories.html
│   ├── create.html
│   ├── edit.html
│   ├── login.html
│   ├── register.html
│   ├── quizzes.html
│   ├── quiz.html
│   ├── question.html
│   └── styles.css
├── db/
│   ├── init.sql                  # Database schema + seed data
│   └── docker-compose.yml        # SQL Server container
├── .github/
│   └── workflows/
│       └── deploy.yml            # CI/CD pipeline
├── Program.cs
├── appsettings.json
├── Dockerfile
└── quiz-app-2.csproj
```

## Getting Started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Docker](https://www.docker.com/)
- SQL Server (via Docker — see below)

### 1. Clone the repo

```bash
git clone https://github.com/kkbullenn/quiz-app-2.git
cd quiz-app-2
git checkout dev
```

### 2. Start the SQL Server container

```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=your_password" \
  -p 1433:1433 --name quiz-db \
  -d mcr.microsoft.com/mssql/server:2022-latest
```

### 3. Initialize the database

```bash
sqlcmd -S localhost,1433 -U sa -P your_password -i db/init.sql
```

This creates the `quiz_app` database, all tables, and seeds an admin user and sample data.

### 4. Set up user secrets (local dev)

Never commit real credentials. Use .NET user secrets instead:

```bash
dotnet user-secrets set "Jwt:Secret" "your-jwt-secret-min-32-chars"
dotnet user-secrets set "ConnectionStrings:Default" "Server=localhost,1433;Database=quiz_app;User Id=sa;Password=your_password;Encrypt=false"
```

### 5. Run the app

```bash
dotnet run
```

Visit `http://localhost:5000/login.html`

### Seed Credentials

| Role  | Email           | Password   |
|-------|-----------------|------------|
| Admin | admin@quiz.com  | admin1234  |
| User  | user@quiz.com   | user1234   |

---

## Running with Docker

### Build the image

```bash
docker build -t quiz-app-2 .
```

### Run the container

```bash
docker run -d -p 8080:8080 \
  -e "Jwt__Secret=your-jwt-secret" \
  -e 'ConnectionStrings__Default=Server=your_server,1433;Database=quiz_app;User Id=sa;Password=your_password;Encrypt=false' \
  --name quiz-app \
  quiz-app-2
```

> Note: Use double underscores (`__`) in environment variable names to map to nested config keys (e.g. `Jwt__Secret` → `Jwt:Secret`).

Visit `http://localhost:8080/login.html`

---

## API Routes

### Auth
| Method | Route       | Description                        | Auth     |
|--------|-------------|------------------------------------|----------|
| POST   | `/register` | Register a new user                | None     |
| POST   | `/login`    | Login and receive a JWT            | None     |

### Categories
| Method | Route              | Description                              | Auth     |
|--------|--------------------|------------------------------------------|----------|
| GET    | `/categories`      | Get all quiz categories                  | Required |
| GET    | `/categories/{id}` | Get a single category with its quizzes   | Required |

### Quizzes
| Method | Route                       | Description                                  | Auth     |
|--------|-----------------------------|----------------------------------------------|----------|
| GET    | `/quizzes`                  | Get all quizzes                              | Required |
| GET    | `/quizzes/{id}`             | Get a single quiz                            | Required |
| GET    | `/quizzes/autoplay`         | Get quizzes flagged for auto-play mode       | Required |
| GET    | `/quizzes/{id}/questions`   | Get all questions and answers for a quiz     | Required |
| POST   | `/questions/{id}/answer`    | Submit an answer — returns whether correct   | Required |

### Admin
| Method | Route                            | Description                        | Auth     |
|--------|----------------------------------|------------------------------------|----------|
| GET    | `/admin/quizzes`                 | Get all quizzes                    | Admin    |
| GET    | `/admin/quizzes/{id}/questions`  | Get all questions for a quiz       | Admin    |
| POST   | `/admin/quizzes`                 | Create a new quiz                  | Admin    |
| PATCH  | `/admin/quizzes/{id}`            | Update a quiz                      | Admin    |
| DELETE | `/admin/quizzes/{id}`            | Delete a quiz                      | Admin    |
| POST   | `/admin/questions`               | Add a question with answers        | Admin    |
| DELETE | `/admin/questions/{id}`          | Delete a question                  | Admin    |
| POST   | `/admin/categories`              | Create a new category              | Admin    |
| DELETE | `/admin/categories/{id}`         | Delete a category                  | Admin    |
| GET    | `/admin/users`                   | Get all users                      | Admin    |
| DELETE | `/admin/delete-user/{id}`        | Delete a user                      | Admin    |

> All protected routes require the JWT in the `Authorization` header as `Bearer <token>`.

---

## Database Schema

| Table            | Description                                      |
|------------------|--------------------------------------------------|
| `users`          | Registered users with roles and API usage        |
| `categories`     | Quiz categories (e.g. Horror, Action)            |
| `quizzes`        | Quizzes belonging to categories                  |
| `questions`      | Questions belonging to quizzes, with media support |
| `answers`        | Answer options for each question                 |
| `quiz_attempts`  | Summary of a user's quiz attempt                 |
| `attempt_answers`| Per-question answer detail for each attempt      |

---

## CI/CD

Every push to `main` triggers a GitHub Actions workflow that:

1. SSHs into the Azure VM
2. Pulls the latest code
3. Stops and removes the old container
4. Rebuilds the Docker image
5. Runs the new container

### Required GitHub Secrets

| Secret                  | Description                        |
|-------------------------|------------------------------------|
| `VM_HOST`               | VM public IP address               |
| `VM_USER`               | SSH username                       |
| `VM_SSH_KEY`            | Private SSH key for the VM         |
| `JWT_SECRET`            | JWT signing secret                 |
| `DB_CONNECTION_STRING`  | Full SQL Server connection string  |

---
