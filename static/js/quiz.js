class quiz {
    constructor(){
        this.questions = [];
        this.currentIndex = 0;
    }

    loadQuiz(){
        // clear quiz-question and quiz-answers elements
        let quizQuestion = document.getElementById("quiz-question");
        let quizAnswers = document.getElementById("quiz-answers");
        quizQuestion.innerText = "";
        quizAnswers.innerText = "";

        // load question using this.questions
        quizQuestion.innerText = this.questions[this.currentIndex].question_text;
        this.questions[this.currentIndex].answers.forEach(answer => {
            const answerOptionButton = document.createElement("button");
            answerOptionButton.innerText = answer.answer_text;
            answerOptionButton.className = "answer-btn";
            answerOptionButton.addEventListener("click", () => { 
            if (answer.is_correct === true) {
                answerOptionButton.classList.add("correct");
            } else {
                answerOptionButton.classList.add("incorrect");
            }
        })
            quizAnswers.appendChild(answerOptionButton);
        });
    }

    // Loads a new quiz question upon clicking the next button
    loadButtonListener(){
        document.getElementById("next-question").addEventListener("click", () => {
            if (this.currentIndex + 1 <= this.questions.length - 1) {
                this.currentIndex++;
                this.loadQuiz()
            }
            else {
                alert("No more questions!");
            }
        })
    }

    async start(){
        const params = new URLSearchParams(window.location.search);
        const quizId = params.get("quizId");
        document.getElementById("quiz-title").innerText = params.get("quizTitle") ?? "";
        document.getElementById("quiz-category").innerText = params.get("categoryName") ?? "";
        this.questions = await fetch(`/quizzes/${quizId}`).then(response => response.json());
        this.loadButtonListener();
        this.loadQuiz();
    }
}

let quizApp = new quiz();
quizApp.start();