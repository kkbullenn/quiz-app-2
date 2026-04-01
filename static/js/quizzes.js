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
        if (!this.categoryId) {
            this.container.textContent = "No category selected.";
            return;
        }

        const heading = document.getElementById("category-heading");
        if (heading) heading.textContent = this.categoryName;

        const quizzes = await fetch(`/categories/${this.categoryId}`).then(r => r.json());

        if (quizzes.length === 0) {
            this.container.innerHTML = `<p class="text-white/40 text-sm">No quizzes in this category yet.</p>`;
            return;
        }

        quizzes.forEach((quiz, i) => this.renderQuiz(quiz, i));
    }

    // Create and append a link for a single quiz
    renderQuiz(quiz, index = 0) {
        const link = document.createElement("a");
        link.className = "quiz-link";
        link.style.animationDelay = `${0.1 + index * 0.07}s`;
        link.href = `/quiz.html?quizId=${quiz.id}&quizTitle=${encodeURIComponent(quiz.title)}&categoryName=${encodeURIComponent(this.categoryName)}`;
        link.innerHTML = `
            <p class="text-base font-semibold text-white/90 leading-tight">${quiz.title}</p>
            ${quiz.description ? `<p class="text-xs text-white/40 font-light mt-1">${quiz.description}</p>` : ""}
        `;
        this.container.appendChild(link);
    }
}

new QuizzesPage().load();
