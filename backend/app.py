from flask import Flask, jsonify, request, send_from_directory, send_file
from flask_cors import CORS
import google.generativeai as genai
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import os
from datetime import datetime
from database import QuestionDatabase
import threading
import logging

# Configuração inicial
app = Flask(__name__)
CORS(app)  # Habilita CORS
db = QuestionDatabase()

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuração da API do Gemini
try:
    GENAI_API_KEY = "AIzaSyDe-AA1In-JFixZxE40-IgEz1G-2j1cVyA"
    genai.configure(api_key=GENAI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-pro-latest')
except Exception as e:
    logger.error(f"Erro ao configurar Gemini API: {str(e)}")
    raise

# Funções auxiliares
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
        questions = [
            line.strip() 
            for line in response.text.split('\n') 
            if line.strip() and line[0].isdigit()
        ][:num_questions]
        return questions if (response.text and questions) else []
    except Exception as e:
        logger.error(f"Erro na geração de perguntas: {str(e)}")
        return []

def create_pdf(questions, topic):
    """Cria um PDF com as perguntas geradas"""
    try:
        os.makedirs('pdfs', exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"pdfs/perguntas_{timestamp}.pdf"
        
        c = canvas.Canvas(filename, pagesize=letter)
        width, height = letter
        c.setFont("Helvetica", 12)
        y = height - 40
        
        # Cabeçalho
        c.drawString(30, y, f"Perguntas sobre: {topic}")
        y -= 30
        c.drawString(30, y, "-"*50)
        y -= 30
        
        # Conteúdo
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
        return filename
    except Exception as e:
        logger.error(f"Erro ao criar PDF: {str(e)}")
        return None

# Rotas da API
@app.route('/api/generate', methods=['POST'])
def api_generate():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Dados não fornecidos"}), 400
            
        topic = data.get('topic', '').strip()
        if not topic:
            return jsonify({"error": "Tópico é obrigatório"}), 400
        
        questions = generate_questions(topic)
        if not questions:
            return jsonify({"error": "Falha ao gerar perguntas"}), 500
        
        return jsonify({"questions": questions})
    except Exception as e:
        logger.error(f"Erro em /api/generate: {str(e)}")
        return jsonify({"error": "Erro interno no servidor"}), 500

@app.route('/api/save-pdf', methods=['POST'])
def api_save_pdf():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Dados não fornecidos"}), 400
            
        topic = data.get('topic', '').strip()
        questions = data.get('questions', [])
        
        if not topic or not questions:
            return jsonify({"error": "Dados incompletos"}), 400
        
        pdf_path = create_pdf(questions, topic)
        if not pdf_path:
            return jsonify({"error": "Falha ao criar PDF"}), 500
        
        pdf_id = db.insert_pdf_record(topic, pdf_path, questions)
        if not pdf_id:
            return jsonify({"error": "Falha ao salvar no banco de dados"}), 500
        
        return jsonify({
            "success": True, 
            "pdf_id": pdf_id, 
            "pdf_path": pdf_path
        })
    except Exception as e:
        logger.error(f"Erro em /api/save-pdf: {str(e)}")
        return jsonify({"error": "Erro interno no servidor"}), 500

@app.route('/api/history')
def api_history():
    try:
        pdfs = db.get_all_pdfs()
        if not pdfs:
            return jsonify([])
            
        history = [{
            "id": pdf[0],
            "topic": pdf[1],
            "file_path": pdf[2],
            "num_questions": pdf[3],
            "generated_at": pdf[4],
            "file_size_kb": float(pdf[5]) if pdf[5] else 0.0
        } for pdf in pdfs]
        
        return jsonify(history)
    except Exception as e:
        logger.error(f"Erro em /api/history: {str(e)}")
        return jsonify({"error": "Erro ao carregar histórico"}), 500

@app.route('/api/pdf/<int:pdf_id>')
def api_get_pdf(pdf_id):
    try:
        pdf_data = db.get_pdf_by_id(pdf_id)
        if not pdf_data:
            return jsonify({"error": "PDF não encontrado"}), 404
        
        return jsonify({
            "topic": pdf_data['topic'],
            "questions": [{"number": q[0], "text": q[1]} for q in pdf_data['questions']],
            "generated_at": pdf_data['generated_at'],
            "file_size_kb": float(pdf_data['file_size_kb']) if pdf_data['file_size_kb'] else 0.0
        })
    except Exception as e:
        logger.error(f"Erro em /api/pdf/{pdf_id}: {str(e)}")
        return jsonify({"error": "Erro ao recuperar PDF"}), 500

@app.route('/api/download/<int:pdf_id>')
def api_download_pdf(pdf_id):
    try:
        pdf_data = db.get_pdf_by_id(pdf_id)
        if not pdf_data:
            return jsonify({"error": "PDF não encontrado"}), 404
            
        if not os.path.exists(pdf_data['file_path']):
            return jsonify({"error": "Arquivo PDF não existe"}), 404
        
        return send_file(
            pdf_data['file_path'],
            as_attachment=True,
            download_name=f"questionario_{pdf_id}.pdf"
        )
    except Exception as e:
        logger.error(f"Erro em /api/download/{pdf_id}: {str(e)}")
        return jsonify({"error": "Erro ao baixar PDF"}), 500

@app.route('/api/delete/<int:pdf_id>', methods=['DELETE'])
def api_delete_pdf(pdf_id):
    try:
        pdf_data = db.get_pdf_by_id(pdf_id)
        if not pdf_data:
            return jsonify({"error": "Registro não encontrado"}), 404
        
        file_path = db.delete_pdf_record(pdf_id)
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                logger.error(f"Erro ao remover arquivo {file_path}: {str(e)}")
        
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Erro em /api/delete/{pdf_id}: {str(e)}")
        return jsonify({"error": "Erro ao deletar PDF"}), 500

# Rotas para servir o frontend
@app.route('/')
def serve_frontend():
    return send_from_directory('frontend', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('frontend', path)

if __name__ == "__main__":
    # Cria pastas necessárias
    os.makedirs('frontend', exist_ok=True)
    os.makedirs('pdfs', exist_ok=True)
    
    # Configurações do servidor
    host = '0.0.0.0'
    port = 5000
    
    logger.info(f"Iniciando servidor em http://{host}:{port}")
    app.run(host=host, port=port, threaded=True, debug=True)