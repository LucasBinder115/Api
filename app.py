from transformers import GPT2LMHeadModel, GPT2Tokenizer
import torch
import tkinter as tk
from tkinter import messagebox
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import os

# Configuração segura para carregar o modelo
def load_model():
    model_name = "gpt2"
    try:
        # Tentar carregar normalmente primeiro
        tokenizer = GPT2Tokenizer.from_pretrained(model_name)
        model = GPT2LMHeadModel.from_pretrained(model_name)
        return tokenizer, model
    except Exception as e:
        print(f"Erro ao carregar o modelo: {e}")
        # Tentar carregar com configuração manual se falhar
        try:
            from transformers import GPT2Config
            config = GPT2Config.from_pretrained(model_name)
            model = GPT2LMHeadModel(config)
            tokenizer = GPT2Tokenizer.from_pretrained(model_name)
            
            # Carregar pesos manualmente (pode ser mais lento)
            from transformers.utils import cached_file
            model_path = cached_file(model_name, "pytorch_model.bin")
            state_dict = torch.load(model_path, map_location='cpu')
            model.load_state_dict(state_dict)
            
            return tokenizer, model
        except Exception as e:
            messagebox.showerror("Erro Crítico", f"Não foi possível carregar o modelo: {e}")
            raise

# Carregar o modelo e tokenizer
tokenizer, model = load_model()

# Função para gerar perguntas com base no prompt do usuário
def generate_questions(prompt, num_questions=10):
    questions = []
    for _ in range(num_questions):
        try:
            inputs = tokenizer.encode(prompt, return_tensors="pt")
            outputs = model.generate(
                inputs,
                max_length=50,
                num_return_sequences=1,
                no_repeat_ngram_size=2,
                do_sample=True,
                top_k=50,
                top_p=0.95,
                temperature=0.7,
                pad_token_id=tokenizer.eos_token_id  # Adicionado para evitar warnings
            )
            question = tokenizer.decode(outputs[0], skip_special_tokens=True)
            questions.append(question)
        except Exception as e:
            print(f"Erro ao gerar pergunta: {e}")
            questions.append(f"[Erro ao gerar pergunta: {str(e)}]")
    return questions

# Função para criar o PDF
def create_pdf(questions, filename="perguntas_geradas.pdf"):
    try:
        c = canvas.Canvas(filename, pagesize=letter)
        width, height = letter
        c.setFont("Helvetica", 12)
        y = height - 40
        c.drawString(30, y, "Perguntas Geradas:")
        y -= 20
        for i, q in enumerate(questions, 1):
            # Quebra de linha se o texto for muito longo
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

# Função chamada ao clicar no botão "Gerar"
def on_generate():
    prompt = entry_prompt.get().strip()
    if not prompt:
        messagebox.showwarning("Erro", "Por favor, insira um prompt!")
        return
    
    try:
        # Desabilitar botão durante a geração
        button_generate.config(state=tk.DISABLED)
        button_generate.config(text="Gerando...")
        window.update()
        
        # Gerar perguntas
        questions = generate_questions(prompt)
        
        # Limpar o texto anterior e exibir as perguntas
        text_output.delete(1.0, tk.END)
        for i, q in enumerate(questions, 1):
            text_output.insert(tk.END, f"{i}. {q}\n")
        
        # Habilitar o botão de download e armazenar as perguntas
        button_download.config(state=tk.NORMAL)
        window.questions = questions
    except Exception as e:
        messagebox.showerror("Erro", f"Ocorreu um erro: {e}")
    finally:
        button_generate.config(state=tk.NORMAL)
        button_generate.config(text="Gerar Perguntas")

# Função chamada ao clicar no botão "Baixar PDF"
def on_download():
    if hasattr(window, 'questions'):
        filename = create_pdf(window.questions)
        if filename:
            messagebox.showinfo("Sucesso", f"PDF salvo como:\n{filename}")
    else:
        messagebox.showerror("Erro", "Gere as perguntas primeiro!")

# Configurar a interface gráfica
window = tk.Tk()
window.title("Gerador de Perguntas com GPT-2")
window.geometry("700x500")

# Estilo melhorado
font_style = ("Arial", 10)
padding = 10

# Frame principal para organização
main_frame = tk.Frame(window, padx=20, pady=20)
main_frame.pack(fill=tk.BOTH, expand=True)

# Campo para o prompt
label_prompt = tk.Label(main_frame, text="Digite o prompt para gerar perguntas:", font=font_style)
label_prompt.pack(pady=5)

entry_prompt = tk.Entry(main_frame, width=70, font=font_style)
entry_prompt.pack(pady=5)

# Frame para botões
button_frame = tk.Frame(main_frame)
button_frame.pack(pady=padding)

button_generate = tk.Button(button_frame, text="Gerar Perguntas", command=on_generate, 
                          font=font_style, bg="#4CAF50", fg="white")
button_generate.pack(side=tk.LEFT, padx=5)

button_download = tk.Button(button_frame, text="Baixar PDF", command=on_download, 
                          state=tk.DISABLED, font=font_style, bg="#2196F3", fg="white")
button_download.pack(side=tk.LEFT, padx=5)

# Área de texto com scrollbar
text_frame = tk.Frame(main_frame)
text_frame.pack(fill=tk.BOTH, expand=True)

scrollbar = tk.Scrollbar(text_frame)
scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

text_output = tk.Text(text_frame, height=15, width=85, font=font_style, yscrollcommand=scrollbar.set)
text_output.pack(fill=tk.BOTH, expand=True)

scrollbar.config(command=text_output.yview)

# Iniciar a interface
window.mainloop()