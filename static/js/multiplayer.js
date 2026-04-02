(() => {
    if (!requireAuth()) return;

    const params = new URLSearchParams(window.location.search);
    const quizId = params.get("quizId");
    const roomId = decodeURIComponent(params.get("roomId") ?? "");
    const quizTitle = decodeURIComponent(params.get("quizTitle") ?? "Quiz");
    const categoryName = decodeURIComponent(params.get("categoryName") ?? "");

    document.getElementById("quiz-title").textContent = quizTitle;
    document.getElementById("quiz-category").textContent = categoryName;
    document.getElementById("room-code-display").textContent = `Room: ${roomId}`;

    // WebSocket
    const ws = new WebSocket(`ws://${window.location.host}/ws`);
    ws.onopen = () => ws.send(JSON.stringify({ Type: "join_room", RoomId: roomId }));
    ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.Type === "player_joined") addFeed("A player joined the room.");
        if (msg.Type === "player_answered") addFeed(`A player answered.`);
    };

    function addFeed(text) {
        const feed = document.getElementById("live-feed");
        // Clear the placeholder on first real event
        if (feed.querySelector("p.text-white\\/30")) feed.innerHTML = "";
        const entry = document.createElement("p");
        entry.className = "text-xs text-white/50";
        entry.textContent = `• ${text}`;
        feed.prepend(entry);
    }

    // Quiz state
    let questions = [];
    let currentIndex = 0;
    let score = 0;
    let answered = false;

    async function loadQuiz() {
        try {
            const data = await apiFetch(`/quizzes/${quizId}/questions`);
            if (!data || data.length === 0) {
                document.getElementById("question-text").textContent = "No questions found for this quiz.";
                return;
            }
            questions = data;
            renderQuestion();
        } catch (err) {
            document.getElementById("question-text").textContent = "Failed to load quiz.";
        }
    }

    function renderQuestion() {
        answered = false;
        const q = questions[currentIndex];
        document.getElementById("question-number").textContent =
            `Question ${currentIndex + 1} of ${questions.length}`;
        document.getElementById("question-text").textContent = q.question.text;
        document.getElementById("next-btn").disabled = true;

        const answersEl = document.getElementById("answers");
        answersEl.innerHTML = "";

        q.answers.forEach(answer => {
            const btn = document.createElement("button");
            btn.className = "answer-btn";
            btn.textContent = answer.text;
            btn.addEventListener("click", () => {
                if (answered) return;
                answered = true;

                if (answer.isCorrect) score++;

                // Reveal correct/incorrect state on all buttons
                answersEl.querySelectorAll(".answer-btn").forEach(b => {
                    b.disabled = true;
                    const matchingAnswer = q.answers.find(a => a.text === b.textContent);
                    if (matchingAnswer?.isCorrect) b.classList.add("correct");
                    else if (b === btn) b.classList.add("incorrect");
                });

                // Broadcast answer to room
                ws.send(JSON.stringify({ Type: "answer", RoomId: roomId, Answer: answer.text }));

                document.getElementById("next-btn").disabled = false;
            });
            answersEl.appendChild(btn);
        });
    }

    document.getElementById("next-btn").addEventListener("click", () => {
        if (currentIndex + 1 < questions.length) {
            currentIndex++;
            renderQuestion();
        } else {
            ws.close();
            document.getElementById("quiz-screen").style.display = "none";
            document.getElementById("score-text").textContent =
                `You scored ${score} out of ${questions.length}`;
            document.getElementById("end-screen").style.display = "block";
        }
    });

    loadQuiz();
})();
