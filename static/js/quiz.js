class Quiz {
    constructor() {
        this.questions = [];
        this.currentIndex = 0;
        this.score = 0;
        this.answered = false;
    }

    // Resolves a Tenor page URL to a direct .gif media URL
    // Uses Tenor's public API with their documented demo key
    async resolveTenorGif(pageUrl) {
        const postId = pageUrl.match(/(\d+)$/)?.[1];
        if (!postId) return null;

        try {
            const res = await fetch(`https://api.tenor.com/v1/gifs?ids=${postId}&key=LIVDSRZULELA`);
            const data = await res.json();
            return data.results?.[0]?.media?.[0]?.gif?.url ?? null;
        } catch {
            return null;
        }
    }

    async renderQuestion() {
        this.answered = false;

        const q = this.questions[this.currentIndex];

        document.getElementById("question-number").textContent =
            `Question ${this.currentIndex + 1} of ${this.questions.length}`;
        document.getElementById("question-text").textContent = q.question.text;
        document.getElementById("next-btn").disabled = true;

        // Resolve and display GIF
        const gifEl = document.getElementById("question-gif");
        if (q.question.mediaType === "gif" && q.question.mediaUrl) {
            gifEl.innerHTML = `<p class="text-xs text-white/30">Loading GIF...</p>`;
            const gifUrl = await this.resolveTenorGif(q.question.mediaUrl);
            if (gifUrl) {
                gifEl.innerHTML = `<img src="${gifUrl}" class="rounded-xl w-full min-h-48 max-h-72 object-contain" alt="Question GIF" />`;
            } else {
                gifEl.innerHTML = "";
            }
        } else {
            gifEl.innerHTML = "";
        }

        const answersEl = document.getElementById("answers");
        answersEl.innerHTML = "";

        q.answers.forEach(answer => {
            const btn = document.createElement("button");
            btn.className = "answer-btn";
            btn.textContent = answer.text;

            btn.addEventListener("click", () => {
                if (this.answered) return;
                this.answered = true;

                if (answer.isCorrect) this.score++;

                answersEl.querySelectorAll(".answer-btn").forEach(b => {
                    b.disabled = true;
                    const match = q.answers.find(a => a.text === b.textContent);
                    if (match?.isCorrect) {
                        b.classList.add("correct");
                    } else if (b === btn) {
                        b.classList.add("incorrect");
                    }
                });

                document.getElementById("next-btn").disabled = false;
            });

            answersEl.appendChild(btn);
        });
    }

    showEndScreen() {
        document.getElementById("quiz-screen").style.display = "none";
        document.getElementById("score-text").textContent =
            `You scored ${this.score} out of ${this.questions.length}`;
        document.getElementById("end-screen").style.display = "block";
    }

    bindNextButton() {
        document.getElementById("next-btn").addEventListener("click", () => {
            if (this.currentIndex + 1 < this.questions.length) {
                this.currentIndex++;
                this.renderQuestion();
            } else {
                this.showEndScreen();
            }
        });
    }

    async start() {
        const params = new URLSearchParams(window.location.search);
        const quizId = params.get("quizId");

        document.getElementById("quiz-title").textContent = params.get("quizTitle") ?? "";
        document.getElementById("quiz-category").textContent = params.get("categoryName") ?? "";

        try {
            const data = await apiFetch(`/quizzes/${quizId}/questions`);
            if (!data || data.length === 0) {
                document.getElementById("question-text").textContent = "No questions found for this quiz.";
                return;
            }
            this.questions = data;
        } catch (err) {
            document.getElementById("question-text").textContent = "Failed to load quiz.";
            return;
        }

        this.bindNextButton();
        this.renderQuestion();
    }
}

const quizApp = new Quiz();
quizApp.start();