import os
import sys
import jwt
import random
import sqlite3
import subprocess
import tkinter as tk
from datetime import datetime, timedelta
from tkinter import messagebox, ttk
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import google.generativeai as genai
import threading

# --- CONFIGURAÇÕES GERAIS ---
SECRET_KEY = 'YWYQUywyueueyYWYEEUywdhwhdw'
GENAI_API_KEY = "AIzaSyDe-AA1In-JFixZxE40-IgEz1G-2j1cVyA"  # Para demonstrar uso
genai.configure(api_key=GENAI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-pro-latest')


# --- BANCO DE DADOS ---
def get_db_connection():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def create_tables():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            password TEXT,
            role TEXT,
            otp TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pdfs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic TEXT,
            path TEXT,
            created_at TEXT,
            questions TEXT
        )
    ''')
    conn.commit()
    conn.close()

class QuestionDatabase:
    def insert_pdf_record(self, topic, path, questions):
        conn = get_db_connection()
        conn.execute(
            "INSERT INTO pdfs (topic, path, created_at, questions) VALUES (?, ?, ?, ?)",
            (topic, path, datetime.now().isoformat(), "\n".join(questions))
        )
        conn.commit()
        conn.close()

    def get_all_pdfs(self):
        conn = get_db_connection()
        rows = conn.execute("SELECT * FROM pdfs").fetchall()
        conn.close()
        return [{
            "id": row["id"],
            "topic": row["topic"],
            "path": row["path"],
            "created_at": row["created_at"],
            "questions": row["questions"].split('\n')
        } for row in rows]

    def get_pdf_by_id(self, pdf_id):
        conn = get_db_connection()
        row = conn.execute("SELECT * FROM pdfs WHERE id=?", (pdf_id,)).fetchone()
        conn.close()
        if row:
            return {
                "id": row["id"],
                "topic": row["topic"],
                "path": row["path"],
                "created_at": row["created_at"],
                "questions": row["questions"].split('\n')
            }

    def delete_pdf_by_id(self, pdf_id):
        conn = get_db_connection()
        conn.execute("DELETE FROM pdfs WHERE id=?", (pdf_id,))
        conn.commit()
        conn.close()


# --- FLASK API ---
app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = SECRET_KEY

db = QuestionDatabase()

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    email = data['email']
    password = data['password']
    role = data.get('role', 'user')

    conn = get_db_connection()
    try:
        conn.execute("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", (email, password, role))
        conn.commit()
        return jsonify({'message': 'Usuário registrado com sucesso!'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'E-mail já existe'}), 400
    finally:
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data['email']
    password = data['password']

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE email=? AND password=?", (email, password)).fetchone()
    conn.close()

    if user:
        token = jwt.encode({
            'user_id': user['id'],
            'role': user['role'],
            'exp': datetime.utcnow() + timedelta(hours=2)
        }, app.config['SECRET_KEY'], algorithm='HS256')
        return jsonify({'token': token})
    return jsonify({'error': 'Credenciais inválidas'}), 401

@app.route('/api/auth/send-otp', methods=['POST'])
def send_otp():
    data = request.json
    email = data['email']
    otp_code = str(random.randint(100000, 999999))
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()

    if not user:
        conn.execute("INSERT INTO users (email, otp, role) VALUES (?, ?, 'user')", (email, otp_code))
    else:
        conn.execute("UPDATE users SET otp=? WHERE email=?", (otp_code, email))
    conn.commit()
    conn.close()

    print(f"[DEBUG] OTP para {email}: {otp_code}")
    return jsonify({'message': 'Código OTP enviado (simulado).'}), 200

@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    data = request.json
    email = data['email']
    code = data['code']

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE email=? AND otp=?", (email, code)).fetchone()
    conn.close()

    if user:
        token = jwt.encode({
            'user_id': user['id'],
            'role': user['role'],
            'exp': datetime.utcnow() + timedelta(hours=2)
        }, app.config['SECRET_KEY'], algorithm='HS256')
        return jsonify({'jwt': token})
    return jsonify({'error': 'Código inválido'}), 400

@app.route('/api/auth/google', methods=['POST'])
def google_login():
    data = request.json
    email = data.get('email')

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not user:
        conn.execute("INSERT INTO users (email, password, role) VALUES (?, '', 'user')", (email,))
        conn.commit()
        user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    conn.close()

    token = jwt.encode({
        'user_id': user['id'],
        'role': user['role'],
        'exp': datetime.utcnow() + timedelta(hours=2)
    }, app.config['SECRET_KEY'], algorithm='HS256')
    return jsonify({'jwt': token})


@app.route('/api/generate', methods=['POST'])
def api_generate():
    data = request.json
    topic = data.get('topic')
    if not topic:
        return jsonify({'error': 'Tópico é obrigatório'}), 400
    questions = generate_questions(topic)
    return jsonify({'questions': questions})

@app.route('/api/create-pdf', methods=['POST'])
def api_create_pdf():
    data = request.json
    topic = data.get('topic')
    questions = data.get('questions')
    if not topic or not questions:
        return jsonify({'error': 'Dados incompletos'}), 400
    pdf_path = create_pdf(questions, topic)
    return jsonify({'filePath': pdf_path})


# --- GEMINI ---
def generate_questions(prompt, num_questions=10):
    try:
        response = model.generate_content(f"Gere {num_questions} perguntas sobre: {prompt}")
        return [
            line.strip() for line in response.text.split('\n') if line.strip() and line[0].isdigit()
        ][:num_questions]
    except Exception as e:
        return [f"Erro ao gerar perguntas: {e}"]


def create_pdf(questions, topic, filename="perguntas_geradas.pdf"):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_filename = f"{os.path.splitext(filename)[0]}_{timestamp}.pdf"

    c = canvas.Canvas(unique_filename, pagesize=letter)
    width, height = letter
    c.setFont("Helvetica", 12)
    y = height - 40
    c.drawString(30, y, f"Tópico: {topic}")
    y -= 30

    for i, q in enumerate(questions, 1):
        if y < 40:
            c.showPage()
            y = height - 40
        c.drawString(30, y, f"{i}. {q}")
        y -= 20

    c.save()
    abs_path = os.path.abspath(unique_filename)
    db.insert_pdf_record(topic, abs_path, questions)
    return abs_path


# --- TKINTER ---
class QuestionGeneratorApp:
    def __init__(self, root):
        self.root = root
        self.questions = []
        self.current_topic = ""
        self.setup_ui()

    def setup_ui(self):
        self.root.title("Gerador de Perguntas - Gemini")
        self.root.geometry("800x600")
        ttk.Label(self.root, text="Tema:").pack()
        self.entry = ttk.Entry(self.root, width=70)
        self.entry.pack()
        ttk.Button(self.root, text="Gerar", command=self.generate).pack()
        self.text = tk.Text(self.root, height=20)
        self.text.pack()
        ttk.Button(self.root, text="Salvar PDF", command=self.save_pdf).pack()

    def generate(self):
        topic = self.entry.get()
        self.questions = generate_questions(topic)
        self.current_topic = topic
        self.text.delete(1.0, tk.END)
        self.text.insert(tk.END, "\n".join(self.questions))

    def save_pdf(self):
        if self.questions:
            path = create_pdf(self.questions, self.current_topic)
            messagebox.showinfo("Sucesso", f"PDF salvo: {path}")
        else:
            messagebox.showerror("Erro", "Nenhuma pergunta gerada.")


# --- EXECUÇÃO FINAL ---
if __name__ == '__main__':
    create_tables()
    threading.Thread(target=lambda: app.run(port=5000, debug=True), daemon=True).start()
    root = tk.Tk()
    app_gui = QuestionGeneratorApp(root)
    root.mainloop()
