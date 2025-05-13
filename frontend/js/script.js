document.addEventListener('DOMContentLoaded', () => {
    // Elementos da aba de geração
    const topicInput = document.getElementById('topicInput');
    const generateBtn = document.getElementById('generateBtn');
    const questionsContainer = document.getElementById('questionsContainer');
    const questionsList = document.getElementById('questionsList');
    const savePdfBtn = document.getElementById('savePdfBtn');
    
    // Elementos da aba de histórico
    const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
    const historyList = document.getElementById('historyList');
    const pdfDetail = document.getElementById('pdfDetail');
    const pdfInfo = document.getElementById('pdfInfo');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const deletePdfBtn = document.getElementById('deletePdfBtn');
    
    let currentQuestions = [];
    let selectedPdfId = null;
    
    // Event Listeners
    generateBtn.addEventListener('click', generateQuestions);
    savePdfBtn.addEventListener('click', saveAsPdf);
    refreshHistoryBtn.addEventListener('click', loadHistory);
    downloadPdfBtn.addEventListener('click', downloadPdf);
    deletePdfBtn.addEventListener('click', deletePdf);
    
    // Carrega o histórico ao iniciar
    loadHistory();
    
    // Função para gerar perguntas
    async function generateQuestions() {
        const topic = topicInput.value.trim();
        if (!topic) {
            alert('Por favor, digite um tema!');
            return;
        }
        
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Gerando...';
        
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ topic })
            });
            
            if (!response.ok) {
                throw new Error('Falha ao gerar perguntas');
            }
            
            const data = await response.json();
            currentQuestions = data.questions;
            
            // Exibe as perguntas
            questionsList.innerHTML = '';
            currentQuestions.forEach((q, i) => {
                const questionItem = document.createElement('div');
                questionItem.className = 'list-group-item question-card';
                questionItem.textContent = `${i + 1}. ${q}`;
                questionsList.appendChild(questionItem);
            });
            
            questionsContainer.classList.remove('d-none');
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao gerar perguntas!');
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Gerar Perguntas';
        }
    }
    
    // Função para salvar como PDF
    async function saveAsPdf() {
        const topic = topicInput.value.trim();
        if (!topic || currentQuestions.length === 0) {
            alert('Gere perguntas primeiro!');
            return;
        }
        
        savePdfBtn.disabled = true;
        savePdfBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...';
        
        try {
            const response = await fetch('/api/save-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    topic: topic,
                    questions: currentQuestions
                })
            });
            
            if (!response.ok) {
                throw new Error('Falha ao salvar PDF');
            }
            
            const data = await response.json();
            alert('PDF salvo com sucesso!');
            
            // Atualiza o histórico
            loadHistory();
            
            // Limpa o formulário
            topicInput.value = '';
            questionsContainer.classList.add('d-none');
            currentQuestions = [];
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao salvar PDF!');
        } finally {
            savePdfBtn.disabled = false;
            savePdfBtn.textContent = 'Salvar como PDF';
        }
    }
    
    // Função para carregar o histórico
    async function loadHistory() {
        refreshHistoryBtn.disabled = true;
        refreshHistoryBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
        
        try {
            const response = await fetch('/api/history');
            if (!response.ok) {
                throw new Error('Falha ao carregar histórico');
            }
            
            const history = await response.json();
            
            historyList.innerHTML = '';
            if (history.length === 0) {
                historyList.innerHTML = '<div class="list-group-item text-muted">Nenhum questionário encontrado</div>';
                return;
            }
            
            history.forEach(pdf => {
                const historyItem = document.createElement('div');
                historyItem.className = 'list-group-item history-item';
                historyItem.innerHTML = `
                    <div class="d-flex justify-content-between">
                        <h5>${pdf.topic}</h5>
                        <small class="text-muted">${new Date(pdf.generated_at).toLocaleString()}</small>
                    </div>
                    <div class="d-flex justify-content-between">
                        <span>${pdf.num_questions} perguntas</span>
                        <small>${pdf.file_size_kb.toFixed(2)} KB</small>
                    </div>
                `;
                
                historyItem.addEventListener('click', () => showPdfDetails(pdf.id));
                historyList.appendChild(historyItem);
            });
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao carregar histórico!');
        } finally {
            refreshHistoryBtn.disabled = false;
            refreshHistoryBtn.textContent = 'Atualizar';
        }
    }
    
    // Função para mostrar detalhes do PDF
    async function showPdfDetails(pdfId) {
        selectedPdfId = pdfId;
        
        try {
            const response = await fetch(`/api/pdf/${pdfId}`);
            if (!response.ok) {
                throw new Error('Falha ao carregar detalhes');
            }
            
            const pdf = await response.json();
            
            pdfInfo.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">${pdf.topic}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">${new Date(pdf.generated_at).toLocaleString()}</h6>
                    <div class="card-text mt-3">
                        <h6>Perguntas:</h6>
                        <ol>
                            ${pdf.questions.map(q => `<li>${q.text}</li>`).join('')}
                        </ol>
                    </div>
                </div>
            `;
            
            pdfDetail.classList.remove('d-none');
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao carregar detalhes do PDF!');
        }
    }
    
    // Função para baixar PDF
    async function downloadPdf() {
        if (!selectedPdfId) return;
        
        downloadPdfBtn.disabled = true;
        downloadPdfBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
        
        try {
            const response = await fetch(`/api/download/${selectedPdfId}`);
            if (!response.ok) {
                throw new Error('Falha ao baixar PDF');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `questionario_${selectedPdfId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao baixar PDF!');
        } finally {
            downloadPdfBtn.disabled = false;
            downloadPdfBtn.textContent = 'Baixar PDF';
        }
    }
    
    // Função para excluir PDF
    async function deletePdf() {
        if (!selectedPdfId || !confirm('Tem certeza que deseja excluir este questionário?')) {
            return;
        }
        
        deletePdfBtn.disabled = true;
        deletePdfBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
        
        try {
            const response = await fetch(`/api/delete/${selectedPdfId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Falha ao excluir PDF');
            }
            
            alert('Questionário excluído com sucesso!');
            pdfDetail.classList.add('d-none');
            loadHistory();
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao excluir PDF!');
        } finally {
            deletePdfBtn.disabled = false;
            deletePdfBtn.textContent = 'Excluir';
        }
    }
});
async function loadHistory() {
    refreshHistoryBtn.disabled = true;
    refreshHistoryBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
    historyList.innerHTML = '<div class="list-group-item text-muted">Carregando...</div>';

    try {
        const response = await fetch('http://localhost:5000/api/history');
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha ao carregar histórico');
        }
        
        const history = await response.json();
        
        historyList.innerHTML = '';
        
        if (history.length === 0) {
            historyList.innerHTML = '<div class="list-group-item text-muted">Nenhum questionário encontrado</div>';
            return;
        }
        
        history.forEach(pdf => {
            const historyItem = document.createElement('div');
            historyItem.className = 'list-group-item history-item';
            historyItem.innerHTML = `
                <div class="d-flex justify-content-between">
                    <h5>${pdf.topic}</h5>
                    <small class="text-muted">${new Date(pdf.generated_at).toLocaleString()}</small>
                </div>
                <div class="d-flex justify-content-between">
                    <span>${pdf.num_questions} perguntas</span>
                    <small>${pdf.file_size_kb?.toFixed(2) || '0.00'} KB</small>
                </div>
            `;
            
            historyItem.addEventListener('click', () => showPdfDetails(pdf.id));
            historyList.appendChild(historyItem);
        });
    } catch (error) {
        console.error('Erro detalhado:', error);
        historyList.innerHTML = `<div class="list-group-item text-danger">Erro: ${error.message}</div>`;
    } finally {
        refreshHistoryBtn.disabled = false;
        refreshHistoryBtn.textContent = 'Atualizar';
    }
}