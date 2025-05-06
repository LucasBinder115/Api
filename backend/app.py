import google.generativeai as genai
import tkinter as tk
from tkinter import messagebox, ttk
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import os
from datetime import datetime
from .database import QuestionDatabase
from flask import Flask, jsonify, request
import sys
from pathlib import Path

# Add the project root to Python path
sys.path.append(str(Path(__file__).parent.parent))



# Configuração da API do Gemini
GENAI_API_KEY = ""  # 👈 Substitua pela sua chave
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
        
        # Notebook (abas)
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Aba de geração
        self.setup_generation_tab()
        
        # Aba de histórico
        self.setup_history_tab()
        
        # Carrega histórico inicial
        self.load_history()
    
    def setup_generation_tab(self):
        tab = ttk.Frame(self.notebook)
        self.notebook.add(tab, text="Gerar Perguntas")
        
        # Widgets da aba de geração
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
        tab = ttk.Frame(self.notebook)
        self.notebook.add(tab, text="Histórico")
        
        # Treeview para histórico
        self.tree = ttk.Treeview(tab, columns=('ID', 'Tópico', 'Data', 'Perguntas', 'Tamanho'), 
                                show='headings')
        
        # Configuração das colunas
        columns = {
            'ID': {'width': 50, 'anchor': tk.W},
            'Tópico': {'width': 200, 'anchor': tk.W},
            'Data': {'width': 150, 'anchor': tk.W},
            'Perguntas': {'width': 80, 'anchor': tk.W},
            'Tamanho': {'width': 100, 'anchor': tk.W}
        }
        
        for col, config in columns.items():
            self.tree.heading(col, text=col, anchor=config['anchor'])
            self.tree.column(col, width=config['width'], minwidth=config['width']-20)
        
        # Scrollbar e botões
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
        
        # Layout
        self.tree.pack(side=tk.TOP, fill=tk.BOTH, expand=True, padx=10, pady=10)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        btn_frame.pack(side=tk.BOTTOM, pady=10)
        
        # Evento de seleção
        self.tree.bind('<<TreeviewSelect>>', self.on_history_select)
    
    # Métodos de controle
    def load_history(self):
        for item in self.tree.get_children():
            self.tree.delete(item)
            
        pdfs = db.get_all_pdfs()
        for pdf in pdfs:
            self.tree.insert('', 'end', values=(
                pdf[0], pdf[1], pdf[4], pdf[3], f"{pdf[5]:.2f}"
            ))
    
    def on_history_select(self, event):
        selected = bool(self.tree.selection())
        for btn in [self.btn_view, self.btn_open, self.btn_delete]:
            btn.state(['!disabled' if selected else 'disabled'])
    
    def on_view_history(self):
        selected = self.tree.selection()
        if not selected:
            return
            
        pdf_id = self.tree.item(selected[0], 'values')[0]
        pdf_data = db.get_pdf_by_id(pdf_id)
        
        if not pdf_data:
            messagebox.showerror("Erro", "Não foi possível carregar os dados do PDF.")
            return
        
        view_window = tk.Toplevel(self.root)
        view_window.title(f"Perguntas: {pdf_data['topic']}")
        view_window.geometry("800x600")
        
        # Frame principal
        main_frame = ttk.Frame(view_window)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Informações do PDF
        info_frame = ttk.LabelFrame(main_frame, text="Informações do Questionário")
        info_frame.pack(fill=tk.X, pady=5)
        
        info_text = f"""Tópico: {pdf_data['topic']}
Gerado em: {pdf_data['generated_at']}
Número de perguntas: {pdf_data['num_questions']}
Tamanho do arquivo: {pdf_data['file_size_kb']:.2f} KB
Local: {pdf_data['file_path']}"""
        
        ttk.Label(info_frame, text=info_text, justify=tk.LEFT).pack(fill=tk.X)
        
        # Perguntas
        text_frame = ttk.Frame(main_frame)
        text_frame.pack(fill=tk.BOTH, expand=True)
        
        text_area = tk.Text(text_frame, wrap=tk.WORD, font=("Arial", 10))
        text_area.pack(fill=tk.BOTH, expand=True)
        
        scrollbar = ttk.Scrollbar(text_area)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        text_area.config(yscrollcommand=scrollbar.set)
        scrollbar.config(command=text_area.yview)
        
        for q in pdf_data['questions']:
            text_area.insert(tk.END, f"{q[0]}. {q[1]}\n\n")
        
        text_area.config(state=tk.DISABLED)
    
    def on_open_pdf(self):
        selected = self.tree.selection()
        if not selected:
            return
            
        pdf_id = self.tree.item(selected[0], 'values')[0]
        pdf_data = db.get_pdf_by_id(pdf_id)
        
        if pdf_data and os.path.exists(pdf_data['file_path']):
            try:
                os.startfile(pdf_data['file_path'])
            except:
                messagebox.showerror("Erro", "Não foi possível abrir o PDF.")
        else:
            messagebox.showerror("Erro", "Arquivo PDF não encontrado!")
    
    def on_delete_history(self):
        selected = self.tree.selection()
        if not selected:
            return
            
        pdf_id = self.tree.item(selected[0], 'values')[0]
        pdf_data = db.get_pdf_by_id(pdf_id)
        
        if not pdf_data:
            messagebox.showerror("Erro", "Registro não encontrado!")
            return
        
        if messagebox.askyesno("Confirmar", f"Excluir permanentemente o PDF sobre '{pdf_data['topic']}'?"):
            # Remove arquivo físico
            if os.path.exists(pdf_data['file_path']):
                try:
                    os.remove(pdf_data['file_path'])
                except Exception as e:
                    messagebox.showwarning("Aviso", f"Arquivo PDF não pôde ser removido: {e}")
            
            # Remove do banco de dados
            if db.delete_pdf_record(pdf_id):
                messagebox.showinfo("Sucesso", "Registro removido com sucesso!")
                self.load_history()
            else:
                messagebox.showerror("Erro", "Falha ao remover registro do banco de dados.")
    
    def on_generate(self):
        self.current_topic = self.entry_prompt.get().strip()
        if not self.current_topic:
            messagebox.showwarning("Aviso", "Por favor, digite um tema!")
            return
        
        self.btn_generate.config(state=tk.DISABLED, text="Gerando...")
        self.root.update()
        
        try:
            self.questions = generate_questions(self.current_topic)
            self.txt_output.delete(1.0, tk.END)
            for q in self.questions:
                self.txt_output.insert(tk.END, f"{q}\n\n")
            
            self.btn_download.state(['!disabled'])
        
        except Exception as e:
            messagebox.showerror("Erro", f"Falha na geração:\n{str(e)}")
        
        finally:
            self.btn_generate.config(state=tk.NORMAL, text="Gerar Perguntas")
    
    def on_download(self):
        if self.questions and self.current_topic:
            try:
                filename = create_pdf(self.questions, self.current_topic)
                messagebox.showinfo("Sucesso", f"PDF gerado com sucesso!\nLocal: {filename}")
                self.load_history()
            except Exception as e:
                messagebox.showerror("Erro no PDF", str(e))
        else:
            messagebox.showwarning("Aviso", "Gere perguntas primeiro!")

# --- Parte 3: Aplicação Flask (API) ---


def create_flask_app():
    app = Flask(__name__)
    
    @app.route('/api/users')
    def api_users():
        users = db.get_users_list()
        return jsonify(users)
    
    @app.route('/api/register', methods=['POST'])
    def api_register():
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({"success": False, "message": "Usuário e senha são obrigatórios"}), 400
        
        if len(password) < 6:
            return jsonify({"success": False, "message": "Senha deve ter pelo menos 6 caracteres"}), 400
        
        user_id = db.add_user_with_email(username, email, password)
        if user_id:
            return jsonify({"success": True, "message": "Usuário criado com sucesso"})
        
        return jsonify({"success": False, "message": "Nome de usuário já existe"}), 409
    
    return app

# --- Execução Principal ---
if __name__ == "__main__":
    # Inicia a interface gráfica
    root = tk.Tk()
    app = QuestionGeneratorApp(root)
    
    # Inicia o servidor Flask em uma thread separada
    import threading
    flask_app = create_flask_app()
    threading.Thread(target=lambda: flask_app.run(port=5000), daemon=True).start()
    
    root.mainloop()