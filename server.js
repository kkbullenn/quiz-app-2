const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const sql = require("mssql");

class ServerApp {
  constructor() {
    require("dotenv").config();
    this.clientDir = path.join(__dirname, "static");
    this.app = express();

    this.JWT_SECRET = process.env.JWT_SECRET;
    if (!this.JWT_SECRET) {
      throw new Error("Missing JWT_SECRET in .env");
    }

    // mssql connection pool config
    this.dbConfig = {
      server: process.env.DB_SERVER,
      port: parseInt(process.env.DB_PORT) || 1433,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      options: {
        encrypt: false, // true if using Azure
        trustServerCertificate: true,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    };

    this.pool = null;
  }

  // ==================
  // DB CONNECTION
  // ==================

  async connectDb() {
    try {
      this.pool = await sql.connect(this.dbConfig);
      console.log("Connected to SQL Server");
    } catch (err) {
      console.error("DB connection failed:", err.message);
      process.exit(1); // no point running without a DB
    }
  }

  setupMiddleware() {
    this.app.use(express.static(this.clientDir, { index: false }));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(cors());
  }

  setupStaticRoutes() {
    this.app.get("/", (req, res) => {
      res.redirect("/login.html");
    });

    this.app.get("/create", (req, res) => {
      res.sendFile(path.join(this.clientDir, "create.html"));
    });
  }

  // ==================
  // MIDDLEWARE
  // ==================

  // verifies JWT and attaches decoded user to req.user.
  async requireAuth(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // "Bearer <token>"

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, this.JWT_SECRET);
    } catch {
      return res.status(403).json({
        error: "Invalid or expired token",
      });
    }

    try {
      const result = await this.pool
        .request()
        .input("id", sql.Int, decoded.userId)
        .query(
          "SELECT id, email, api_calls_consumed, api_calls_limit, is_admin FROM users WHERE id = @id",
        );

      const user = result.recordset[0];
      if (!user) return res.status(401).json({ error: "User not found" });

      req.user = user; // attach user to request for use in routes
      next();
    } catch (err) {
      console.error("Auth middleware error:", err);
      res.status(500).json({ error: "Authentication check failed" });
    }
  }

  setupRoutes() {
    this.app.post("/register", async (req, res) => {
      const { email, password } = req.body || {};

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      try {
        // check if email already exists
        const existing = await this.pool
          .request()
          .input("email", sql.NVarChar, email)
          .query("SELECT id FROM users WHERE email = @email");

        if (existing.recordset.length > 0) {
          return res.status(409).json({ error: "Email already registered" });
        }

        const hash = await bcrypt.hash(password, 10);
        const result = await this.pool
          .request()
          .input("email", sql.NVarChar, email)
          .input("hash", sql.NVarChar, hash).query(`
            INSERT INTO users (email, password_hash)
            OUTPUT INSERTED.id
            VALUES (@email, @hash)
          `);

        const newUserId = result.recordset[0].id;

        const token = jwt.sign({ userId: newUserId, email }, this.JWT_SECRET, {
          expiresIn: "7d",
        });

        res.json({ success: true, token, isAdmin: false });
      } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ error: "Registration failed" });
      }
    });

    this.app.post("/login", async (req, res) => {
      const { email, password } = req.body || {};

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      try {
        const result = await this.pool
          .request()
          .input("email", sql.NVarChar, email)
          .query(
            "SELECT id, email, password_hash, is_admin FROM users WHERE email = @email",
          );

        const user = result.recordset[0];

        // use a dummy compare if user not found to prevent timing attacks
        // (avoids leaking whether an email exists based on response time)
        const hash = user
          ? user.password_hash
          : "$2b$10$invalidhashfortimingprotectionheheheha";
        const match = await bcrypt.compare(password, hash);

        if (!user || !match) {
          return res.status(401).json({ error: "Invalid email or password" });
        }

        const token = jwt.sign(
          { userId: user.id, email: user.email },
          this.JWT_SECRET,
          { expiresIn: "7d" },
        );

        res.json({
          success: true,
          token,
          isAdmin: user.is_admin === true || user.is_admin === 1,
        });
      } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Login failed" });
      }
    });

    // returns the logged-in user's profile (used by dashboard)
    this.app.get("/me", this.requireAuth, (req, res) => {
      const u = req.user;
      res.json({
        id: u.id,
        email: u.email,
        apiCallsConsumed: u.api_calls_consumed,
        apiCallsLimit: u.api_calls_limit,
        isAdmin: u.is_admin === true || u.is_admin === 1,
      });
    });

    // ==================
    // ADMIN ROUTES
    // ==================

    this.app.get("/admin/users", this.requireAuth, async (req, res) => {
      if (!req.user.is_admin) {
        return res.status(403).json({ error: "Admins only" });
      }

      try {
        const result = await this.pool
          .request()
          .query(
            "SELECT id, email, api_calls_consumed, api_calls_limit, is_admin, created_at FROM users",
          );

        res.json(result.recordset);
      } catch (err) {
        console.error("Admin users error:", err);
        res.status(500).json({ error: "Failed to fetch users" });
      }
    });

    // ==================
    // QUIZ ROUTES
    // ==================

    // Get all quizzes with category name and question count (admin only)
    this.app.get("/admin/quizzes", this.requireAuth.bind(this), async (req, res) => {
      if (!req.user.is_admin) {
        return res.status(403).json({ error: "Admins only" });
      }
      try {
        const result = await this.pool.request().query(`
          SELECT
            q.id,
            q.title,
            q.description,
            q.created_at,
            c.name AS category_name,
            COUNT(qu.id) AS question_count
          FROM quizzes q
          JOIN categories c ON c.id = q.category_id
          LEFT JOIN questions qu ON qu.quiz_id = q.id
          GROUP BY q.id, q.title, q.description, q.created_at, c.name
          ORDER BY q.created_at DESC
        `);
        res.json(result.recordset);
      } catch (err) {
        console.error("Admin quizzes error:", err);
        res.status(500).json({ error: "Failed to fetch quizzes" });
      }
    });

    // Get all quiz categories
    this.app.get("/categories", async(req, res) => {
      const categories = await this.pool
        .request()
        .query("SELECT * from categories");
      return res.status(200).json(categories);
    })

    // Create a new quiz (admin only)
    this.app.post("/quizzes", this.requireAuth.bind(this), async (req, res) => {
      if (!req.user.is_admin) {
        return res.status(403).json({ error: "Admins only" });
      }
      const { category_id, title, description } = req.body || {};
      if (!category_id || !title) {
        return res.status(400).json({ error: "category_id and title are required" });
      }
      try {
        const result = await this.pool
          .request()
          .input("category_id", sql.Int, category_id)
          .input("title", sql.NVarChar, title)
          .input("description", sql.NVarChar, description || null)
          .input("autoplay", sql.Bit, 0)
          .query(`
            INSERT INTO quizzes (category_id, title, description, autoplay)
            OUTPUT INSERTED.id
            VALUES (@category_id, @title, @description, @autoplay)
          `);
        res.status(201).json({ id: result.recordset[0].id });
      } catch (err) {
        console.error("Create quiz error:", err);
        res.status(500).json({ error: "Failed to create quiz" });
      }
    });

    // Delete a quiz (admin only)
    this.app.delete("/quizzes/:id", this.requireAuth.bind(this), async (req, res) => {
      if (!req.user.is_admin) {
        return res.status(403).json({ error: "Admins only" });
      }
      try {
        await this.pool
          .request()
          .input("id", sql.Int, req.params.id)
          .query("DELETE FROM quizzes WHERE id = @id");
        res.status(204).end();
      } catch (err) {
        console.error("Delete quiz error:", err);
        res.status(500).json({ error: "Failed to delete quiz" });
      }
    });

    // Get all quizzes for a given category
    this.app.get("/categories/:id", async(req, res) => {
      const id = req.params.id;
      const quizzes = await this.pool
        .request()
        .input("id", sql.Int, id)
        .query(`SELECT * FROM quizzes WHERE category_id = @id ORDER BY created_at DESC`);
      return res.status(200).json(quizzes.recordset);
    });

    // Get all questions and answers for a given quiz id
    this.app.get("/quizzes/:id", async(req, res)=> {
      const quizId = req.params.id;
      try {
        const result = await this.pool
          .request()
          .input("quizId", sql.Int, quizId)
          .query(`
            SELECT
              q.id            AS question_id,
              q.question_text,
              q.question_type,
              q.media_url,
              q.media_type,
              q.display_order AS question_order,
              a.id            AS answer_id,
              a.answer_text,
              a.is_correct,
              a.display_order AS answer_order
            FROM questions q
            JOIN answers a ON a.question_id = q.id
            WHERE q.quiz_id = @quizId
            ORDER BY q.display_order, a.display_order
          `);

        const rows = result.recordset;
        if (rows.length === 0) return res.status(404).json({ error: "Quiz not found" });

        const questionsMap = new Map();
        rows.forEach(r => {
          if (!questionsMap.has(r.question_id)) {
            questionsMap.set(r.question_id, {
              id: r.question_id,
              question_text: r.question_text,
              question_type: r.question_type,
              media_url: r.media_url,
              media_type: r.media_type,
              display_order: r.question_order,
              answers: []
            });
          }
          questionsMap.get(r.question_id).answers.push({
            id: r.answer_id,
            answer_text: r.answer_text,
            is_correct: r.is_correct,
            display_order: r.answer_order
          });
        });

        return res.status(200).json([...questionsMap.values()]);
      } catch(error) {
        return res.status(500).json({ error: error.message });
      }
    });
  }

  start() {
    this.app.listen(process.env.PORT || 3000, () => {
      console.log(`Server running on port ${process.env.PORT || 3000}`);
    });
  }

  async init() {
    await this.connectDb();
    this.setupMiddleware();
    this.setupStaticRoutes();
    this.setupRoutes();
    this.start();
  }
}

const serverApp = new ServerApp();
serverApp.init();
