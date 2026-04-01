class ClientApp {
  constructor() {
    this.loginForm = document.getElementById("login-form");
    this.registerForm = document.getElementById("register-form");
    this.message = document.getElementById("form-message");
    this.API_BASE_URL = "http://localhost:3000";
    this.dashboardRoot = document.getElementById("dashboard-root");
    this.adminRoot = document.getElementById("admin-root");
    this.logoutBtn = document.getElementById("logout-btn");
  }

  showMessage(text, type) {
    if (!this.message) return;
    // textContent > innerHTML for security (prevents XSS)
    this.message.textContent = text;
    this.message.className = `message ${type}`;
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  validateEmailAndPassword(email, password) {
    if (!email || !password) return "Please enter both email and password.";
    if (!this.isValidEmail(email)) return "Please enter a valid email address.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return "";
  }

  // stores token after login/register
  saveToken(token) {
    localStorage.setItem("token", token);
  }

  getToken() {
    return localStorage.getItem("token");
  }

  clearToken() {
    localStorage.removeItem("token");
    localStorage.removeItem("isAdmin");
  }

  // ==================
  // API HELPERS
  // ==================

  async postJson(path, payload) {
    const response = await fetch(`${this.API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  }

  // automatically attaches the JWT and checks API limit headers,
  // should be used for any req that needs auth
  async authFetch(path, options = {}) {
    const token = this.getToken();
    const response = await fetch(`${this.API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    // check API usage headers
    const limitReached = response.headers.get("X-Api-Limit-Reached");
    const used = response.headers.get("X-Api-Calls-Used");
    const limit = response.headers.get("X-Api-Calls-Limit");

    if (limitReached === "true") {
      const warningEl = document.getElementById("api-warning");
      if (warningEl) {
        warningEl.textContent = `Warning: You have used all ${limit} free API calls.`;
        warningEl.style.display = "block";
      }
    }

    if (response.status === 401 || response.status === 403) {
      this.clearToken();
      window.location.href = "login.html";
      return;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  }

  // ==================
  // AUTH FORMS
  // ==================

  initAuthForms() {
    if (this.loginForm) {
      this.loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const validationError = this.validateEmailAndPassword(email, password);

        if (validationError) {
          this.showMessage(validationError, "error");
          return;
        }

        try {
          const result = await this.postJson("/login", { email, password });
          this.saveToken(result.token);
          localStorage.setItem("isAdmin", result.isAdmin ? "true" : "false");

          // redirect to admin or user dashboard based on role
          window.location.href = result.isAdmin ? "admin.html" : "categories.html";
        } catch (error) {
          this.showMessage(error.message, "error");
        }
      });
    }

    if (this.registerForm) {
      this.registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = document.getElementById("register-email").value.trim();
        const password = document.getElementById("register-password").value;
        const validationError = this.validateEmailAndPassword(email, password);

        if (validationError) {
          this.showMessage(validationError, "error");
          return;
        }

        try {
          const result = await this.postJson("/register", { email, password });
          this.saveToken(result.token);
          localStorage.setItem("isAdmin", "false");
          this.showMessage("Registration successful! Redirecting...", "success");
          setTimeout(() => {
            window.location.href = "categories.html";
          }, 800);
        } catch (error) {
          this.showMessage(error.message, "error");
        }
      });
    }
  }

  // ==================
  // DASHBOARD PAGE
  // ==================

  initDashboard() {
    if (this.dashboardRoot) {
      (async () => {
        const token = this.getToken();
        if (!token) {
          window.location.href = "login.html";
          return;
        }

        try {
          const user = await this.authFetch("/me");
          if (!user) return;

          // if somehow an admin lands here, redirect them
          if (user.isAdmin) {
            window.location.href = "admin.html";
            return;
          }

          const pct = Math.min(
            (user.apiCallsConsumed / user.apiCallsLimit) * 100,
            100,
          );

          document.getElementById("user-email").textContent = user.email;
          document.getElementById("calls-used").textContent = user.apiCallsConsumed;
          document.getElementById("calls-limit").textContent = user.apiCallsLimit;
          document.getElementById("calls-bar").style.width = `${pct}%`;
          document.getElementById("calls-bar").style.background =
            pct >= 100 ? "var(--danger)" : pct >= 75 ? "#e07b00" : "var(--accent)";

          if (user.apiCallsConsumed >= user.apiCallsLimit) {
            const warning = document.getElementById("api-warning");
            if (warning) {
              warning.textContent = `You've used all ${user.apiCallsLimit} free API calls. Contact support to continue.`;
              warning.style.display = "block";
            }
          }
        } catch (err) {
          console.error("Dashboard load error:", err);
        }
      })();
    }
  }

  // ==================
  // ADMIN PAGE
  // ==================

  initAdmin() {
    if (!this.adminRoot) return;

    (async () => {
      const token = this.getToken();
      const isAdmin = localStorage.getItem("isAdmin") === "true";

      if (!token || !isAdmin) {
        window.location.href = "login.html";
        return;
      }

      window.editQuiz = (id) => {
        window.location.href = `/edit.html?quizId=${id}`;
      }

      window.deleteQuiz = async (id) => {
        if (!confirm("Delete this quiz?")) return;
        try {
          const res = await fetch(`http://localhost:3000/quizzes/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${this.getToken()}` },
          });
          if (!res.ok) throw new Error("Delete failed");
          document.getElementById(`quiz-card-${id}`)?.remove();
        } catch (err) {
          alert(err.message);
        }
      };

      try {
        const quizzes = await this.authFetch("/admin/quizzes");
        if (!quizzes) return;

        const container = document.getElementById("quiz-list");
        container.innerHTML = "";

        if (quizzes.length === 0) {
          container.innerHTML = `<p class="text-white/40 text-sm">No quizzes found.</p>`;
          return;
        }

        quizzes.forEach((quiz, index) => {
          const card = document.createElement("div");
          card.id = `quiz-card-${quiz.id}`;
          card.className = "quiz-card cat-section p-6";
          card.style.animationDelay = `${0.1 + index * 0.07}s`;

          const date = quiz.created_at
            ? new Date(quiz.created_at).toLocaleDateString()
            : "—";

          card.innerHTML = `
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-medium tracking-[0.2em] text-violet-400/70 uppercase mb-1">${quiz.category_name}</p>
                <h3 class="logo text-2xl text-white leading-tight mb-1">${quiz.title}</h3>
                <p class="text-xs text-white/40 font-light">${quiz.description ?? ""}</p>
              </div>
              <div class="flex gap-2 shrink-0">
                <button onclick="editQuiz(${quiz.id})" class="text-xs text-white border border-white/20 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors">Edit</button>
                <button onclick="deleteQuiz(${quiz.id})" class="text-xs text-red-400 border border-red-400/30 px-3 py-1.5 rounded-full hover:bg-red-400/10 transition-colors">Delete</button>
              </div>
            </div>
          `;

          container.appendChild(card);
        });
      } catch (err) {
        console.error("Admin load error:", err);
      }
    })();
  }

  // ==================
  // LOGOUT
  // ==================

  initLogout() {
    if (this.logoutBtn) {
      this.logoutBtn.addEventListener("click", () => {
        this.clearToken();
        window.location.href = "login.html";
      });
    }
  }

  init() {
    this.initAuthForms();
    this.initDashboard();
    this.initAdmin();
    this.initLogout();
  }
}

const app = new ClientApp();
app.init();
