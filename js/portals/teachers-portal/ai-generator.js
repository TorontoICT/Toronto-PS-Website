// js/portals/teachers-portal/ai-generator.js

/**
 * Initializes the AI Content Generator tool with its tabs and form submissions.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherData - The authenticated teacher's data.
 */
function setupAiContentGenerator(db, teacherData) {
    loadAiGenerationHistory(db, teacherData.uid);

    const tabs = { quiz: document.getElementById('ai-tab-quiz'), assessment: document.getElementById('ai-tab-assessment'), lesson: document.getElementById('ai-tab-lesson') };
    const forms = { quiz: document.getElementById('ai-form-quiz'), assessment: document.getElementById('ai-form-assessment'), lesson: document.getElementById('ai-form-lesson') };
    const formTitle = document.getElementById('ai-gen-form-title');

    Object.keys(tabs).forEach(key => {
        if (tabs[key]) {
            tabs[key].addEventListener('click', () => {
                Object.values(tabs).forEach(t => t.classList.remove('active'));
                tabs[key].classList.add('active');
                Object.values(forms).forEach(f => f.classList.remove('active'));
                forms[key].classList.add('active');
                formTitle.textContent = `${key.charAt(0).toUpperCase() + key.slice(1)} Settings`;
            });
        }
    });

    if (forms.quiz) forms.quiz.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = { topic: e.target.elements['quiz-topic'].value, numQuestions: parseInt(e.target.elements['quiz-num-questions'].value, 10), difficulty: e.target.elements['quiz-difficulty'].value, questionType: e.target.elements['quiz-question-type'].value };
        generateAiContent(db, teacherData, 'quiz', formData, e.submitter);
    });
    if (forms.assessment) forms.assessment.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = { topic: e.target.elements['assessment-topic'].value, gradeLevel: e.target.elements['assessment-grade-level'].value, assessmentType: e.target.elements['assessment-type'].value, duration: parseInt(e.target.elements['assessment-duration'].value, 10) };
        generateAiContent(db, teacherData, 'assessment', formData, e.submitter);
    });
    if (forms.lesson) forms.lesson.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = { topic: e.target.elements['lesson-topic'].value, gradeLevel: e.target.elements['lesson-grade-level'].value, duration: parseInt(e.target.elements['lesson-duration'].value, 10), objectives: e.target.elements['lesson-objectives'].value, standards: e.target.elements['lesson-standards'].value };
        generateAiContent(db, teacherData, 'lesson', formData, e.submitter);
    });

    setupQuizLinkGenerator();
}

/**
 * Generates content using the Gemini AI model.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherData - The authenticated teacher's data.
 * @param {string} type - The type of content to generate ('quiz', 'assessment', 'lesson').
 * @param {object} formData - The data from the corresponding form.
 * @param {HTMLButtonElement} submitButton - The button that triggered the submission.
 */
async function generateAiContent(db, teacherData, type, formData, submitButton) {
    const placeholder = document.getElementById('ai-gen-placeholder');
    const loading = document.getElementById('ai-gen-loading');
    const errorContainer = document.getElementById('ai-gen-error');
    const errorText = document.getElementById('ai-gen-error-text');
    const resultContainer = document.getElementById('ai-gen-result');
    const actionButtons = document.querySelector('.ai-gen-actions');

    placeholder.style.display = 'none';
    errorContainer.style.display = 'none';
    resultContainer.textContent = '';
    actionButtons.style.display = 'none';
    loading.style.display = 'flex';
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Generating...';

    let prompt = '';
    if (type === 'quiz') {
        prompt = `Generate a ${formData.difficulty} difficulty quiz about "${formData.topic}" with ${formData.numQuestions} ${formData.questionType} questions. Format the output as follows: - Include the question number and question text - For multiple-choice: provide 4 options (A, B, C, D) - Include an answer key at the end - Add brief explanations for each correct answer. Make it educational and engaging.`;
    } else if (type === 'assessment') {
        prompt = `Create a comprehensive ${formData.assessmentType} assessment for ${formData.gradeLevel} students about "${formData.topic}". Duration: ${formData.duration} minutes. Include: 1. Clear instructions for students 2. Multiple question types (multiple choice, short answer, essay questions) 3. Point values for each section 4. Grading rubric 5. Answer key with explanations. Make it aligned with educational standards and appropriate for the grade level.`;
    } else if (type === 'lesson') {
        prompt = `Create a detailed ${formData.duration}-minute lesson plan for ${formData.gradeLevel} students about "${formData.topic}". ${formData.objectives ? `Learning Objectives: ${formData.objectives}` : ''} ${formData.standards ? `Standards: ${formData.standards}` : ''} Include: 1. Learning objectives 2. Materials needed 3. Warm-up activity (5-10 minutes) 4. Main instruction with activities (step-by-step) 5. Guided practice 6. Independent practice 7. Assessment/checking for understanding 8. Closure/summary 9. Differentiation strategies 10. Homework/extension activities. Format it clearly with time allocations for each section.`;
    }

    try {
        const apiKey = 'AIzaSyA8dv0qDcB9jDX2TnwKckhRKEgc2mVDY0c'; // Replace with your actual API key
        const modelName = 'gemini-1.5-flash'; // Correct model name
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 8192 } })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to generate content from API.');
        }

        const data = await response.json();
        const generatedText = data.candidates[0]?.content?.parts[0]?.text || 'No content was generated. Please try again.';

        await db.collection('ai_generated_content').add({
            teacherId: teacherData.uid, type, topic: formData.topic, content: generatedText,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        loadAiGenerationHistory(db, teacherData.uid);

        loading.style.display = 'none';
        resultContainer.textContent = generatedText;
        actionButtons.style.display = 'flex';
        document.getElementById('ai-gen-download-btn').onclick = () => downloadAiContent(generatedText, type);
        document.getElementById('ai-gen-pdf-btn').onclick = () => saveAiContentAsPdf(generatedText, type, formData.topic);
    } catch (err) {
        loading.style.display = 'none';
        errorText.textContent = err.message || 'An unknown error occurred.';
        errorContainer.style.display = 'flex';
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-cogs"></i> Generate';
    }
}

/**
 * Loads the user's AI generation history from Firestore.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {string} teacherId - The UID of the current teacher.
 */
async function loadAiGenerationHistory(db, teacherId) {
    const historyList = document.getElementById('ai-gen-history-list');
    if (!historyList) return;

    try {
        const snapshot = await db.collection('ai_generated_content').where('teacherId', '==', teacherId).orderBy('createdAt', 'desc').limit(10).get();
        if (snapshot.empty) {
            historyList.innerHTML = '<p class="info-message">No history found. Generate some content to see it here!</p>';
            return;
        }

        historyList.innerHTML = snapshot.docs.map(doc => {
            const item = doc.data();
            const icon = item.type === 'quiz' ? 'fa-clipboard-list' : (item.type === 'assessment' ? 'fa-file-alt' : 'fa-book-open');
            return `
                <li data-doc-id="${doc.id}">
                    <div class="history-item-content" data-content="${escape(item.content)}" data-type="${item.type}" data-topic="${escape(item.topic)}" style="cursor: pointer; flex-grow: 1; display: flex; align-items: center; gap: 10px;">
                        <i class="fas ${icon}"></i>
                        <span>${item.type.charAt(0).toUpperCase() + item.type.slice(1)}: ${item.topic}</span>
                    </div>
                    <button class="cta-button-small danger" onclick="deleteAiHistoryItem('${doc.id}')" title="Delete this item"><i class="fas fa-trash-alt"></i></button>
                </li>`;
        }).join('');

        historyList.querySelectorAll('.history-item-content').forEach(item => {
            item.addEventListener('click', () => {
                const content = unescape(item.dataset.content);
                const type = item.dataset.type;
                const topic = unescape(item.dataset.topic);
                document.getElementById('ai-gen-placeholder').style.display = 'none';
                document.getElementById('ai-gen-loading').style.display = 'none';
                document.getElementById('ai-gen-error').style.display = 'none';
                document.getElementById('ai-gen-result').textContent = content;
                document.querySelector('.ai-gen-actions').style.display = 'flex';
                document.getElementById('ai-gen-download-btn').onclick = () => downloadAiContent(content, type);
                document.getElementById('ai-gen-pdf-btn').onclick = () => saveAiContentAsPdf(content, type, topic);
            });
        });
    } catch (error) {
        console.error("Error loading AI generation history:", error);
        historyList.innerHTML = '<p class="error-message">Could not load history.</p>';
    }
}

/**
 * Deletes a specific item from the AI generation history.
 * @param {string} docId - The Firestore document ID of the history item to delete.
 */
async function deleteAiHistoryItem(docId) {
    if (!confirm('Are you sure you want to permanently delete this history item?')) return;
    try {
        await firebase.firestore().collection('ai_generated_content').doc(docId).delete();
        const listItem = document.querySelector(`li[data-doc-id="${docId}"]`);
        if (listItem) listItem.remove();
        const historyList = document.getElementById('ai-gen-history-list');
        if (!historyList.querySelector('li')) {
            historyList.innerHTML = '<p class="info-message">No history found. Generate some content to see it here!</p>';
        }
    } catch (error) {
        console.error("Error deleting history item:", error);
        alert('Failed to delete the history item. Please try again.');
    }
}

/**
 * Triggers a file download for the generated AI content.
 * @param {string} content - The text content to download.
 * @param {string} type - The type of content, used for the filename.
 */
function downloadAiContent(content, type) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-content-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Formats the generated content and triggers a print-to-PDF dialog.
 * @param {string} content - The text content to save as PDF.
 * @param {string} type - The type of content.
 * @param {string} topic - The topic of the content.
 */
function saveAiContentAsPdf(content, type, topic) {
    const printableContainer = document.getElementById('ai-gen-printable-content');
    const printableTitle = document.getElementById('printable-title');
    printableTitle.textContent = `AI-Generated ${type.charAt(0).toUpperCase() + type.slice(1)}: ${topic}`;
    const contentHolder = document.createElement('div');
    contentHolder.className = 'ai-gen-result-text';
    contentHolder.innerHTML = content.replace(/\n/g, '<br>');
    printableContainer.appendChild(contentHolder);
    window.print();
    printableContainer.removeChild(contentHolder);
}

/**
 * Initializes the Quiz Link Generator tool.
 */
function setupQuizLinkGenerator() {
    const generateBtn = document.getElementById('generate-quiz-link-btn');
    const copyBtn = document.getElementById('copy-quiz-link-btn');
    const outputArea = document.getElementById('quiz-link-output-area');
    const linkInput = document.getElementById('generated-quiz-link');

    if (!generateBtn) return;

    generateBtn.addEventListener('click', () => {
        const category = document.getElementById('quiz-category').value;
        const difficulty = document.getElementById('quiz-difficulty').value;
        const amount = document.getElementById('quiz-amount').value;
        const baseUrl = window.location.origin + '/html/auth/learners-portal.html';
        const params = new URLSearchParams({ category, difficulty, amount });
        linkInput.value = `${baseUrl}#quiz?${params.toString()}`;
        outputArea.style.display = 'block';
    });

    copyBtn.addEventListener('click', () => {
        linkInput.select();
        document.execCommand('copy');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Link'; }, 2000);
    });
}