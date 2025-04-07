from transformers import GPT2LMHeadModel, GPT2Tokenizer
import torch
import tkinter as tk
from tkinter import messagebox
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import os

# Carregar o modelo GPT-2 e o tokenizer
model_name = "gpt2"
tokenizer = GPT2Tokenizer.from_pretrained(model_name)
model = GPT2LMHeadModel.from_pretrained(model_name)

# Função para gerar perguntas com base no prompt do usuário
def generate_questions(prompt, num_questions=10):
    questions = []
    for _ in range(num_questions):
        inputs = tokenizer.encode(prompt, return_tensors="pt")
        outputs = model.generate(
            inputs,
            max_length=50,
            num_return_sequences=1,
            no_repeat_ngram_size=2,
            do_sample=True,
            top_k=50,
            top_p=0.95,
            temperature=0.7
        )
        question = tokenizer.decode(outputs[0], skip_special_tokens=True)
        questions.append(question)
    return questions

# Função para criar o PDF
def create_pdf(questions, filename="perguntas_geradas.pdf"):
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    c.setFont("Helvetica", 12)
    y = height - 40  # Posição inicial no topo da página
    c.drawString(30, y, "Perguntas Geradas:")
    y -= 20
    for i, q in enumerate(questions, 1):
        c.drawString(30, y, f"{i}. {q}")
        y -= 20
        if y < 40:  # Se chegar ao fim da página, criar nova
            c.showPage()
            y = height - 40
    c.save()
    return filename

# Função chamada ao clicar no botão "Gerar"
def on_generate():
    prompt = entry_prompt.get().strip()
    if not prompt:
        messagebox.showwarning("Erro", "Por favor, insira um prompt!")
        return
    
    # Gerar perguntas
    questions = generate_questions(prompt)
    
    # Limpar o texto anterior e exibir as perguntas
    text_output.delete(1.0, tk.END)
    for i, q in enumerate(questions, 1):
        text_output.insert(tk.END, f"{i}. {q}\n")
    
    # Habilitar o botão de download e armazenar as perguntas
    button_download.config(state=tk.NORMAL)
    window.questions = questions  # Armazenar para o PDF

# Função chamada ao clicar no botão "Baixar PDF"
def on_download():
    if hasattr(window, 'questions'):
        filename = create_pdf(window.questions)
        messagebox.showinfo("Sucesso", f"PDF salvo como {filename}!")
    else:
        messagebox.showerror("Erro", "Gere as perguntas primeiro!")

# Configurar a interface gráfica
window = tk.Tk()
window.title("Gerador de Perguntas com GPT-2")
window.geometry("600x400")

# Campo para o prompt
label_prompt = tk.Label(window, text="Digite o prompt para gerar perguntas:")
label_prompt.pack(pady=5)
entry_prompt = tk.Entry(window, width=50)
entry_prompt.pack(pady=5)

# Botão para gerar perguntas
button_generate = tk.Button(window, text="Gerar Perguntas", command=on_generate)
button_generate.pack(pady=5)

# Área de texto para exibir as perguntas
text_output = tk.Text(window, height=15, width=70)
text_output.pack(pady=5)

# Botão para baixar o PDF (inicialmente desativado)
button_download = tk.Button(window, text="Baixar PDF", command=on_download, state=tk.DISABLED)
button_download.pack(pady=5)

# Iniciar a interface
window.mainloop()