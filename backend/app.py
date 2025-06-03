from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import datetime
import sqlite3
from db import get_db_connection
from models import create_tables
import random

app = Flask(__name__)
CORS(app)

app.config['SECRET_KEY'] = 'YWYQUywyueueyYWYEEUywdhwhdw'

# Cria o banco
create_tables()

# Registro simples
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    email = data['email']
    password = data['password']
    role = data.get('role', 'user')

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
                       (email, password, role))
        conn.commit()
        return jsonify({'message': 'Usuário registrado com sucesso!'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'E-mail já existe'}), 400
    finally:
        conn.close()

# Login normal
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
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=2)
        }, app.config['SECRET_KEY'], algorithm='HS256')

        return jsonify({'token': token})
    return jsonify({'error': 'Credenciais inválidas'}), 401

# Enviar código OTP (simulado)
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

    print(f"OTP para {email}: {otp_code}")
    return jsonify({'message': 'Código enviado (simulado).'}), 200

# Verificar código OTP
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
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=2)
        }, app.config['SECRET_KEY'], algorithm='HS256')
        return jsonify({'jwt': token})
    return jsonify({'error': 'Código inválido'}), 400

# Login via Google
@app.route('/api/auth/google', methods=['POST'])
def google_login():
    data = request.json
    email = data.get('email')
    name = data.get('name')

    if not email:
        return jsonify({'error': 'Email é obrigatório'}), 400

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()

    if not user:
        # Cadastra se não existir
        conn.execute("INSERT INTO users (email, password, role) VALUES (?, ?, 'user')", (email, '',))
        conn.commit()
        user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()

    conn.close()

    # Cria o JWT
    token = jwt.encode({
        'user_id': user['id'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=2)
    }, app.config['SECRET_KEY'], algorithm='HS256')

    return jsonify({'jwt': token})

# Inicia o servidor
if __name__ == '__main__':
    app.run(debug=True)

    import google.generativeai as genai
import tkinter as tk
from tkinter import messagebox, ttk
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import os
import sys
import subprocess
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory
from pathlib import Path
from database import QuestionDatabase

# Configuração da API do Gemini
GENAI_API_KEY = "AIzaSyDe-AA1In-JFixZxE40-IgEz1G-2j1cVyA"  # 👈 Substitua pela sua chave
genai.configure(api_key=GENAI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-pro-latest')

# Inicializa o banco de dados
db = QuestionDatabase()

# --- Parte 1: Funções de Negócio ---
def generate_questions(prompt, num_questions=10):
    """Gera perguntas usando a API do Gemini"""
    try:
        response = model.generate_content(
            f"Gere {num_questions} perguntas relevantes sobre: {prompt}\n"
            "Formato exigido (numere cada pergunta):\n"
            "1. Pergunta completa com pontuação?\n"
            "2. Pergunta seguinte?\n"
            "...",
            generation_config={
                "temperature": 0.7,
                "max_output_tokens": 1000,
            }
        )
        return [
            line.strip() 
            for line in response.text.split('\n') 
            if line.strip() and line[0].isdigit()
        ][:num_questions] if response.text else ["Erro: Nenhuma resposta gerada"]
    except Exception as e:
        return [f"Erro na geração: {str(e)}"]

def create_pdf(questions, topic, filename="perguntas_geradas.pdf"):
    """Cria um PDF com as perguntas e salva no banco de dados"""
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{os.path.splitext(filename)[0]}_{timestamp}.pdf"
        
        c = canvas.Canvas(unique_filename, pagesize=letter)
        width, height = letter
        c.setFont("Helvetica", 12)
        y = height - 40
        
        # Cabeçalho do PDF
        c.drawString(30, y, f"Perguntas Geradas sobre: {topic}")
        y -= 30
        c.drawString(30, y, "--------------------------------------------------")
        y -= 30
        
        # Conteúdo das perguntas
        for i, q in enumerate(questions, 1):
            if len(q) > 80:
                parts = [q[i:i+80] for i in range(0, len(q), 80)]
                for part in parts:
                    c.drawString(30, y, f"{i}. {part}" if part == parts[0] else f"    {part}")
                    y -= 15
            else:
                c.drawString(30, y, f"{i}. {q}")
                y -= 20
            if y < 40:
                c.showPage()
                y = height - 40
        
        c.save()
        abs_path = os.path.abspath(unique_filename)
        db.insert_pdf_record(topic, abs_path, questions)
        return abs_path
    except Exception as e:
        raise Exception(f"Erro ao criar PDF: {e}")

# --- Parte 2: Interface Tkinter ---
class QuestionGeneratorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Gerador de Perguntas com Gemini AI")
        self.root.geometry("1000x700")
        self.questions = []
        self.current_topic = ""
        self.setup_ui()

    def setup_ui(self):
        self.root.configure(bg="#f0f0f0")

        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        self.generation_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.generation_tab, text="Gerar Perguntas")
        self.setup_generation_tab()

        self.history_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.history_tab, text="Histórico")
        self.setup_history_tab()

        self.load_history()

    def setup_generation_tab(self):
        tab = self.generation_tab

        ttk.Label(tab, text="Digite o tema para gerar perguntas:",
                  font=("Arial", 11, "bold")).pack(pady=5)

        self.entry_prompt = ttk.Entry(tab, width=70, font=("Arial", 10))
        self.entry_prompt.pack(pady=5, ipady=5)

        btn_frame = ttk.Frame(tab)
        btn_frame.pack(pady=10)

        self.btn_generate = ttk.Button(btn_frame, text="Gerar Perguntas",
                                       command=self.on_generate)
        self.btn_generate.pack(side=tk.LEFT, padx=5)

        self.btn_download = ttk.Button(btn_frame, text="Baixar PDF",
                                       command=self.on_download, state=tk.DISABLED)
        self.btn_download.pack(side=tk.LEFT, padx=5)

        self.txt_output = tk.Text(tab, height=15, width=85, font=("Arial", 10),
                                  wrap=tk.WORD)
        self.txt_output.pack(pady=10, fill=tk.BOTH, expand=True)

        scrollbar = ttk.Scrollbar(self.txt_output)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.txt_output.config(yscrollcommand=scrollbar.set)
        scrollbar.config(command=self.txt_output.yview)

    def setup_history_tab(self):
        tab = self.history_tab

        self.tree = ttk.Treeview(tab, columns=('ID', 'Tópico', 'Data', 'Perguntas', 'Tamanho'),
                                 show='headings')

        columns = {
            'ID': {'width': 50, 'anchor': tk.W},
            'Tópico': {'width': 200, 'anchor': tk.W},
            'Data': {'width': 150, 'anchor': tk.W},
            'Perguntas': {'width': 80, 'anchor': tk.W},
            'Tamanho': {'width': 100, 'anchor': tk.W}
        }

        for col, config in columns.items():
            self.tree.heading(col, text=col, anchor=config['anchor'])
            self.tree.column(col, width=config['width'], minwidth=config['width'] - 20)

        scrollbar = ttk.Scrollbar(tab, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)

        btn_frame = ttk.Frame(tab)

        self.btn_view = ttk.Button(btn_frame, text="Visualizar",
                                   command=self.on_view_history, state=tk.DISABLED)
        self.btn_view.pack(side=tk.LEFT, padx=5)

        self.btn_open = ttk.Button(btn_frame, text="Abrir PDF",
                                   command=self.on_open_pdf, state=tk.DISABLED)
        self.btn_open.pack(side=tk.LEFT, padx=5)

        self.btn_delete = ttk.Button(btn_frame, text="Excluir",
                                     command=self.on_delete_history, state=tk.DISABLED)
        self.btn_delete.pack(side=tk.LEFT, padx=5)

        self.btn_refresh = ttk.Button(btn_frame, text="Atualizar",
                                      command=self.load_history)
        self.btn_refresh.pack(side=tk.LEFT, padx=5)

        self.tree.pack(side=tk.TOP, fill=tk.BOTH, expand=True, padx=10, pady=10)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        btn_frame.pack(side=tk.BOTTOM, pady=10)

        self.tree.bind('<<TreeviewSelect>>', self.on_history_select)

    def on_generate(self):
        prompt = self.entry_prompt.get()
        if not prompt.strip():
            messagebox.showwarning("Aviso", "Por favor, insira um tema.")
            return

        self.questions = generate_questions(prompt)
        self.current_topic = prompt
        self.txt_output.delete(1.0, tk.END)
        self.txt_output.insert(tk.END, "\n".join(self.questions))
        self.btn_download.config(state=tk.NORMAL)

    def on_download(self):
        if not self.questions or not self.current_topic:
            messagebox.showerror("Erro", "Nada para salvar.")
            return
        try:
            pdf_path = create_pdf(self.questions, self.current_topic)
            messagebox.showinfo("Sucesso", f"PDF salvo em:\n{pdf_path}")
            self.load_history()
        except Exception as e:
            messagebox.showerror("Erro ao salvar PDF", str(e))

    def load_history(self):
        for item in self.tree.get_children():
            self.tree.delete(item)
        try:
            for record in db.get_all_pdfs():
                self.tree.insert('', 'end', values=(
                    record['id'],
                    record['topic'],
                    record['created_at'],
                    len(record['questions']),
                    f"{os.path.getsize(record['path']) // 1024} KB"
                ))
        except Exception as e:
            messagebox.showerror("Erro ao carregar histórico", str(e))

    def on_history_select(self, event):
        selected = self.tree.selection()
        if selected:
            self.btn_view.config(state=tk.NORMAL)
            self.btn_open.config(state=tk.NORMAL)
            self.btn_delete.config(state=tk.NORMAL)
        else:
            self.btn_view.config(state=tk.DISABLED)
            self.btn_open.config(state=tk.DISABLED)
            self.btn_delete.config(state=tk.DISABLED)

    def on_view_history(self):
        selected = self.tree.selection()
        if not selected:
            return
        item = self.tree.item(selected)
        record_id = item['values'][0]
        record = db.get_pdf_by_id(record_id)
        if record:
            self.txt_output.delete(1.0, tk.END)
            self.txt_output.insert(tk.END, "\n".join(record['questions']))
            self.current_topic = record['topic']
            self.questions = record['questions']
            self.btn_download.config(state=tk.NORMAL)

    def on_open_pdf(self):
        selected = self.tree.selection()
        if not selected:
            return
        item = self.tree.item(selected)
        record_id = item['values'][0]
        record = db.get_pdf_by_id(record_id)
        if record:
            try:
                if sys.platform.startswith("win"):
                    os.startfile(record['path'])
                elif sys.platform == "darwin":
                    subprocess.call(["open", record['path']])
                else:
                    subprocess.call(["xdg-open", record['path']])
            except Exception as e:
                messagebox.showerror("Erro", f"Não foi possível abrir o PDF: {e}")

    def on_delete_history(self):
        selected = self.tree.selection()
        if not selected:
            return
        item = self.tree.item(selected)
        record_id = item['values'][0]
        confirm = messagebox.askyesno("Confirmação", "Deseja realmente excluir este registro?")
        if confirm:
            try:
                db.delete_pdf_by_id(record_id)
                self.load_history()
            except Exception as e:
                messagebox.showerror("Erro", f"Erro ao excluir registro: {e}")

# --- Parte 3: Aplicação Flask (API) ---
def create_flask_app():
    app = Flask(__name__)
    
    # Configurar CORS
    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response

    # Rotas da API
    @app.route('/api/history', methods=['GET'])
    def get_history():
        try:
            pdfs = db.get_all_pdfs()
            return jsonify({
                "success": True,
                "data": pdfs
            })
        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500

    @app.route('/api/generate', methods=['POST'])
    def api_generate():
        try:
            data = request.get_json()
            if not data or 'topic' not in data:
                return jsonify({
                    "success": False,
                    "error": "Tópico é obrigatório"
                }), 400
            
            questions = generate_questions(data['topic'])
            return jsonify({
                "success": True,
                "questions": questions
            })
        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500

    @app.route('/api/create-pdf', methods=['POST'])
    def api_create_pdf():
        try:
            data = request.get_json()
            if not data or 'topic' not in data or 'questions' not in data:
                return jsonify({
                    "success": False,
                    "error": "Tópico e perguntas são obrigatórios"
                }), 400
            
            filename = create_pdf(data['questions'], data['topic'])
            return jsonify({
                "success": True,
                "filePath": filename
            })
        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500

    # Servir o frontend
    @app.route('/')
    def serve_index():
        return send_from_directory('.', 'index.html')

    @app.route('/<path:path>')
    def serve_static(path):
        return send_from_directory('.', path)

    return app

# --- Execução Principal ---
if __name__ == "__main__":
    import threading
    
    # Inicia o Flask em uma thread separada
    flask_app = create_flask_app()
    flask_thread = threading.Thread(target=lambda: flask_app.run(port=5000, debug=True))
    flask_thread.daemon = True
    flask_thread.start()
    
    # Inicia a interface Tkinter
    root = tk.Tk()
    app = QuestionGeneratorApp(root)
    root.mainloop()
