-- ============================================================
-- Run once after container is healthy:
-- sqlcmd -S localhost -U sa -P <password> -i db/init.sql -No
-- ============================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'quiz_app')
    CREATE DATABASE quiz_app;
GO

USE quiz_app;
GO

-- ==================
-- USERS
-- ==================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
CREATE TABLE users (
    id               INT IDENTITY(1,1) PRIMARY KEY,
    email            NVARCHAR(255) NOT NULL UNIQUE,
    password_hash    NVARCHAR(255) NOT NULL,
    is_admin         BIT           NOT NULL DEFAULT 0,
    api_calls_consumed INT         NOT NULL DEFAULT 0,
    api_calls_limit  INT           NOT NULL DEFAULT 20,
    created_at       DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ==================
-- CATEGORIES
-- ==================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='categories' AND xtype='U')
CREATE TABLE categories (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    name        NVARCHAR(255) NOT NULL UNIQUE,
    description NVARCHAR(500),
    created_at  DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ==================
-- QUIZZES
-- ==================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='quizzes' AND xtype='U')
CREATE TABLE quizzes (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    category_id  INT           NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    title        NVARCHAR(255) NOT NULL,
    description  NVARCHAR(500),
    autoplay     BIT           NOT NULL DEFAULT 0,
    created_at   DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ==================
-- QUESTIONS
-- ==================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='questions' AND xtype='U')
CREATE TABLE questions (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    quiz_id       INT           NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text NVARCHAR(1000) NOT NULL,
    question_type NVARCHAR(50)  NOT NULL DEFAULT 'multiple_choice',
        -- values: 'multiple_choice' | 'true_false'
    media_url     NVARCHAR(500),
    media_type    NVARCHAR(50),
        -- values: 'image' | 'audio' | 'video' | 'gif' | NULL
    display_order INT           NOT NULL DEFAULT 0,
    created_at    DATETIME2     NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT chk_question_type CHECK (
        question_type IN ('multiple_choice', 'true_false')
    ),
    CONSTRAINT chk_media_type CHECK (
        media_type IN ('image', 'audio', 'video', 'gif') OR media_type IS NULL
    )
);
GO

-- ==================
-- ANSWERS
-- ==================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='answers' AND xtype='U')
CREATE TABLE answers (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    question_id   INT            NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer_text   NVARCHAR(500)  NOT NULL,
    is_correct    BIT            NOT NULL DEFAULT 0,
    display_order INT            NOT NULL DEFAULT 0
);
GO

-- ==================
-- QUIZ ATTEMPTS (summary)
-- ==================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='quiz_attempts' AND xtype='U')
CREATE TABLE quiz_attempts (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    user_id      INT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_id      INT       NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    score        INT       NOT NULL DEFAULT 0,
    total        INT       NOT NULL DEFAULT 0,
    completed_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ==================
-- ATTEMPT ANSWERS (per-question detail)
-- ==================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='attempt_answers' AND xtype='U')
CREATE TABLE attempt_answers (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    attempt_id   INT NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id  INT NOT NULL REFERENCES questions(id),
    answer_id    INT NOT NULL REFERENCES answers(id),
    is_correct   BIT NOT NULL DEFAULT 0
);
GO

-- ==================
-- SEED DATA
-- ==================

-- Admin user (password: admin1234)
IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@quiz.com')
INSERT INTO users (email, password_hash, is_admin, api_calls_limit)
VALUES (
    'admin@quiz.com',
    '$2b$10$CHuVbUQwltlXEPVlb1A4ou8T9bPeEuqxuhzg2NVA7k8mJAEWf.tC2',
    1,
    999
);
GO

-- Regular user (password: user1234)
IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'user@quiz.com')
INSERT INTO users (email, password_hash, is_admin)
VALUES (
    'user@quiz.com',
    '$2b$10$sgCIb5wqXoTRvaN0OB4QEu7R5J6NVssMFC1waYGgOpw3PRlRjUSHe',
    0
);
GO

-- Sample category + quiz
IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'General Knowledge')
INSERT INTO categories (name, description)
VALUES ('General Knowledge', 'A mix of trivia across topics');
GO

IF NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Sample Quiz')
INSERT INTO quizzes (category_id, title, description, autoplay)
VALUES (1, 'Sample Quiz', 'A starter quiz', 0);
GO