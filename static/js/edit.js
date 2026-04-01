(() => {
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (!token || !isAdmin) { window.location.href = '/login.html'; return; }

    const params = new URLSearchParams(window.location.search);
    const quizId = parseInt(params.get('quizId'));
    if (!quizId) { window.location.href = '/admin.html'; return; }

    const authHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };

    // ==================
    // HELPERS
    // ==================

    function escHtml(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ==================
    // RENDER EXISTING QUESTIONS
    // ==================

    function renderExistingQuestions(questions) {
        const container = document.getElementById('questions-container');
        container.innerHTML = '';

        if (!questions || questions.length === 0) {
            container.innerHTML = '<p class="text-white/30 text-sm py-2">No questions yet. Add one below.</p>';
            return;
        }

        questions.forEach((item, idx) => {
            const q = item.question;
            const answers = item.answers;

            const card = document.createElement('div');
            card.id = `question-card-${q.id}`;
            card.className = 'question-card p-5';

            card.innerHTML = `
        <div class="flex items-start justify-between gap-4 mb-3">
          <div class="min-w-0">
            <span class="text-xs tracking-widest text-violet-400/60 uppercase">Q${idx + 1} · ${escHtml(q.questionType)}</span>
            <p class="text-white font-medium mt-1">${escHtml(q.text)}</p>
            ${q.mediaUrl ? `<p class="text-xs text-white/30 mt-1 truncate">${escHtml(q.mediaUrl)}</p>` : ''}
          </div>
          <button class="delete-question-btn text-xs text-red-400 border border-red-400/30 px-3 py-1.5 rounded-full hover:bg-red-400/10 transition-colors shrink-0">Delete</button>
        </div>
        <div class="flex flex-col gap-1.5 pl-1">
          ${answers.map(a => `
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full shrink-0 ${a.isCorrect ? 'bg-violet-400' : 'bg-white/15'}"></span>
              <span class="text-sm ${a.isCorrect ? 'text-white' : 'text-white/40'}">${escHtml(a.text)}</span>
            </div>
          `).join('')}
        </div>
      `;

            card.querySelector('.delete-question-btn').addEventListener('click', async () => {
                if (!confirm('Delete this question?')) return;
                try {
                    const res = await fetch(`/admin/questions/${q.id}`, { method: 'DELETE', headers: authHeaders });
                    if (!res.ok) throw new Error('Delete failed');
                    card.remove();
                } catch (err) {
                    alert(err.message);
                }
            });

            container.appendChild(card);
        });
    }

    // ==================
    // ADD QUESTION FORM
    // ==================

    let questionCount = 0;

    function buildAnswerRows(formId, type) {
        if (type === 'true_false') {
            return `
        <div class="flex items-center gap-3">
          <input type="radio" name="correct-${formId}" value="0" checked class="accent-violet-500 shrink-0" />
          <input type="text" name="answer_0" value="True" readonly class="field-input opacity-50 cursor-not-allowed" />
        </div>
        <div class="flex items-center gap-3">
          <input type="radio" name="correct-${formId}" value="1" class="accent-violet-500 shrink-0" />
          <input type="text" name="answer_1" value="False" readonly class="field-input opacity-50 cursor-not-allowed" />
        </div>
      `;
        }
        return [0, 1, 2, 3].map(i => `
      <div class="flex items-center gap-3">
        <input type="radio" name="correct-${formId}" value="${i}" ${i === 0 ? 'checked' : ''} class="accent-violet-500 shrink-0" />
        <input type="text" name="answer_${i}" class="field-input" placeholder="Answer ${i + 1}..." />
      </div>
    `).join('');
    }

    function addQuestionForm() {
        questionCount++;
        const formId = `new-q-${questionCount}`;
        const container = document.getElementById('new-questions-container');

        const block = document.createElement('div');
        block.id = formId;
        block.className = 'new-question-card p-5 flex flex-col gap-4';

        block.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-xs tracking-widest text-violet-400/60 uppercase">New Question</span>
        <button type="button" class="remove-btn text-xs text-white/30 hover:text-white/60 transition-colors">✕ Remove</button>
      </div>
      <div>
        <label class="field-label">Question Text</label>
        <textarea name="question_text" class="field-input" rows="2" placeholder="e.g. What year was Pulp Fiction released?"></textarea>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="field-label">Type</label>
          <select name="question_type" class="field-input">
            <option value="multiple_choice">Multiple Choice</option>
            <option value="true_false">True / False</option>
          </select>
        </div>
        <div>
          <label class="field-label">Media Type</label>
          <select name="media_type" class="field-input">
            <option value="">None</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="gif">GIF</option>
            <option value="audio">Audio</option>
          </select>
        </div>
      </div>
      <div>
        <label class="field-label">Media URL <span class="normal-case text-white/20 font-normal">(optional)</span></label>
        <input type="text" name="media_url" class="field-input" placeholder="https://..." />
      </div>
      <div>
        <label class="field-label">Answers <span class="normal-case text-white/20 font-normal">— mark the correct one</span></label>
        <div class="answers-list flex flex-col gap-2 mt-1">${buildAnswerRows(formId, 'multiple_choice')}</div>
      </div>
      <div class="flex justify-end">
        <button type="button" class="save-question-btn px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-full transition-colors">Save Question</button>
      </div>
    `;

        block.querySelector('.remove-btn').addEventListener('click', () => block.remove());

        const typeSelect = block.querySelector('[name="question_type"]');
        const answersList = block.querySelector('.answers-list');
        typeSelect.addEventListener('change', () => {
            answersList.innerHTML = buildAnswerRows(formId, typeSelect.value);
        });

        block.querySelector('.save-question-btn').addEventListener('click', () => saveQuestion(formId));

        container.appendChild(block);
        block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ==================
    // SAVE QUESTION
    // ==================

    async function saveQuestion(formId) {
        const block = document.getElementById(formId);
        const text = block.querySelector('[name="question_text"]').value.trim();
        const questionType = block.querySelector('[name="question_type"]').value;
        const mediaType = block.querySelector('[name="media_type"]').value || null;
        const mediaUrl = block.querySelector('[name="media_url"]').value.trim() || null;
        const checkedRadio = block.querySelector(`[name="correct-${formId}"]:checked`);
        const correctIdx = checkedRadio ? parseInt(checkedRadio.value) : 0;
        const answerInputs = block.querySelectorAll('[name^="answer_"]');

        if (!text) { alert('Question text is required'); return; }

        const answers = Array.from(answerInputs).map((inp, i) => ({
            text: inp.value.trim(),
            isCorrect: i === correctIdx,
            displayOrder: i,
        }));

        if (answers.some(a => !a.text)) { alert('Please fill in all answer fields'); return; }

        const btn = block.querySelector('.save-question-btn');
        btn.textContent = 'Saving...';
        btn.disabled = true;

        try {
            const res = await fetch('/admin/questions', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                    quizId,
                    text,
                    questionType,
                    mediaUrl,
                    mediaType,
                    displayOrder: questionCount,
                    answers,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to save question');

            block.remove();
            await loadQuestions();
        } catch (err) {
            btn.textContent = 'Save Question';
            btn.disabled = false;
            alert(err.message);
        }
    }

    // ==================
    // LOAD QUESTIONS
    // ==================

    async function loadQuestions() {
        const res = await fetch(`/admin/quizzes/${quizId}/questions`, { headers: authHeaders });
        const data = await res.json().catch(() => []);
        renderExistingQuestions(data);
    }

    // ==================
    // META FORM
    // ==================

    document.getElementById('quiz-meta-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const categoryId = parseInt(document.getElementById('category').value);
        const title = document.getElementById('title').value.trim();
        const description = document.getElementById('description').value.trim() || null;

        try {
            const res = await fetch(`/admin/quizzes/${quizId}`, {
                method: 'PATCH',
                headers: authHeaders,
                body: JSON.stringify({ categoryId, title, description }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to save');

            const btn = e.target.querySelector('[type="submit"]');
            const orig = btn.textContent;
            btn.textContent = 'Saved!';
            setTimeout(() => { btn.textContent = orig; }, 1500);
        } catch (err) {
            alert(err.message);
        }
    });

    document.getElementById('add-question-btn').addEventListener('click', addQuestionForm);

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
        window.location.href = '/login.html';
    });

    // ==================
    // INIT — load quiz data
    // ==================

    (async () => {
        try {
            const [quiz, questions, categories] = await Promise.all([
                fetch(`/quizzes/${quizId}`, { headers: authHeaders }).then(r => r.json()),
                fetch(`/admin/quizzes/${quizId}/questions`, { headers: authHeaders }).then(r => r.json()),
                fetch('/categories', { headers: authHeaders }).then(r => r.json()),
            ]);

            const sel = document.getElementById('category');
            sel.innerHTML = '';
            categories.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name;
                if (c.id === quiz.categoryId) opt.selected = true;
                sel.appendChild(opt);
            });

            document.getElementById('title').value = quiz.title ?? '';
            document.getElementById('description').value = quiz.description ?? '';

            renderExistingQuestions(questions);
        } catch (err) {
            console.error('Failed to load quiz:', err);
            alert('Failed to load quiz data');
        }
    })();
})();