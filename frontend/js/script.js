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

 // Inicializa o jsPDF
        const { jsPDF } = window.jspdf;
        
        // Configurações do documento
        let docConfig = {
            template: 'simple',
            orientation: 'portrait',
            size: 'a4',
            margins: 'normal',
            header: true,
            footer: true,
            pageNumbers: false
        };
        
        // Event listeners
        $(document).ready(function() {
            // Template selection
            $('.template-btn').click(function() {
                $('.template-btn').removeClass('border-indigo-500 bg-indigo-50');
                $(this).addClass('border-indigo-500 bg-indigo-50');
                docConfig.template = $(this).data('template');
                applyTemplate();
            });
            
            // Orientation selection
            $('.orientation-btn').click(function() {
                $('.orientation-btn').removeClass('bg-indigo-600 text-white');
                $(this).addClass('bg-indigo-600 text-white');
                docConfig.orientation = $(this).data('orientation');
            });
            
            // Margin selection
            $('#margin-select').change(function() {
                docConfig.margins = $(this).val();
            });
            
            // Size selection
            $('#size-select').change(function() {
                docConfig.size = $(this).val();
            });
            
            // Toggle switches
            $('#header-toggle').change(function() {
                docConfig.header = $(this).is(':checked');
                $('#pdf-header').toggle(docConfig.header);
            });
            
            $('#footer-toggle').change(function() {
                docConfig.footer = $(this).is(':checked');
                $('#pdf-footer').toggle(docConfig.footer);
            });
            
            $('#pagenum-toggle').change(function() {
                docConfig.pageNumbers = $(this).is(':checked');
            });
            
            // Add elements
            $('.add-element-btn').click(function() {
                const elementType = $(this).data('element');
                addElement(elementType);
            });
            
            // Export PDF
            $('#export-pdf').click(function() {
                generatePDF();
            });
            
            // Clear content
            $('#clear-btn').click(function() {
                $('#pdf-content').html('<div class="mb-6" contenteditable="true"><h2 class="text-xl font-bold mb-3 border-b pb-2">Nova Seção</h2><p>Comece a digitar seu conteúdo aqui...</p></div>');
            });
            
            // Save document
            $('#save-btn').click(function() {
                alert('Documento salvo com sucesso!');
                // Aqui você implementaria a lógica para salvar no servidor
            });
            
            // Aplica o template padrão
            $('.template-btn[data-template="simple"]').click();
        });
        
        // Aplica o template selecionado
        function applyTemplate() {
            let headerColor, textColor;
            
            switch(docConfig.template) {
                case 'professional':
                    headerColor = 'text-gray-800';
                    textColor = 'text-gray-600';
                    $('#pdf-preview').css('background-color', '#ffffff');
                    break;
                case 'academic':
                    headerColor = 'text-blue-800';
                    textColor = 'text-gray-700';
                    $('#pdf-preview').css('background-color', '#f8fafc');
                    break;
                case 'creative':
                    headerColor = 'text-purple-600';
                    textColor = 'text-gray-700';
                    $('#pdf-preview').css('background-color', '#faf5ff');
                    break;
                default: // simple
                    headerColor = 'text-gray-900';
                    textColor = 'text-gray-700';
                    $('#pdf-preview').css('background-color', '#ffffff');
            }
            
            $('#pdf-header h1').removeClass().addClass('text-3xl font-bold mb-2 ' + headerColor);
            $('#pdf-header p').removeClass().addClass(textColor);
            $('#pdf-content h2').removeClass().addClass('text-xl font-bold mb-3 border-b pb-2 ' + headerColor);
            $('#pdf-content p').removeClass().addClass('mb-4 ' + textColor);
        }
        
        // Adiciona novo elemento
        function addElement(type) {
            let elementHtml = '';
            
            switch(type) {
                case 'text':
                    elementHtml = '<div class="mb-6" contenteditable="true"><p>Novo parágrafo de texto. Comece a digitar aqui...</p></div>';
                    break;
                case 'image':
                    elementHtml = `
                        <div class="mb-6">
                            <div class="border-2 border-dashed border-gray-300 p-4 text-center">
                                <p class="text-gray-500 mb-2">Clique para adicionar uma imagem</p>
                                <button class="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-lg">
                                    <i class="fas fa-upload mr-2"></i>Enviar Imagem
                                </button>
                            </div>
                        </div>
                    `;
                    break;
                case 'table':
                    elementHtml = `
                        <div class="mb-6" contenteditable="true">
                            <table class="w-full border-collapse">
                                <thead>
                                    <tr class="bg-gray-100">
                                        <th class="border p-2 text-left">Cabeçalho 1</th>
                                        <th class="border p-2 text-left">Cabeçalho 2</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td class="border p-2">Dado 1</td>
                                        <td class="border p-2">Dado 2</td>
                                    </tr>
                                    <tr class="bg-gray-50">
                                        <td class="border p-2">Dado 3</td>
                                        <td class="border p-2">Dado 4</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    `;
                    break;
                case 'list':
                    elementHtml = `
                        <div class="mb-6" contenteditable="true">
                            <ul class="list-disc pl-5">
                                <li class="mb-2">Item de lista 1</li>
                                <li class="mb-2">Item de lista 2</li>
                                <li>Item de lista 3</li>
                            </ul>
                        </div>
                    `;
                    break;
            }
            
            $('#pdf-content').append(elementHtml);
        }
        
        // Gera o PDF
        function generatePDF() {
            // Mostra loading
            $('#export-pdf').html('<i class="fas fa-spinner fa-spin mr-2"></i> Gerando...');
            
            // Usa html2canvas para capturar o conteúdo
            html2canvas(document.getElementById('pdf-preview')).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: docConfig.orientation,
                    unit: 'mm',
                    format: docConfig.size
                });
                
                // Calcula as dimensões
                const imgWidth = pdf.internal.pageSize.getWidth();
                let imgHeight = canvas.height * imgWidth / canvas.width;
                
                // Adiciona a imagem ao PDF
                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                
                // Baixa o PDF
                pdf.save('documento-gerado.pdf');
                
                // Restaura o botão
                $('#export-pdf').html('<i class="fas fa-file-pdf mr-2"></i> PDF');
            });
        }