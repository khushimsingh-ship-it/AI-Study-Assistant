// ==========================================
// AI STUDY ASSISTANT - MAIN JAVASCRIPT
// ==========================================

let currentQuiz = [];
let currentQuestionIndex = 0;
let currentQuizTopic = "";


// ==========================================
// SECTION NAVIGATION
// ==========================================

function showSection(sectionId, clickedItem = null) {

    const sections = document.querySelectorAll(".page-section");

    sections.forEach(section => {
        section.classList.add("hidden");
    });

    const selectedSection = document.getElementById(sectionId);

    if (selectedSection) {
        selectedSection.classList.remove("hidden");
    }

    // Update active sidebar item
    const navItems = document.querySelectorAll(".nav-item");

    navItems.forEach(item => {
        item.classList.remove("active");
    });

    if (clickedItem) {
        clickedItem.classList.add("active");
    }

    // Load required data
    if (sectionId === "dashboard") {
        loadDashboardStats();
    }

    if (sectionId === "progress") {
        loadProgress();
    }

    if (sectionId === "notes") {
        loadNotes();
    }
}


// ==========================================
// ENTER KEY HANDLER
// ==========================================

function handleEnter(event) {

    if (event.key === "Enter") {
        askQuestion();
    }
}


// ==========================================
// DASHBOARD AI QUESTION
// ==========================================

async function askQuestion() {

    const input = document.getElementById("question");
    const answerBox = document.getElementById("dashboardAnswer");

    if (!input || !answerBox) {
        return;
    }

    const question = input.value.trim();

    if (!question) {
        answerBox.innerHTML = "<p>Please enter a question.</p>";
        return;
    }

    answerBox.innerHTML = "<p>🤖 Thinking...</p>";

    try {

        const response = await fetch("/ask", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                question: question
            })

        });

        const data = await response.json();

        if (!response.ok) {
            answerBox.innerHTML =
                `<p>❌ ${escapeHtml(data.message || "Something went wrong.")}</p>`;
            return;
        }

        answerBox.innerHTML =
            `<div>${formatAnswer(data.answer || "")}</div>`;

        input.value = "";

    } catch (error) {

        console.error("Ask Error:", error);

        answerBox.innerHTML =
            "<p>❌ Unable to connect to the AI server.</p>";
    }
}


// ==========================================
// AI CHAT
// ==========================================

async function askChatQuestion() {

    const input = document.getElementById("chatQuestion");
    const answerBox = document.getElementById("chatAnswer");

    if (!input || !answerBox) {
        return;
    }

    const question = input.value.trim();

    if (!question) {
        answerBox.innerHTML = "<p>Please enter a question.</p>";
        return;
    }

    answerBox.innerHTML = "<p>🤖 Thinking...</p>";

    try {

        const response = await fetch("/ask", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                question: question
            })

        });

        const data = await response.json();

        if (!response.ok) {

            answerBox.innerHTML =
                `<p>❌ ${escapeHtml(data.message || "AI request failed.")}`;

            return;
        }

        answerBox.innerHTML =
            `<div>${formatAnswer(data.answer || "")}</div>`;

        input.value = "";

    } catch (error) {

        console.error("Chat Error:", error);

        answerBox.innerHTML =
            "<p>❌ Unable to connect to the AI server.</p>";
    }
}


// ==========================================
// GENERATE AI QUIZ
// ==========================================

async function generateQuiz() {

    const topicInput = document.getElementById("quizTopic");
    const numberInput = document.getElementById("quizNumber");
    const message = document.getElementById("quizMessage");

    if (!topicInput || !numberInput) {
        return;
    }

    const topic = topicInput.value.trim();
    const number = parseInt(numberInput.value);

    if (!topic) {

        if (message) {
            message.innerHTML = "❌ Please enter a topic.";
        }

        return;
    }

    if (!number || number < 1 || number > 20) {

        if (message) {
            message.innerHTML =
                "❌ Number of questions must be between 1 and 20.";
        }

        return;
    }

    if (message) {
        message.innerHTML = "🤖 Generating quiz...";
    }

    try {

        const response = await fetch("/generate-quiz", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                topic: topic,
                number: number
            })

        });

        const data = await response.json();

        if (!response.ok) {

            console.error("Quiz Generation Error:", data);

            if (message) {
                message.innerHTML =
                    `❌ ${escapeHtml(data.message || "Unable to generate quiz.")}`;
            }

            return;
        }

        if (!data.quiz || data.quiz.length === 0) {

            if (message) {
                message.innerHTML =
                    "❌ No questions were generated.";
            }

            return;
        }

        currentQuiz = data.quiz;
        currentQuestionIndex = 0;
        currentQuizTopic = topic;

        // Hide setup
        const quizSetup = document.getElementById("quizSetup");

        if (quizSetup) {
            quizSetup.classList.add("hidden");
        }

        // Show quiz
        const quizArea = document.getElementById("quizArea");

        if (quizArea) {
            quizArea.classList.remove("hidden");
        }

        // Set topic
        const topicDisplay =
            document.getElementById("quizTopicDisplay");

        if (topicDisplay) {
            topicDisplay.textContent = topic;
        }

        renderQuizQuestion();

    } catch (error) {

        console.error("Generate Quiz Error:", error);

        if (message) {
            message.innerHTML =
                "❌ Unable to connect to the server.";
        }
    }
}


// ==========================================
// RENDER QUIZ QUESTION
// ==========================================

function renderQuizQuestion() {

    if (!currentQuiz || currentQuiz.length === 0) {
        return;
    }

    const questionData = currentQuiz[currentQuestionIndex];

    if (!questionData) {
        return;
    }

    const questionNumber =
        document.getElementById("currentQuestion");

    const totalQuestions =
        document.getElementById("totalQuestions");

    const questionBox =
        document.getElementById("quizQuestions");

    if (questionNumber) {
        questionNumber.textContent =
            currentQuestionIndex + 1;
    }

    if (totalQuestions) {
        totalQuestions.textContent =
            currentQuiz.length;
    }

    if (!questionBox) {
        return;
    }

    const questionText =
        questionData.question || "Question";

    const options =
        Array.isArray(questionData.options)
            ? questionData.options
            : [];

    let html = "";

    html += `
        <div class="quiz-question">

            <h3>
                ${currentQuestionIndex + 1}.
                ${escapeHtml(questionText)}
            </h3>

            <div class="quiz-options">
    `;

    options.forEach((option, index) => {

        const selected =
            questionData.selected === index
                ? "selected"
                : "";

        html += `
            <button
                type="button"
                class="quiz-option ${selected}"
                onclick="selectAnswer(${index})"
            >
                <strong>${String.fromCharCode(65 + index)}.</strong>
                ${escapeHtml(option)}
            </button>
        `;
    });

    html += `
            </div>
        </div>
    `;

    questionBox.innerHTML = html;

    updateQuizButtons();
}


// ==========================================
// SELECT ANSWER
// ==========================================

function selectAnswer(index) {

    if (!currentQuiz[currentQuestionIndex]) {
        return;
    }

    currentQuiz[currentQuestionIndex].selected = index;

    renderQuizQuestion();
}


// ==========================================
// PREVIOUS QUESTION
// ==========================================

function previousQuestion() {

    if (currentQuestionIndex > 0) {

        currentQuestionIndex--;

        renderQuizQuestion();
    }
}


// ==========================================
// NEXT QUESTION
// ==========================================

function nextQuestion() {

    if (currentQuestionIndex < currentQuiz.length - 1) {

        currentQuestionIndex++;

        renderQuizQuestion();
    }
}


// ==========================================
// QUIZ BUTTONS
// FIXED: SUBMIT BUTTON ON LAST QUESTION
// ==========================================

function updateQuizButtons() {

    const previousButton =
        document.getElementById("previousButton");

    const nextButton =
        document.getElementById("nextButton");

    const submitButton =
        document.getElementById("submitButton");

    const isLastQuestion =
        currentQuestionIndex === currentQuiz.length - 1;

    if (previousButton) {

        previousButton.disabled =
            currentQuestionIndex === 0;
    }

    if (nextButton) {

        nextButton.style.display =
            isLastQuestion
                ? "none"
                : "inline-block";
    }

    if (submitButton) {

        if (isLastQuestion) {

            submitButton.classList.remove("hidden");

            submitButton.style.display =
                "inline-block";

        } else {

            submitButton.classList.add("hidden");

            submitButton.style.display =
                "none";
        }
    }
}


// ==========================================
// SUBMIT QUIZ
// ==========================================

async function submitQuiz() {

    if (!currentQuiz || currentQuiz.length === 0) {
        return;
    }

    let score = 0;

    currentQuiz.forEach(question => {

        if (
            question.selected !== undefined &&
            Number(question.selected) === Number(question.answer)
        ) {
            score++;
        }

    });

    const total = currentQuiz.length;

    const percentage =
        Math.round((score / total) * 10000) / 100;

    // Show result
    const quizArea =
        document.getElementById("quizArea");

    const quizResult =
        document.getElementById("quizResult");

    const finalScore =
        document.getElementById("finalScore");

    const finalPercentage =
        document.getElementById("finalPercentage");

    const resultMessage =
        document.getElementById("resultMessage");

    if (quizArea) {
        quizArea.classList.add("hidden");
    }

    if (quizResult) {
        quizResult.classList.remove("hidden");
    }

    if (finalScore) {
        finalScore.textContent =
            `${score} / ${total}`;
    }

    if (finalPercentage) {
        finalPercentage.textContent =
            percentage;
    }

    if (resultMessage) {

        if (percentage >= 80) {

            resultMessage.textContent =
                "🎉 Excellent performance!";

        } else if (percentage >= 60) {

            resultMessage.textContent =
                "👍 Good job! Keep practicing.";

        } else if (percentage >= 40) {

            resultMessage.textContent =
                "📚 Keep studying and try again.";

        } else {

            resultMessage.textContent =
                "💪 Don't give up. Practice more!";
        }
    }

    renderAnswerReview();

    // Save result to database
    try {

        const response = await fetch("/quiz-result", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                topic: currentQuizTopic,

                score: score,

                total: total,

                total_questions: total,

                percentage: percentage

            })

        });

        const data = await response.json();

        console.log("Quiz result response:", data);

        if (!response.ok) {

            console.error(
                "Quiz result save failed:",
                data
            );

            return;
        }

        console.log(
            "Quiz result saved successfully."
        );

        // Refresh dashboard and progress immediately
        await loadDashboardStats();
        await loadProgress();

    } catch (error) {

        console.error(
            "Quiz Result Error:",
            error
        );
    }
}


// ==========================================
// ANSWER REVIEW
// ==========================================

function renderAnswerReview() {

    const reviewBox =
        document.getElementById("answerReview");

    if (!reviewBox) {
        return;
    }

    let html = "";

    currentQuiz.forEach((question, index) => {

        const selected =
            question.selected !== undefined
                ? Number(question.selected)
                : -1;

        const correct =
            Number(question.answer);

        const isCorrect =
            selected === correct;

        html += `
            <div class="card note-card">

                <h3>
                    ${index + 1}. ${escapeHtml(question.question)}
                </h3>

                <p>
                    <strong>Your answer:</strong>
                    ${
                        selected >= 0 &&
                        question.options[selected]
                            ? escapeHtml(question.options[selected])
                            : "Not answered"
                    }
                </p>

                <p>
                    <strong>Correct answer:</strong>
                    ${
                        question.options[correct]
                            ? escapeHtml(question.options[correct])
                            : "N/A"
                    }
                </p>

                <p>
                    ${
                        isCorrect
                            ? "✅ Correct"
                            : "❌ Incorrect"
                    }
                </p>

            </div>
        `;
    });

    reviewBox.innerHTML = html;
}


// ==========================================
// RESTART QUIZ
// ==========================================

function restartQuiz() {

    currentQuiz = [];
    currentQuestionIndex = 0;
    currentQuizTopic = "";

    const quizResult =
        document.getElementById("quizResult");

    const quizSetup =
        document.getElementById("quizSetup");

    const quizMessage =
        document.getElementById("quizMessage");

    const answerReview =
        document.getElementById("answerReview");

    if (quizResult) {
        quizResult.classList.add("hidden");
    }

    if (quizSetup) {
        quizSetup.classList.remove("hidden");
    }

    if (quizMessage) {
        quizMessage.innerHTML = "";
    }

    if (answerReview) {
        answerReview.innerHTML = "";
    }

    loadDashboardStats();
    loadProgress();
}


// ==========================================
// SAVE NOTE
// ==========================================

async function saveNote() {

    const titleInput =
        document.getElementById("noteTitle");

    const contentInput =
        document.getElementById("noteContent");

    const message =
        document.getElementById("noteMessage");

    if (!titleInput || !contentInput) {
        return;
    }

    const title =
        titleInput.value.trim();

    const content =
        contentInput.value.trim();

    if (!title || !content) {

        if (message) {
            message.innerHTML =
                "❌ Please enter both title and content.";
        }

        return;
    }

    try {

        const response = await fetch("/notes", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                title: title,
                content: content
            })

        });

        const data = await response.json();

        if (!response.ok) {

            if (message) {
                message.innerHTML =
                    `❌ ${escapeHtml(data.message || "Unable to save note.")}`;
            }

            return;
        }

        if (message) {
            message.innerHTML =
                "✅ Note saved successfully!";
        }

        titleInput.value = "";
        contentInput.value = "";

        await loadNotes();
        await loadDashboardStats();

    } catch (error) {

        console.error("Save Note Error:", error);

        if (message) {
            message.innerHTML =
                "❌ Unable to connect to server.";
        }
    }
}


// ==========================================
// LOAD NOTES
// ==========================================

async function loadNotes() {

    const notesList =
        document.getElementById("notesList");

    if (!notesList) {
        return;
    }

    try {

        const response =
            await fetch("/notes");

        const notes =
            await response.json();

        if (!response.ok) {

            notesList.innerHTML =
                "<p>Unable to load notes.</p>";

            return;
        }

        if (!notes || notes.length === 0) {

            notesList.innerHTML =
                "<p>No notes available yet.</p>";

            return;
        }

        let html = "";

        notes.forEach(note => {

            html += `
                <div class="card note-card">

                    <div class="note-header">

                        <h3>
                            ${escapeHtml(note.title)}
                        </h3>

                        <button
                            type="button"
                            class="delete-button"
                            onclick="deleteNote(${note.id})"
                            title="Delete note"
                        >
                            🗑️
                        </button>

                    </div>

                    <p>
                        ${escapeHtml(note.content)}
                    </p>

                    <small>
                        ${formatDate(note.created_at)}
                    </small>

                </div>
            `;
        });

        notesList.innerHTML = html;

    } catch (error) {

        console.error("Load Notes Error:", error);

        notesList.innerHTML =
            "<p>❌ Unable to load notes.</p>";
    }
}


// ==========================================
// DELETE NOTE
// ==========================================

async function deleteNote(id) {

    if (!confirm("Are you sure you want to delete this note?")) {
        return;
    }

    try {

        const response =
            await fetch(`/notes/${id}`, {
                method: "DELETE"
            });

        const data =
            await response.json();

        if (!response.ok) {

            alert(
                data.message ||
                "Unable to delete note."
            );

            return;
        }

        await loadNotes();
        await loadDashboardStats();

    } catch (error) {

        console.error("Delete Note Error:", error);

        alert(
            "Unable to connect to server."
        );
    }
}


// ==========================================
// LOAD DASHBOARD STATS
// ==========================================

async function loadDashboardStats() {

    console.log(
        "Loading dashboard statistics..."
    );

    try {

        const response =
            await fetch("/stats");

        const data =
            await response.json();

        console.log(
            "Dashboard stats:",
            data
        );

        if (!response.ok) {
            return;
        }

        // Dashboard Notes
        const notes =
            document.getElementById(
                "dashboardNotes"
            );

        if (notes) {
            notes.textContent =
                data.notes ?? 0;
        }

        // Dashboard Quizzes
        const quizzes =
            document.getElementById(
                "dashboardQuizzes"
            );

        if (quizzes) {
            quizzes.textContent =
                data.quizzes ?? 0;
        }

        // Dashboard Average Score
        const score =
            document.getElementById(
                "dashboardScore"
            );

        if (score) {

            // FIXED: index.html already contains %
            score.textContent =
                data.average ?? 0;
        }

        // Progress page
        const progressNotes =
            document.getElementById(
                "progressNotes"
            );

        if (progressNotes) {
            progressNotes.textContent =
                data.notes ?? 0;
        }

        const progressQuizzes =
            document.getElementById(
                "progressQuizzes"
            );

        if (progressQuizzes) {
            progressQuizzes.textContent =
                data.quizzes ?? 0;
        }

        const progressAverage =
            document.getElementById(
                "progressAverage"
            );

        if (progressAverage) {

            // FIXED: index.html already contains %
            progressAverage.textContent =
                data.average ?? 0;
        }

    } catch (error) {

        console.error(
            "Dashboard Stats Error:",
            error
        );
    }
}


// ==========================================
// LOAD PROGRESS / QUIZ HISTORY
// ==========================================

async function loadProgress() {

    const historyBox =
        document.getElementById("quizHistory");

    // Load statistics too
    await loadDashboardStats();

    if (!historyBox) {
        return;
    }

    try {

        const response =
            await fetch("/quiz-results");

        const results =
            await response.json();

        console.log(
            "Quiz history:",
            results
        );

        if (!response.ok) {

            historyBox.innerHTML =
                "<p>Unable to load quiz history.</p>";

            return;
        }

        if (!results || results.length === 0) {

            historyBox.innerHTML =
                "<p>No quiz attempts yet.</p>";

            return;
        }

        let html = "";

        results.forEach(result => {

            html += `
                <div class="card note-card">

                    <div class="note-header">

                        <h3>
                            ${escapeHtml(
                                result.topic || "Unknown Topic"
                            )}
                        </h3>

                        <strong>
                            ${result.percentage ?? 0}%
                        </strong>

                    </div>

                    <p>
                        Score:
                        <strong>
                            ${result.score ?? 0}
                            /
                            ${result.total_questions ?? 0}
                        </strong>
                    </p>

                    <small>
                        ${formatDate(result.created_at)}
                    </small>

                </div>
            `;
        });

        historyBox.innerHTML = html;

    } catch (error) {

        console.error(
            "Load Progress Error:",
            error
        );

        historyBox.innerHTML =
            "<p>❌ Unable to load quiz history.</p>";
    }
}


// ==========================================
// SETTINGS
// ==========================================

function saveSettings() {

    const nameInput =
        document.getElementById("studentName");

    const courseInput =
        document.getElementById("studentCourse");

    const collegeInput =
        document.getElementById("studentCollege");

    const message =
        document.getElementById("settingsMessage");

    if (!nameInput) {
        return;
    }

    const settings = {

        name:
            nameInput.value.trim(),

        course:
            courseInput
                ? courseInput.value.trim()
                : "",

        college:
            collegeInput
                ? collegeInput.value.trim()
                : ""

    };

    localStorage.setItem(
        "studyAssistantSettings",
        JSON.stringify(settings)
    );

    updateStudentName();

    if (message) {
        message.innerHTML =
            "✅ Settings saved successfully!";
    }
}


// ==========================================
// LOAD SETTINGS
// ==========================================

function loadSettings() {

    const saved =
        localStorage.getItem(
            "studyAssistantSettings"
        );

    if (!saved) {
        return;
    }

    try {

        const settings =
            JSON.parse(saved);

        const nameInput =
            document.getElementById(
                "studentName"
            );

        const courseInput =
            document.getElementById(
                "studentCourse"
            );

        const collegeInput =
            document.getElementById(
                "studentCollege"
            );

        if (nameInput) {
            nameInput.value =
                settings.name || "";
        }

        if (courseInput) {
            courseInput.value =
                settings.course || "";
        }

        if (collegeInput) {
            collegeInput.value =
                settings.college || "";
        }

    } catch (error) {

        console.error(
            "Settings Error:",
            error
        );
    }
}


// ==========================================
// UPDATE STUDENT NAME
// ==========================================

function updateStudentName() {

    const dashboardName =
        document.getElementById(
            "dashboardName"
        );

    if (!dashboardName) {
        return;
    }

    const saved =
        localStorage.getItem(
            "studyAssistantSettings"
        );

    if (!saved) {

        dashboardName.textContent =
            "Student";

        return;
    }

    try {

        const settings =
            JSON.parse(saved);

        dashboardName.textContent =
            settings.name || "Student";

    } catch (error) {

        dashboardName.textContent =
            "Student";
    }
}


// ==========================================
// FORMAT AI ANSWER
// ==========================================

function formatAnswer(answer) {

    if (!answer) {
        return "";
    }

    let text =
        escapeHtml(String(answer));

    // Convert markdown bold
    text =
        text.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );

    // Convert markdown italic
    text =
        text.replace(
            /\*(.*?)\*/g,
            "<em>$1</em>"
        );

    // Convert line breaks
    text =
        text.replace(
            /\n/g,
            "<br>"
        );

    return text;
}


// ==========================================
// SECURITY - ESCAPE HTML
// ==========================================

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ==========================================
// FORMAT DATE
// ==========================================

function formatDate(dateString) {

    if (!dateString) {
        return "";
    }

    try {

        const date =
            new Date(
                dateString.replace(" ", "T") + "Z"
            );

        if (isNaN(date.getTime())) {
            return dateString;
        }

        return date.toLocaleString();

    } catch (error) {

        return dateString;
    }
}


// ==========================================
// PAGE INITIALIZATION
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "AI Study Assistant JavaScript loaded."
        );

        // Load saved settings
        loadSettings();

        // Update dashboard name
        updateStudentName();

        // Load notes
        loadNotes();

        // Load dashboard statistics
        loadDashboardStats();

        // Load quiz history
        loadProgress();

    }
);