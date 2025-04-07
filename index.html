from transformers import GPT2LMHeadModel, GPT2Tokenizer
import torch
import tkinter as tk
from tkinter import messagebox
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import os

def load_model_safely():
    model_name = "gpt2"
    try:
        # Tentativa principal de carregamento
        tokenizer = GPT2Tokenizer.from_pretrained(model_name)
        model = GPT2LMHeadModel.from_pretrained(model_name)
        return tokenizer, model
    except Exception as e:
        print(f"Erro no carregamento padrão: {e}")
        
        # Tentativa alternativa com modelo menor
        try:
            model_name = "distilgpt2"  # Modelo mais leve e compatível
            tokenizer = GPT2Tokenizer.from_pretrained(model_name)
            model = GPT2LMHeadModel.from_pretrained(model_name)
            messagebox.showwarning("Aviso", "Carregado modelo distilgpt2 (mais leve) no lugar de gpt2")
            return tokenizer, model
        except Exception as e:
            messagebox.showerror("Erro Crítico", f"Não foi possível carregar nenhum modelo: {e}")
            raise

# Carregar modelo e tokenizer
tokenizer, model = load_model_safely()

# Função para gerar perguntas
def generate_questions(prompt, num_questions=5):  # Reduzi para 5 por padrão
    questions = []
    for _ in range(num_questions):
        try:
            inputs = tokenizer.encode(prompt, return_tensors="pt")
            outputs = model.generate(
                inputs,
                max_length=100,
                num_return_sequences=1,
                do_sample=True,
                top_k=50,
                top_p=0.95,
                temperature=0.7,
                pad_token_id=tokenizer.eos_token_id
            )
            question = tokenizer.decode(outputs[0], skip_special_tokens=True)
            questions.append(question)
        except Exception as e:
            questions.append(f"[Erro na geração: {str(e)}]")
    return questions

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

# Interface gráfica (mantida similar)
window = tk.Tk()
window.title("Gerador de Perguntas com GPT-2")
window.geometry("700x500")

# Componentes da interface (como antes)
label_prompt = tk.Label(window, text="Digite o prompt para gerar perguntas:")
label_prompt.pack(pady=5)

entry_prompt = tk.Entry(window, width=70)
entry_prompt.pack(pady=5)

button_generate = tk.Button(window, text="Gerar Perguntas", command=lambda: on_generate())
button_generate.pack(pady=5)

text_output = tk.Text(window, height=15, width=85)
text_output.pack(pady=5)

button_download = tk.Button(window, text="Baixar PDF", state=tk.DISABLED, command=lambda: on_download())
button_download.pack(pady=5)

def on_generate():
    prompt = entry_prompt.get().strip()
    if not prompt:
        messagebox.showwarning("Erro", "Por favor, insira um prompt!")
        return
    
    button_generate.config(state=tk.DISABLED)
    button_generate.config(text="Gerando...")
    window.update()
    
    try:
        questions = generate_questions(prompt)
        text_output.delete(1.0, tk.END)
        for i, q in enumerate(questions, 1):
            text_output.insert(tk.END, f"{i}. {q}\n")
        
        button_download.config(state=tk.NORMAL)
        window.questions = questions
    except Exception as e:
        messagebox.showerror("Erro", f"Falha na geração: {e}")
    finally:
        button_generate.config(state=tk.NORMAL)
        button_generate.config(text="Gerar Perguntas")

def on_download():
    if hasattr(window, 'questions'):
        filename = create_pdf(window.questions)
        if filename:
            messagebox.showinfo("Sucesso", f"PDF salvo como:\n{filename}")
    else:
        messagebox.showerror("Erro", "Gere perguntas primeiro!")

window.mainloop()