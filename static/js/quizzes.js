class QuizzesPage {
    constructor() {
        // Read category context from the URL params set by categories.html
        const params = new URLSearchParams(window.location.search);
        this.categoryId = params.get("categoryId");
        this.categoryName = params.get("categoryName") ?? "";
        this.container = document.getElementById("quizzes-container");
    }

    // Fetch all quizzes for this category and render them
    async load() {
        if (!requireAuth()) return;

        if (!this.categoryId) {
            this.container.textContent = "No category selected.";
            return;
        }

        const heading = document.getElementById("category-heading");
        if (heading) heading.textContent = this.categoryName;

        const quizzes = await apiFetch(`/categories/${this.categoryId}`);
        if (!quizzes) return;

        if (quizzes.length === 0) {
            this.container.innerHTML = `<p class="text-white/40 text-sm">No quizzes in this category yet.</p>`;
            return;
        }
        quizzes.forEach((quiz, i) => this.renderQuiz(quiz, i));
    }

    // Create and append a card with solo and multiplayer options for a single quiz
    renderQuiz(quiz, index = 0) {
        const card = document.createElement("div");
        card.className = "quiz-link";
        card.style.animationDelay = `${0.1 + index * 0.07}s`;
        card.innerHTML = `
            <div class="flex items-start justify-between gap-4">
                <div>
                    <p class="text-base font-semibold text-white/90 leading-tight">${quiz.title}</p>
                    ${quiz.description ? `<p class="text-xs text-white/40 font-light mt-1">${quiz.description}</p>` : ""}
                </div>
                <div class="flex gap-2 shrink-0">
                    <a href="/quiz.html?quizId=${quiz.id}&quizTitle=${encodeURIComponent(quiz.title)}&categoryName=${encodeURIComponent(this.categoryName)}"
                       class="text-xs text-white border border-white/20 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors">Solo</a>
                    <a href="/lobby.html?quizId=${quiz.id}&quizTitle=${encodeURIComponent(quiz.title)}&categoryName=${encodeURIComponent(this.categoryName)}"
                       class="text-xs text-violet-400 border border-violet-400/30 px-3 py-1.5 rounded-full hover:bg-violet-400/10 transition-colors">Multiplayer</a>
                </div>
            </div>
        `;
        this.container.appendChild(card);
    }
}

new QuizzesPage().load();
