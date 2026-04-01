// ==================
// AUTH HELPERS — used by every page
// ==================

function getToken() {
    return localStorage.getItem("token");
}

function isAdmin() {
    return localStorage.getItem("isAdmin") === "true";
}

function clearAuth() {
    localStorage.removeItem("token");
    localStorage.removeItem("isAdmin");
}

function requireAuth() {
    if (!getToken()) {
        window.location.href = "/login.html";
        return false;
    }
    return true;
}

function requireAdmin() {
    if (!getToken() || !isAdmin()) {
        window.location.href = "/login.html";
        return false;
    }
    return true;
}

async function apiFetch(path, options = {}) {
    const response = await fetch(path, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
            ...(options.headers || {}),
        },
    });

    if (response.status === 401 || response.status === 403) {
        clearAuth();
        window.location.href = "/login.html";
        return null;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
}

async function postJson(path, payload) {
    const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
}

// ==================
// LOGOUT — wired up on any page that has #logout-btn
// ==================

const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        clearAuth();
        window.location.href = "/login.html";
    });
}

// ==================
// LOGIN PAGE
// ==================

const loginForm = document.getElementById("login-form");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const msg = document.getElementById("form-message");

        try {
            const result = await postJson("/login", { email, password });
            localStorage.setItem("token", result.token);
            localStorage.setItem("isAdmin", result.isAdmin ? "true" : "false");
            window.location.href = result.isAdmin ? "/admin.html" : "/categories.html";
        } catch (err) {
            msg.textContent = err.message;
            msg.className = "message error";
        }
    });
}

// ==================
// REGISTER PAGE
// ==================

const registerForm = document.getElementById("register-form");
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("register-email").value.trim();
        const password = document.getElementById("register-password").value;
        const msg = document.getElementById("form-message");

        try {
            const result = await postJson("/register", { email, password });
            localStorage.setItem("token", result.token);
            localStorage.setItem("isAdmin", "false");
            msg.textContent = "Registration successful! Redirecting...";
            msg.className = "message success";
            setTimeout(() => { window.location.href = "/categories.html"; }, 800);
        } catch (err) {
            msg.textContent = err.message;
            msg.className = "message error";
        }
    });
}

// ==================
// ADMIN PAGE
// ==================

if (document.getElementById("admin-root")) {
    requireAdmin();

    (async () => {
        try {
            const quizzes = await apiFetch("/admin/quizzes");
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
                card.innerHTML = `
          <div class="flex items-start justify-between gap-4">
            <div>
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

    window.editQuiz = (id) => {
        window.location.href = `/edit.html?quizId=${id}`;
    };

    window.deleteQuiz = async (id) => {
        if (!confirm("Delete this quiz?")) return;
        try {
            await apiFetch(`/admin/quizzes/${id}`, { method: "DELETE" });
            document.getElementById(`quiz-card-${id}`)?.remove();
        } catch (err) {
            alert(err.message);
        }
    };

    // ==================
    // CATEGORIES PAGE
    // ==================

} else if (document.getElementById("categories-container")) {
    requireAuth();

    (async () => {
        try {
            const categories = await apiFetch("/categories");
            if (!categories) return;

            const container = document.getElementById("categories-container");
            container.innerHTML = "";

            categories.forEach((category, index) => {
                const card = document.createElement("div");
                card.className = "cat-section movie-card p-6 cursor-pointer";
                card.style.animationDelay = `${0.15 + index * 0.1}s`;
                card.innerHTML = `
          <p class="text-base font-semibold text-white/90 leading-tight mb-2">${category.name}</p>
          <p class="text-xs text-white/40 font-light">${category.description ?? ""}</p>
        `;
                card.onclick = () => {
                    card.classList.add("clicked");
                    window.location.href = `/quizzes.html?categoryId=${category.id}&categoryName=${encodeURIComponent(category.name)}`;
                };
                container.appendChild(card);
            });
        } catch (err) {
            console.error("Categories load error:", err);
        }
    })();
}