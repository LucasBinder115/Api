// Variáveis globais
let questions = [];
let currentQuestionId = 0;
let genAI; // Instância do GenerativeAI

// Inicialização
$(document).ready(async function() {
    await initializeGenAI();
    initializeEventListeners();
});

// Inicializa o Generative AI
async function initializeGenAI() {
    try {
        // Carrega a biblioteca do Google Generative AI
        const { GoogleGenerativeAI } = await import('https://esm.run/@google/generative-ai');
        
        // Inicializa com sua API Key
        genAI = new GoogleGenerativeAI('AIzaSyDe-AA1In-JFixZxE40-IgEz1G-2j1cVyA');
    } catch (error) {
        console.error('Erro ao carregar a biblioteca Generative AI:', error);
        alert('Erro ao carregar o serviço de IA. Algumas funcionalidades podem não estar disponíveis.');
    }
}

function initializeEventListeners() {
    // Adicionar questão
    $('.add-question-btn').click(function() {
        const type = $(this).data('type');
        addQuestion(type);
    });
    
    // Limpar tudo
    $('#clear-all').click(function() {
        if(confirm('Tem certeza que deseja limpar todas as questões?')) {
            clearAllQuestions();
        }
    });
    
    // Gerar com IA
    $('#generate-with-ai').click(function() {
        $('#ai-modal').removeClass('hidden');
    });
    
    $('#cancel-ai').click(function() {
        $('#ai-modal').addClass('hidden');
    });
    
    $('#confirm-ai').click(async function() {
        const topic = $('#ai-topic').val();
        const level = $('#ai-level').val();
        const quantity = parseInt($('#ai-quantity').val());
        
        if(!topic) {
            alert('Por favor, insira um tema/assunto');
            return;
        }
        
        await generateQuestionsWithAI(topic, level, quantity);
        $('#ai-modal').addClass('hidden');
    });
    
    // Exportar PDF
    $('#export-pdf').click(function() {
        exportToPDF();
    });
    
    // Exportar Gabarito
    $('#export-answer-key').click(function() {
        exportAnswerKey();
    });
}

function clearAllQuestions() {
    questions = [];
    $('#questions-container').empty();
    currentQuestionId = 0;
}

// Função para adicionar uma nova questão
function addQuestion(type, content = {}) {
    const id = currentQuestionId++;
    const questionNumber = questions.length + 1;
    let questionHtml = '';
    
    switch(type) {
        case 'multiple-choice':
            questionHtml = getMultipleChoiceHtml(id, questionNumber, content);
            break;
        case 'true-false':
            questionHtml = getTrueFalseHtml(id, questionNumber, content);
            break;
        case 'short-answer':
            questionHtml = getShortAnswerHtml(id, questionNumber, content);
            break;
        case 'essay':
            questionHtml = getEssayHtml(id, questionNumber, content);
            break;
        default:
            console.error('Tipo de questão não suportado:', type);
            return;
    }
    
    $('#questions-container').append(questionHtml);
    setupQuestionEventListeners(id, type);
    
    // Adicionar à lista de questões
    questions.push({
        id: id,
        type: type,
        content: content
    });
}

// ... [mantenha todas as funções get*Html e setupQuestionEventListeners como estão] ...

// Gerar questões com Generative AI
async function generateQuestionsWithAI(topic, level, quantity) {
    $('#generate-with-ai').html('<i class="fas fa-spinner fa-spin mr-1"></i> Gerando...');
    
    try {
        if (!genAI) {
            throw new Error('Serviço de IA não inicializado');
        }
        
        // Obtém o modelo generativo
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        // Prompt estruturado para gerar questões
        const prompt = `
        Você é um especialista em criação de avaliações educacionais. 
        Gere ${quantity} questões sobre "${topic}" para o nível ${level}.
        
        Requisitos:
        - Inclua diferentes tipos: múltipla escolha, verdadeiro/falso, resposta curta e dissertativa
        - Para múltipla escolha, forneça 4 opções e indique a correta
        - Use o seguinte formato JSON para cada questão:
          {
            "type": "tipo da questão",
            "question": "texto da questão",
            "options": [ // apenas para múltipla escolha
              {"text": "opção 1", "correct": true/false},
              ...
            ],
            "answer": "resposta" // para outros tipos
          }
          
        Retorne APENAS o JSON com um array de questões, sem comentários ou markdown.
        `;
        
        // Gera o conteúdo
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const generatedText = response.text();
        
        // Parse da resposta
        const jsonResponse = parseAIResponse(generatedText);
        
        // Adiciona as questões ao editor
        if(jsonResponse.questions && jsonResponse.questions.length > 0) {
            jsonResponse.questions.forEach(q => {
                addQuestion(q.type, q);
            });
        } else if(Array.isArray(jsonResponse)) {
            // Caso a resposta seja diretamente o array de questões
            jsonResponse.forEach(q => {
                addQuestion(q.type, q);
            });
        } else {
            throw new Error('Formato de resposta da IA não reconhecido');
        }
        
    } catch (error) {
        console.error('Erro ao gerar questões com IA:', error);
        alert(`Erro: ${error.message}`);
        
        // Fallback para dados simulados em caso de erro
        if (confirm('Falha ao conectar com a IA. Deseja usar questões de exemplo?')) {
            generateSampleQuestions(topic, quantity);
        }
    } finally {
        $('#generate-with-ai').html('<i class="fas fa-robot mr-1"></i> Gerar com IA');
    }
}
function getMultipleChoiceHtml(id, questionNumber, content) {
    const optionsHtml = content.options ? 
        content.options.map((opt, i) => `
            <div class="flex items-center option">
                <input type="radio" name="q${id}" class="mr-2 correct-answer" ${opt.correct ? 'checked' : ''}>
                <input type="text" class="flex-1 border rounded p-2 option-text" value="${opt.text || ''}" placeholder="Opção ${i+1}">
                <button class="delete-option ml-2 text-red-500"><i class="fas fa-times"></i></button>
            </div>
        `).join('') : `
            <div class="flex items-center option">
                <input type="radio" name="q${id}" class="mr-2 correct-answer">
                <input type="text" class="flex-1 border rounded p-2 option-text" placeholder="Opção 1">
                <button class="delete-option ml-2 text-red-500"><i class="fas fa-times"></i></button>
            </div>
            <div class="flex items-center option">
                <input type="radio" name="q${id}" class="mr-2 correct-answer">
                <input type="text" class="flex-1 border rounded p-2 option-text" placeholder="Opção 2">
                <button class="delete-option ml-2 text-red-500"><i class="fas fa-times"></i></button>
            </div>
        `;

    return `
        <div class="question-card border rounded-lg p-4" data-id="${id}" data-type="multiple-choice">
            <div class="flex justify-between items-center mb-2">
                <span class="font-medium">Questão ${questionNumber} (Múltipla Escolha)</span>
                <button class="delete-question text-red-500"><i class="fas fa-times"></i></button>
            </div>
            <textarea class="w-full border rounded p-2 mb-3 question-text" placeholder="Enunciado da questão">${content.question || ''}</textarea>
            <div class="options-container space-y-2 mb-3">
                ${optionsHtml}
            </div>
            <button class="add-option text-sm text-indigo-600"><i class="fas fa-plus mr-1"></i> Adicionar Opção</button>
        </div>
    `;
}

function getTrueFalseHtml(id, questionNumber, content) {
    return `
        <div class="question-card border rounded-lg p-4" data-id="${id}" data-type="true-false">
            <div class="flex justify-between items-center mb-2">
                <span class="font-medium">Questão ${questionNumber} (Verdadeiro/Falso)</span>
                <button class="delete-question text-red-500"><i class="fas fa-times"></i></button>
            </div>
            <textarea class="w-full border rounded p-2 mb-3 question-text" placeholder="Enunciado da questão">${content.question || ''}</textarea>
            <div class="flex items-center space-x-4">
                <label class="flex items-center">
                    <input type="radio" name="q${id}-tf" value="true" class="mr-2" ${content.answer === 'true' ? 'checked' : ''}> Verdadeiro
                </label>
                <label class="flex items-center">
                    <input type="radio" name="q${id}-tf" value="false" class="mr-2" ${content.answer === 'false' ? 'checked' : ''}> Falso
                </label>
            </div>
        </div>
    `;
}

function getShortAnswerHtml(id, questionNumber, content) {
    return `
        <div class="question-card border rounded-lg p-4" data-id="${id}" data-type="short-answer">
            <div class="flex justify-between items-center mb-2">
                <span class="font-medium">Questão ${questionNumber} (Resposta Curta)</span>
                <button class="delete-question text-red-500"><i class="fas fa-times"></i></button>
            </div>
            <textarea class="w-full border rounded p-2 mb-3 question-text" placeholder="Enunciado da questão">${content.question || ''}</textarea>
            <div class="flex items-center">
                <span class="mr-2">Resposta:</span>
                <input type="text" class="flex-1 border rounded p-2 answer-text" value="${content.answer || ''}">
            </div>
        </div>
    `;
}

function getEssayHtml(id, questionNumber, content) {
    return `
        <div class="question-card border rounded-lg p-4" data-id="${id}" data-type="essay">
            <div class="flex justify-between items-center mb-2">
                <span class="font-medium">Questão ${questionNumber} (Dissertativa)</span>
                <button class="delete-question text-red-500"><i class="fas fa-times"></i></button>
            </div>
            <textarea class="w-full border rounded p-2 mb-3 question-text" placeholder="Enunciado da questão">${content.question || ''}</textarea>
            <div class="bg-gray-100 p-3 rounded">
                <p class="text-gray-500">Espaço para resposta (será ajustado no PDF)</p>
            </div>
        </div>
    `;
}

function setupQuestionEventListeners(id, type) {
    // Configurar eventos para a nova questão
    $(`#questions-container .question-card[data-id="${id}"] .delete-question`).click(function() {
        $(this).closest('.question-card').remove();
        questions = questions.filter(q => q.id !== id);
        updateQuestionNumbers();
    });
    
    if(type === 'multiple-choice') {
        $(`#questions-container .question-card[data-id="${id}"] .add-option`).click(function() {
            addOptionToQuestion(id);
        });
        
        $(`#questions-container .question-card[data-id="${id}"] .delete-option`).click(function() {
            $(this).closest('.option').remove();
        });
    }
}

function addOptionToQuestion(questionId) {
    const optionsContainer = $(`#questions-container .question-card[data-id="${questionId}"] .options-container`);
    const optionCount = optionsContainer.find('.option').length + 1;
    
    optionsContainer.append(`
        <div class="flex items-center option">
            <input type="radio" name="q${questionId}" class="mr-2 correct-answer">
            <input type="text" class="flex-1 border rounded p-2 option-text" placeholder="Opção ${optionCount}">
            <button class="delete-option ml-2 text-red-500"><i class="fas fa-times"></i></button>
        </div>
    `);
    
    optionsContainer.find('.delete-option').last().click(function() {
        $(this).closest('.option').remove();
    });
}

// Atualizar números das questões
function updateQuestionNumbers() {
    $('#questions-container .question-card').each(function(index) {
        const type = $(this).data('type');
        let typeText = '';
        
        switch(type) {
            case 'multiple-choice': typeText = 'Múltipla Escolha'; break;
            case 'true-false': typeText = 'Verdadeiro/Falso'; break;
            case 'short-answer': typeText = 'Resposta Curta'; break;
            case 'essay': typeText = 'Dissertativa'; break;
        }
        
        $(this).find('span.font-medium').text(`Questão ${index + 1} (${typeText})`);
    });
}

// Exportar para PDF
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: $('#orientation').val(),
        unit: 'mm',
        format: $('#page-size').val()
    });
    
    const title = $('#exam-title').val() || 'Prova Sem Título';
    const subject = $('#exam-subject').val() || '';
    const grade = $('#exam-grade').val() || '';
    
    // Cabeçalho
    doc.setFontSize(16);
    doc.text(title, 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Matéria: ${subject}`, 20, 30);
    doc.text(`Turma: ${grade}`, 20, 36);
    
    let yPosition = 50;
    
    // Questões
    $('#questions-container .question-card').each(function(index) {
        const type = $(this).data('type');
        const questionText = $(this).find('.question-text').val();
        
        if(yPosition > 250) { // Nova página se estiver perto do fim
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(12);
        doc.text(`${index + 1}. ${questionText}`, 20, yPosition);
        yPosition += 10;
        
        if(type === 'multiple-choice') {
            $(this).find('.option').each(function(i) {
                const optionText = $(this).find('.option-text').val();
                doc.text(`   ${String.fromCharCode(97 + i)}) ${optionText}`, 20, yPosition);
                yPosition += 7;
            });
            yPosition += 5;
        } 
        else if(type === 'true-false') {
            yPosition += 5;
        }
        else if(type === 'short-answer') {
            doc.text('______________________________________________________', 20, yPosition);
            yPosition += 10;
        }
        else if(type === 'essay') {
            doc.text('________________________________________________________________________', 20, yPosition);
            doc.text('________________________________________________________________________', 20, yPosition + 5);
            doc.text('________________________________________________________________________', 20, yPosition + 10);
            doc.text('________________________________________________________________________', 20, yPosition + 15);
            yPosition += 25;
        }
        
        yPosition += 10; // Espaço entre questões
    });
    
    doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
}

// Exportar gabarito
function exportAnswerKey() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: $('#orientation').val(),
        unit: 'mm',
        format: $('#page-size').val()
    });
    
    const title = $('#exam-title').val() || 'Prova Sem Título';
    
    doc.setFontSize(16);
    doc.text(`Gabarito - ${title}`, 105, 20, { align: 'center' });
    
    let yPosition = 30;
    
    // Gabarito
    $('#questions-container .question-card').each(function(index) {
        const type = $(this).data('type');
        
        if(yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(12);
        doc.text(`${index + 1}.`, 20, yPosition);
        
        if(type === 'multiple-choice') {
            const correctIndex = $(this).find('.correct-answer:checked').index('.correct-answer');
            doc.text(`Resposta: ${String.fromCharCode(97 + correctIndex)}`, 30, yPosition);
        } 
        else if(type === 'true-false') {
            const answer = $(this).find('input[type="radio"]:checked').val();
            doc.text(`Resposta: ${answer === 'true' ? 'Verdadeiro' : 'Falso'}`, 30, yPosition);
        }
        else if(type === 'short-answer') {
            const answer = $(this).find('.answer-text').val();
            doc.text(`Resposta: ${answer}`, 30, yPosition);
        }
        else if(type === 'essay') {
            doc.text(`Resposta: [Dissertativa - avaliar conforme critérios]`, 30, yPosition);
        }
        
        yPosition += 10;
    });
    
    doc.save(`gabarito_${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
}

// Gerar questões com IA (Gemini API)
async function generateQuestionsWithAI(topic, level, quantity) {
    $('#generate-with-ai').html('<i class="fas fa-spinner fa-spin mr-1"></i> Gerando...');
    
    try {
        // Verifica se a API do Google está carregada
        if (!window.gapi) {
            throw new Error('API do Google não carregada');
        }
        
        // Carrega o cliente da API
        await new Promise((resolve, reject) => {
            gapi.load('client', { callback: resolve, onerror: reject });
        });
        
        
        // Prompt para o Gemini
    
        
        // Processa a resposta
        const generatedText = response.result.candidates[0].content.parts[0].text;
        const jsonResponse = parseAIResponse(generatedText);
        
        // Adiciona as questões ao editor
        if(jsonResponse.questions && jsonResponse.questions.length > 0) {
            jsonResponse.questions.forEach(q => {
                addQuestion(q.type, q);
            });
        } else {
            throw new Error('A IA não retornou questões no formato esperado');
        }
        
    } catch (error) {
        console.error('Erro ao gerar questões com IA:', error);
        alert(`Erro: ${error.message}`);
        
        // Fallback para dados simulados em caso de erro
        if (confirm('Falha ao conectar com a IA. Deseja usar questões de exemplo?')) {
            generateSampleQuestions(topic, quantity);
        }
    } finally {
        $('#generate-with-ai').html('<i class="fas fa-robot mr-1"></i> Gerar com IA');
    }
}

function parseAIResponse(generatedText) {
    try {
        // Tenta extrair o JSON se estiver em um bloco de código
        const jsonMatch = generatedText.match(/```json\n([\s\S]*?)\n```/);
        if(jsonMatch) {
            return JSON.parse(jsonMatch[1]);
        }
        
        // Tenta encontrar JSON no texto
        const jsonStart = generatedText.indexOf('{');
        const jsonEnd = generatedText.lastIndexOf('}') + 1;
        if(jsonStart !== -1 && jsonEnd !== -1) {
            return JSON.parse(generatedText.substring(jsonStart, jsonEnd));
        }
        
        // Última tentativa - parse direto
        return JSON.parse(generatedText);
    } catch(e) {
        console.error('Erro ao parsear resposta:', e);
        throw new Error('Não foi possível interpretar a resposta da IA');
    }
}

function generateSampleQuestions(topic, quantity) {
    const sampleQuestions = [];
    
    for(let i = 0; i < quantity; i++) {
        const type = ['multiple-choice', 'true-false', 'short-answer', 'essay'][i % 4];
        
        switch(type) {
            case 'multiple-choice':
                sampleQuestions.push({
                    type: type,
                    question: `Sobre ${topic}, qual das alternativas abaixo está correta?`,
                    options: [
                        { text: `Alternativa A sobre ${topic}`, correct: i % 4 === 0 },
                        { text: `Alternativa B sobre ${topic}`, correct: i % 4 === 1 },
                        { text: `Alternativa C sobre ${topic}`, correct: i % 4 === 2 },
                        { text: `Alternativa D sobre ${topic}`, correct: i % 4 === 3 }
                    ]
                });
                break;
                
            case 'true-false':
                sampleQuestions.push({
                    type: type,
                    question: `Verdadeiro ou Falso: Esta é uma afirmação verdadeira sobre ${topic}.`,
                    answer: i % 2 === 0 ? 'true' : 'false'
                });
                break;
                
            case 'short-answer':
                sampleQuestions.push({
                    type: type,
                    question: `Explique brevemente sobre ${topic}.`,
                    answer: `Resposta modelo sobre ${topic}`
                });
                break;
                
            case 'essay':
                sampleQuestions.push({
                    type: type,
                    question: `Disserte sobre o tema "${topic}".`,
                    answer: ''
                });
                break;
        }
    }
    
    // Adicionar questões ao editor
    sampleQuestions.forEach(q => {
        addQuestion(q.type, q);
    });
}