import google.generativeai as genai
import tkinter as tk
from tkinter import messagebox
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import os

# Configuração da API do Gemini
GENAI_API_KEY = "AIzaSyDe-AA1In-JFixZxE40-IgEz1G-2j1cVyA"  # 👈 Substitua pela sua chave
genai.configure(api_key=GENAI_API_KEY)
model = genai.GenerativeModel('gemini-pro')

# Função para gerar perguntas
def generate_questions(prompt, num_questions=10):
    try:
        response = model.generate_content(
            f"Gere {num_questions} perguntas relevantes e diversificadas sobre: {prompt}\n"
            "Formato exigido:\n"
            "1. [Pergunta completa com ponto de interrogação]\n"
            "2. [Pergunta completa com ponto de interrogação]\n"
            "...",
            generation_config={
                "temperature": 0.7,
                "max_output_tokens": 1000,
            }
        )
        
        # Processar a resposta
        questions = []
        for line in response.text.split('\n'):
            if line.strip() and line[0].isdigit():
                question = line.split('. ', 1)[1].strip()
                questions.append(question)
        
        return questions[:num_questions]  # Garantir o número exato
    
    except Exception as e:
        return [f"Erro na geração: {str(e)}"]

# Função para criar PDF (mantida igual)
def create_pdf(questions, filename="perguntas_geradas.pdf"):
    try:
        c = canvas.Canvas(filename, pagesize=letter)
        width, height = letter
        c.setFont("Helvetica", 12)
        y = height - 40
        c.drawString(30, y, "Perguntas Geradas:")
        y -= 20
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
        return os.path.abspath(filename)
    except Exception as e:
        messagebox.showerror("Erro no PDF", f"Erro ao criar PDF: {e}")
        return None

# Interface gráfica moderna
class App:
    def __init__(self, root):
        self.root = root
        self.root.title("Gerador de Perguntas com Gemini AI")
        self.root.geometry("800x600")
        self.setup_ui()
        
        # Variáveis de estado
        self.questions = []
    
    def setup_ui(self):
        # Estilos
        self.root.configure(bg="#f0f0f0")
        font = ("Arial", 10)
        button_style = {
            "bg": "#4285f4", 
            "fg": "white", 
            "activebackground": "#357abd",
            "font": font
        }
        
        # Frame principal
        main_frame = tk.Frame(self.root, bg="#f0f0f0", padx=20, pady=20)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Entrada do prompt
        self.lbl_prompt = tk.Label(main_frame, 
                                 text="Digite o tema para gerar perguntas:",
                                 bg="#f0f0f0",
                                 font=("Arial", 11, "bold"))
        self.lbl_prompt.pack(pady=5)
        
        self.entry_prompt = tk.Entry(main_frame, 
                                   width=70, 
                                   font=font,
                                   bg="white")
        self.entry_prompt.pack(pady=5, ipady=5)
        
        # Botões
        btn_frame = tk.Frame(main_frame, bg="#f0f0f0")
        btn_frame.pack(pady=10)
        
        self.btn_generate = tk.Button(btn_frame, 
                                    text="Gerar Perguntas", 
                                    command=self.on_generate,
                                    **button_style)
        self.btn_generate.pack(side=tk.LEFT, padx=5)
        
        self.btn_download = tk.Button(btn_frame, 
                                    text="Baixar PDF", 
                                    command=self.on_download,
                                    state=tk.DISABLED,
                                    **button_style)
        self.btn_download.pack(side=tk.LEFT, padx=5)
        
        # Área de resultados
        self.txt_output = tk.Text(main_frame, 
                                height=15, 
                                width=85,
                                font=font,
                                bg="white",
                                wrap=tk.WORD)
        self.txt_output.pack(pady=10, fill=tk.BOTH, expand=True)
        
        # Barra de rolagem
        scrollbar = tk.Scrollbar(self.txt_output)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.txt_output.config(yscrollcommand=scrollbar.set)
        scrollbar.config(command=self.txt_output.yview)
    
    def on_generate(self):
        prompt = self.entry_prompt.get().strip()
        if not prompt:
            messagebox.showwarning("Aviso", "Por favor, digite um tema!")
            return
        
        self.btn_generate.config(state=tk.DISABLED, text="Gerando...")
        self.root.update()
        
        try:
            self.questions = generate_questions(prompt)
            self.txt_output.delete(1.0, tk.END)
            for i, q in enumerate(self.questions, 1):
                self.txt_output.insert(tk.END, f"{i}. {q}\n\n")
            
            self.btn_download.config(state=tk.NORMAL)
        
        except Exception as e:
            messagebox.showerror("Erro", f"Falha na geração:\n{str(e)}")
        
        finally:
            self.btn_generate.config(state=tk.NORMAL, text="Gerar Perguntas")
    
    def on_download(self):
        if self.questions:
            filename = create_pdf(self.questions)
            if filename:
                messagebox.showinfo("Sucesso", 
                                  f"PDF gerado com sucesso!\n"
                                  f"Local: {filename}")
        else:
            messagebox.showwarning("Aviso", "Gere perguntas primeiro!")

# Iniciar aplicação
if __name__ == "__main__":
    root = tk.Tk()
    app = App(root)
    root.mainloop()