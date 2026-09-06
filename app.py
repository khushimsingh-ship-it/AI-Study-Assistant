from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from google import genai

import sqlite3
import os
import json
import re


# =========================================================
# APP CONFIGURATION
# =========================================================

app = Flask(__name__)

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.5-flash"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_DIR = os.path.join(BASE_DIR, "database")
DATABASE_PATH = os.path.join(DATABASE_DIR, "study_assistant.db")

os.makedirs(DATABASE_DIR, exist_ok=True)


# =========================================================
# GEMINI CONFIGURATION
# =========================================================

if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY is not configured.")

client = None

if GEMINI_API_KEY:
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        print("Gemini initialization error:", e)


# =========================================================
# DATABASE
# =========================================================

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def initialize_database():
    conn = get_db_connection()

    # Notes table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Quiz results table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS quiz_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic TEXT NOT NULL,
            score INTEGER NOT NULL,
            total_questions INTEGER NOT NULL,
            percentage REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()


initialize_database()


# =========================================================
# HOME
# =========================================================

@app.route("/")
def home():
    return render_template("index.html")


# =========================================================
# AI CHAT
# =========================================================

@app.route("/ask", methods=["POST"])
def ask():
    try:
        data = request.get_json(silent=True) or {}

        question = data.get("question", "").strip()

        if not question:
            return jsonify({
                "message": "Please enter a question."
            }), 400

        if not client:
            return jsonify({
                "message": "Gemini API key is not configured."
            }), 500

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=f"""
You are an AI Study Assistant.

Answer the student's question clearly and accurately.

Question:
{question}

Rules:
- Explain in simple student-friendly language.
- Use examples when useful.
- For technical questions, provide structured explanations.
- Do not unnecessarily make the answer very long.
"""
        )

        answer = response.text.strip()

        return jsonify({
            "answer": answer
        })

    except Exception as e:
        print("AI CHAT ERROR:", e)

        return jsonify({
            "message": "Unable to get an AI response.",
            "error": str(e)
        }), 500


# =========================================================
# NOTES - GET
# =========================================================

@app.route("/notes", methods=["GET"])
def get_notes():
    try:
        conn = get_db_connection()

        notes = conn.execute("""
            SELECT id, title, content, created_at
            FROM notes
            ORDER BY id DESC
        """).fetchall()

        conn.close()

        return jsonify([
            dict(note)
            for note in notes
        ])

    except Exception as e:
        print("GET NOTES ERROR:", e)

        return jsonify({
            "message": "Unable to load notes.",
            "error": str(e)
        }), 500


# =========================================================
# NOTES - CREATE
# =========================================================

@app.route("/notes", methods=["POST"])
def create_note():
    try:
        data = request.get_json(silent=True) or {}

        title = data.get("title", "").strip()
        content = data.get("content", "").strip()

        if not title:
            return jsonify({
                "message": "Please enter a note title."
            }), 400

        if not content:
            return jsonify({
                "message": "Please enter note content."
            }), 400

        conn = get_db_connection()

        cursor = conn.execute("""
            INSERT INTO notes (title, content)
            VALUES (?, ?)
        """, (title, content))

        conn.commit()

        note_id = cursor.lastrowid

        conn.close()

        return jsonify({
            "message": "Note saved successfully.",
            "id": note_id
        }), 201

    except Exception as e:
        print("CREATE NOTE ERROR:", e)

        return jsonify({
            "message": "Unable to save note.",
            "error": str(e)
        }), 500


# =========================================================
# NOTES - DELETE
# =========================================================

@app.route("/notes/<int:note_id>", methods=["DELETE"])
def delete_note(note_id):
    try:
        conn = get_db_connection()

        cursor = conn.execute("""
            DELETE FROM notes
            WHERE id = ?
        """, (note_id,))

        conn.commit()

        deleted = cursor.rowcount

        conn.close()

        if deleted == 0:
            return jsonify({
                "message": "Note not found."
            }), 404

        return jsonify({
            "message": "Note deleted successfully."
        })

    except Exception as e:
        print("DELETE NOTE ERROR:", e)

        return jsonify({
            "message": "Unable to delete note.",
            "error": str(e)
        }), 500


# =========================================================
# GENERATE AI QUIZ
# =========================================================

@app.route("/generate-quiz", methods=["POST"])
def generate_quiz():

    try:
        data = request.get_json(silent=True) or {}

        topic = data.get("topic", "").strip()

        try:
            number = int(data.get("number", 5))
        except (TypeError, ValueError):
            number = 5

        if not topic:
            return jsonify({
                "message": "Please enter a quiz topic."
            }), 400

        if number < 1:
            number = 1

        if number > 10:
            number = 10

        print("\n==============================")
        print("GENERATING AI QUIZ")
        print("Topic:", topic)
        print("Questions:", number)
        print("==============================")

        if not client:
            return jsonify({
                "message": "Gemini API key is not configured."
            }), 500

        prompt = f"""
Create a multiple-choice quiz for a student.

Topic: {topic}
Number of questions: {number}

Return ONLY a valid JSON array.

Do not use Markdown.
Do not use ```json.
Do not add any text before or after the JSON.

Each question MUST have exactly this structure:

[
  {{
    "question": "Question text",
    "options": [
      "Option A",
      "Option B",
      "Option C",
      "Option D"
    ],
    "answer": 0,
    "explanation": "Short explanation"
  }}
]

Important:
- "options" must contain exactly 4 strings.
- "answer" must be an integer.
- "answer" must be 0, 1, 2, or 3.
- The answer number represents the correct option index.
- Make the questions educational and accurate.
- Do not repeat questions.
"""

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )

        raw_response = response.text.strip()

        print("RAW QUIZ RESPONSE:")
        print(raw_response)

        # -------------------------------------------------
        # Remove Markdown code fences if Gemini adds them
        # -------------------------------------------------

        cleaned_response = raw_response

        cleaned_response = re.sub(
            r"^```(?:json)?\s*",
            "",
            cleaned_response,
            flags=re.IGNORECASE
        )

        cleaned_response = re.sub(
            r"\s*```$",
            "",
            cleaned_response
        )

        cleaned_response = cleaned_response.strip()

        # -------------------------------------------------
        # Extract JSON array
        # -------------------------------------------------

        start_index = cleaned_response.find("[")
        end_index = cleaned_response.rfind("]")

        if start_index == -1 or end_index == -1:
            raise ValueError(
                "Gemini did not return a valid JSON array."
            )

        json_text = cleaned_response[
            start_index:end_index + 1
        ]

        print("EXTRACTED JSON:")
        print(json_text)

        quiz = json.loads(json_text)

        if not isinstance(quiz, list):
            raise ValueError(
                "Quiz response is not a JSON array."
            )

        # -------------------------------------------------
        # Validate questions
        # -------------------------------------------------

        validated_quiz = []

        for question in quiz:

            if not isinstance(question, dict):
                continue

            question_text = question.get("question")
            options = question.get("options")
            answer = question.get("answer")
            explanation = question.get(
                "explanation",
                ""
            )

            if not isinstance(question_text, str):
                continue

            if not isinstance(options, list):
                continue

            if len(options) != 4:
                continue

            if not all(
                isinstance(option, str)
                for option in options
            ):
                continue

            if not isinstance(answer, int):
                continue

            if answer < 0 or answer > 3:
                continue

            validated_quiz.append({
                "question": question_text.strip(),
                "options": [
                    option.strip()
                    for option in options
                ],
                "answer": answer,
                "explanation": (
                    explanation.strip()
                    if isinstance(explanation, str)
                    else ""
                )
            })

        if not validated_quiz:
            raise ValueError(
                "No valid questions were generated."
            )

        # Keep requested number if possible
        validated_quiz = validated_quiz[:number]

        print(
            f"Successfully generated "
            f"{len(validated_quiz)} questions."
        )

        return jsonify({
            "quiz": validated_quiz
        }), 200

    except Exception as e:

        print("\n==============================")
        print("QUIZ GENERATION ERROR")
        print(str(e))
        print("==============================\n")

        return jsonify({
            "message": "Unable to generate quiz.",
            "error": str(e)
        }), 500


# =========================================================
# SAVE QUIZ RESULT
# =========================================================

@app.route("/quiz-result", methods=["POST"])
def save_quiz_result():

    try:
        data = request.get_json(silent=True) or {}

        topic = str(
            data.get("topic", "Unknown")
        ).strip()

        try:
            score = int(data.get("score", 0))
        except (TypeError, ValueError):
            score = 0

        # Frontend may send either "total"
        # or "total_questions".
        try:
            total_questions = int(
                data.get(
                    "total_questions",
                    data.get("total", 0)
                )
            )
        except (TypeError, ValueError):
            total_questions = 0

        if total_questions <= 0:
            return jsonify({
                "message": "Invalid total number of questions."
            }), 400

        if score < 0:
            score = 0

        if score > total_questions:
            score = total_questions

        percentage = round(
            (score / total_questions) * 100,
            2
        )

        conn = get_db_connection()

        # IMPORTANT:
        # Existing database uses total_questions,
        # NOT total.
        conn.execute("""
            INSERT INTO quiz_results
            (
                topic,
                score,
                total_questions,
                percentage
            )
            VALUES (?, ?, ?, ?)
        """, (
            topic,
            score,
            total_questions,
            percentage
        ))

        conn.commit()
        conn.close()

        print(
            f"QUIZ RESULT SAVED: "
            f"{topic} | "
            f"{score}/{total_questions} | "
            f"{percentage}%"
        )

        return jsonify({
            "message": "Quiz result saved successfully.",
            "score": score,
            "total": total_questions,
            "percentage": percentage
        }), 200

    except Exception as e:

        print("QUIZ RESULT ERROR:", e)

        return jsonify({
            "message": "Unable to save quiz result.",
            "error": str(e)
        }), 500


# =========================================================
# QUIZ HISTORY
# =========================================================

@app.route("/quiz-results", methods=["GET"])
def get_quiz_results():

    try:
        conn = get_db_connection()

        results = conn.execute("""
            SELECT
                id,
                topic,
                score,
                total_questions,
                percentage,
                created_at
            FROM quiz_results
            ORDER BY id DESC
        """).fetchall()

        conn.close()

        return jsonify([
            dict(result)
            for result in results
        ])

    except Exception as e:

        print("GET QUIZ RESULTS ERROR:", e)

        return jsonify({
            "message": "Unable to load quiz history.",
            "error": str(e)
        }), 500


# =========================================================
# DASHBOARD STATISTICS
# =========================================================

@app.route("/stats", methods=["GET"])
def get_stats():

    try:
        conn = get_db_connection()

        notes_count = conn.execute("""
            SELECT COUNT(*) AS count
            FROM notes
        """).fetchone()["count"]

        quiz_count = conn.execute("""
            SELECT COUNT(*) AS count
            FROM quiz_results
        """).fetchone()["count"]

        average_score = conn.execute("""
            SELECT AVG(percentage) AS average
            FROM quiz_results
        """).fetchone()["average"]

        conn.close()

        return jsonify({
            "notes": notes_count,
            "quizzes": quiz_count,
            "average": round(
                average_score or 0,
                2
            )
        })

    except Exception as e:

        print("STATS ERROR:", e)

        return jsonify({
            "message": "Unable to load statistics.",
            "error": str(e)
        }), 500


# =========================================================
# RUN APPLICATION
# =========================================================

if __name__ == "__main__":

    print("======================================")
    print("AI STUDY ASSISTANT")
    print("======================================")
    print("Gemini Model:", GEMINI_MODEL)
    print("Database:", DATABASE_PATH)
    print("Server: http://127.0.0.1:5000")
    print("======================================")

    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )
