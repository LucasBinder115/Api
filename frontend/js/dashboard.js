// State management
let currentQuestions = [];
let currentTopic = '';
let selectedHistoryId = null;
let historyData = [];

// Simulated database for demo purposes
let mockDatabase = {
    pdfs: [
        {
            id: 1,
            topic: 'História do Brasil',
            date: '2024-01-15 14:30:00',
            questions: 15,
            size: 245.67,
            questionsList: [
                'Quando foi proclamada a independência do Brasil?',
                'Quem foi o primeiro imperador do Brasil?',
                'Em que ano foi abolida a escravidão?',
                'Qual foi o primeiro presidente da República?',
                'Quando aconteceu a Revolução de 1930?'
            ]
        },
        {
            id: 2,
            topic: 'Matemática Básica',
            date: '2024-01-14 09:15:00',
            questions: 12,
            size: 198.23,
            questionsList: [
                'Qual é o resultado de 15 + 27?',
                'Como se calcula a área de um retângulo?',
                'Qual é a fórmula da equação de segundo grau?',
                'O que são números primos?'
            ]
        }
    ]
};

// Initialize slider for question types
function initializeQuestionTypeSlider() {
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'question-type-slider';
    const types = [
        { type: 'multiple-choice', label: 'Múltipla Escolha', icon: '📋' },
        { type: 'true-false', label: 'V/F', icon: '✅' },
        { type: 'short-answer', label: 'Curta', icon: '✍️' },
        { type: 'essay', label: 'Dissertativa', icon: '📝' }
    ];

    types.forEach(type => {
        const slide = document.createElement('div');
        slide.className = 'slider-item';
        slide.innerHTML = `
            <span>${type.icon}</span>
            <span>${type.label}</span>
        `;
        slide.onclick = () => selectQuestionType(type.type);
        sliderContainer.appendChild(slide);
    });

    document.querySelector('.question-type-btn').parentElement.replaceWith(sliderContainer);
}

// Select question type from slider
function selectQuestionType(type) {
    document.querySelectorAll('.slider-item').forEach(item => item.classList.remove('selected'));
    const selectedSlide = Array.from(document.querySelectorAll('.slider-item')).find(slide => slide.textContent.includes(type));
    if (selectedSlide) selectedSlide.classList.add('selected');
    // Add functionality to filter or pre-select question types for generation
}

// Tab navigation with smooth transition
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        tab.style.opacity = '0.5';
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.opacity = '0';
        content.style.transform = 'translateY(20px)';
    });

    const activeTab = document.querySelector(`[onclick="switchTab('${tabName}')"]`);
    activeTab.classList.add('active');
    activeTab.style.opacity = '1';

    const activeContent = document.getElementById(`${tabName}-tab`);
    activeContent.classList.add('active');
    activeContent.style.opacity = '1';
    activeContent.style.transform = 'translateY(0)';

    if (tabName === 'history') {
        loadHistory();
    }
}

// Generate questions with animation
async function generateQuestions() {
    const topic = document.getElementById('topic-input').value.trim();
    const numQuestions = parseInt(document.getElementById('num-questions').value) || 10;

    if (!topic) {
        alert('Por favor, digite um tema!');
        return;
    }

    const generateBtn = document.getElementById('generate-btn');
    const outputArea = document.getElementById('output-area');

    generateBtn.disabled = true;
    generateBtn.innerHTML = '⏳ Gerando...';

    outputArea.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Gerando perguntas sobre "${topic}"...</p>
        </div>
    `;

    try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const mockQuestions = generateMockQuestions(topic, numQuestions);
        currentQuestions = mockQuestions;
        currentTopic = topic;

        displayQuestions(mockQuestions);
        document.getElementById('download-btn').disabled = false;
    } catch (error) {
        outputArea.innerHTML = `
            <div style="color: #dc3545; text-align: center; padding: 40px;">
                <h3>❌ Erro na geração</h3>
                <p>${error.message}</p>
            </div>
        `;
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '✨ Gerar Perguntas';
    }
}

// Generate mock questions
function generateMockQuestions(topic, numQuestions) {
    const questionTemplates = {
        "Matemática": [
            "Como resolver equações de segundo grau?",
            "Qual é a fórmula da área de um círculo?",
            "O que é o Teorema de Pitágoras e como aplicá-lo?",
            "Como calcular derivadas e integrais?",
            "Qual a diferença entre probabilidade e estatística?",
            "O que são números primos e como identificá-los?",
            "Como funciona o sistema binário?",
            "Qual é a importância da álgebra linear na computação?",
            "Como provar uma identidade trigonométrica?",
            "O que é um logaritmo e para que serve?"
        ],
        "Programação": [
            "Quais são os princípios do paradigma de orientação a objetos?",
            "Como otimizar o tempo de execução de um algoritmo?",
            "O que é recursão e quando usá-la?",
            "Qual a diferença entre linguagens compiladas e interpretadas?",
            "Como funciona o garbage collection em linguagens de programação?",
            "O que são design patterns e por que são importantes?",
            "Como lidar com exceções em programação?",
            "Qual a diferença entre stack e heap?",
            "O que são ponteiros e como usá-los?",
            "Como escrever código limpo e legível?"
        ],
        "Python": [
            "Como usar list comprehensions em Python?",
            "Qual a diferença entre listas, tuplas e dicionários?",
            "Como criar e usar decorators em Python?",
            "O que são geradores (generators) e quando utilizá-los?",
            "Como funciona o GIL (Global Interpreter Lock) no Python?",
            "Quais são as melhores práticas para manipulação de arquivos em Python?",
            "Como usar o módulo `asyncio` para programação assíncrona?",
            "O que são e como usar funções lambda?",
            "Como instalar e gerenciar pacotes com pip?",
            "Quais são as principais bibliotecas para ciência de dados em Python?"
        ],
        "Banco de Dados": [
            "Qual a diferença entre SQL e NoSQL?",
            "Como normalizar um banco de dados relacional?",
            "O que são índices e como melhoram a performance?",
            "Como escrever consultas SQL eficientes?",
            "O que são transações ACID?",
            "Como lidar com deadlocks em bancos de dados?",
            "Qual a diferença entre INNER JOIN, LEFT JOIN e RIGHT JOIN?",
            "O que são stored procedures e quando usá-las?",
            "Como fazer backup e recuperação de bancos de dados?",
            "Quais são as melhores práticas de segurança em bancos de dados?"
        ],
        "História": [
            "Quais foram as causas da Primeira Guerra Mundial?",
            "Como o Iluminismo influenciou a Revolução Francesa?",
            "Quais foram os principais impérios da Antiguidade?",
            "Como ocorreu a queda do Império Romano?",
            "Quais foram as consequências da Guerra Fria?",
            "Como foi o processo de independência do Brasil?",
            "Quem foram os principais líderes da Segunda Guerra Mundial?",
            "O que foi a Revolução Industrial e como mudou o mundo?",
            "Quais as origens do feudalismo na Europa?",
            "Como o colonialismo afetou a África?"
        ],
        "Video Game": [
            "Quais foram os consoles mais vendidos da história?",
            "Como a indústria de games evoluiu nas últimas décadas?",
            "Quais são os principais gêneros de jogos eletrônicos?",
            "Como funciona o desenvolvimento de um jogo AAA?",
            "Quais as diferenças entre Unreal Engine e Unity?",
            "O que é ray tracing e como impacta os gráficos dos jogos?",
            "Quem são os principais protagonistas da história dos videogames?",
            "Como os eSports se tornaram tão populares?",
            "Quais são os jogos mais caros já produzidos?",
            "Como a realidade virtual está mudando os games?"
        ],
        "Música Heavy Metal": [
            "Quais são as subdivisões do heavy metal?",
            "Quem são considerados os pais do heavy metal?",
            "Como o heavy metal surgiu nos anos 70?",
            "Quais são as bandas mais influentes do gênero?",
            "Como a vestimenta do metal se desenvolveu?",
            "O que caracteriza o som do heavy metal?",
            "Quais são os álbuns mais importantes do metal?",
            "Como o heavy metal influenciou outras músicas?",
            "Quais são os maiores festivais de metal do mundo?",
            "Como a cultura metal se espalhou pelo mundo?"
        ],
        "Thrash Metal": [
            "Quais são as bandas fundadoras do thrash metal?",
            "Como o thrash metal difere do heavy metal tradicional?",
            "Qual foi a importância do Big 4 do thrash metal?",
            "Como o thrash metal influenciou o death metal?",
            "Quais são os álbuns mais icônicos do thrash?",
            "Como o thrash metal se desenvolveu nos anos 80?",
            "Quais são as características técnicas do thrash?",
            "Como o thrash metal se mantém relevante hoje?",
            "Quais são as bandas modernas de thrash mais promissoras?",
            "Como o thrash metal se espalhou para além dos EUA?"
        ]
    };

    const questions = [];
    const templates = questionTemplates[topic] || [
        `O que é ${topic}?`,
        `Quais são as principais características de ${topic}?`,
        `Como ${topic} influencia nossa vida cotidiana?`,
        `Qual é a importância de ${topic}?`,
        `Quais são os benefícios de estudar ${topic}?`
    ];

    for (let i = 0; i < numQuestions; i++) {
        if (i < templates.length) {
            questions.push(`${i + 1}. ${templates[i]}`);
        } else {
            questions.push(`${i + 1}. Pergunta adicional sobre ${topic} - exemplo ${i + 1}?`);
        }
    }
    return questions;
}

// Exemplo de uso:
console.log(generateMockQuestions("Thrash Metal", 5));
console.log(generateMockQuestions("Python", 7));
console.log(generateMockQuestions("História", 3));

// Display questions with animation
function displayQuestions(questions) {
    const outputArea = document.getElementById('output-area');
    let html = '<div style="line-height: 2; font-size: 1.1rem;">';

    questions.forEach((question, index) => {
        html += `
            <div class="question-item" style="animation: slideIn 0.5s ease ${index * 0.1}s both;">
                ${question}
            </div>
        `;
    });

    html += '</div>';
    outputArea.innerHTML = html;
}

// Download PDF
async function downloadPDF() {
    if (!currentQuestions.length || !currentTopic) {
        alert('Gere perguntas primeiro!');
        return;
    }

    const downloadBtn = document.getElementById('download-btn');
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = '📥 Criando PDF...';

    try {
        await new Promise(resolve => setTimeout(resolve, 1500));

        const newPdf = {
            id: mockDatabase.pdfs.length + 1,
            topic: currentTopic,
            date: new Date().toISOString().slice(0, 19).replace('T', ' '),
            questions: currentQuestions.length,
            size: Math.random() * 300 + 100,
            questionsList: currentQuestions
        };

        mockDatabase.pdfs.unshift(newPdf);

        const blob = new Blob([currentQuestions.join('\n\n')], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `perguntas_${currentTopic.replace(/\s+/g, '_')}.txt`;
        a.click();
        window.URL.revokeObjectURL(url);

        alert(`PDF gerado com sucesso!\nTópico: ${currentTopic}\nPerguntas: ${currentQuestions.length}`);
    } catch (error) {
        alert('Erro ao criar PDF: ' + error.message);
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '📄 Baixar PDF';
    }
}

// Clear output
function clearOutput() {
    const outputArea = document.getElementById('output-area');
    outputArea.style.opacity = '0';
    setTimeout(() => {
        outputArea.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 20px;">📝</div>
                <h3>Pronto para gerar perguntas!</h3>
                <p>Digite um tema acima e clique em "Gerar Perguntas" para começar.</p>
            </div>
        `;
        outputArea.style.opacity = '1';
    }, 300);
    document.getElementById('topic-input').value = '';
    document.getElementById('download-btn').disabled = true;
    currentQuestions = [];
    currentTopic = '';
}

// Load history with animation
function loadHistory() {
    const tbody = document.getElementById('history-tbody');
    tbody.innerHTML = '';

    if (mockDatabase.pdfs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div style="font-size: 2rem; margin-bottom: 10px;">📚</div>
                    <p>Nenhum histórico encontrado</p>
                </td>
            </tr>
        `;
    } else {
        mockDatabase.pdfs.forEach((pdf, index) => {
            const row = document.createElement('tr');
            row.style.animation = `fadeIn 0.5s ease ${index * 0.1}s both`;
            row.onclick = () => selectHistoryRow(pdf.id, row);
            row.innerHTML = `
                <td>${pdf.id}</td>
                <td>${pdf.topic}</td>
                <td>${formatDate(pdf.date)}</td>
                <td>${pdf.questions}</td>
                <td>${pdf.size.toFixed(2)} KB</td>
            `;
            tbody.appendChild(row);
        });
    }

    updateStats();
}

// Update stats with animated counter
function updateStats() {
    const totalPdfs = mockDatabase.pdfs.length;
    const totalQuestions = mockDatabase.pdfs.reduce((sum, pdf) => sum + pdf.questions, 0);
    const totalSize = mockDatabase.pdfs.reduce((sum, pdf) => sum + pdf.size, 0);

    animateCounter('total-pdfs', totalPdfs);
    animateCounter('total-questions', totalQuestions);
    animateCounter('total-size', totalSize.toFixed(1));
}

function animateCounter(elementId, target) {
    let current = 0;
    const element = document.getElementById(elementId);
    const increment = target / 50;
    const interval = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(interval);
        }
        element.textContent = Math.round(current);
    }, 20);
}

// Select history row
function selectHistoryRow(id, row) {
    document.querySelectorAll('#history-tbody tr').forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');
    selectedHistoryId = id;

    const buttons = ['view-btn', 'download-selected-btn', 'delete-btn'];
    buttons.forEach(btnId => {
        document.getElementById(btnId).disabled = false;
    });
}

// View selected history
function viewSelected() {
    if (!selectedHistoryId) return;

    const pdf = mockDatabase.pdfs.find(p => p.id === selectedHistoryId);
    if (!pdf) return;

    document.getElementById('modal-title').textContent = `Perguntas: ${pdf.topic}`;

    let modalContent = `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h4>📊 Informações do Questionário</h4>
            <p><strong>Tópico:</strong> ${pdf.topic}</p>
            <p><strong>Gerado em:</strong> ${formatDate(pdf.date)}</p>
            <p><strong>Número de perguntas:</strong> ${pdf.questions}</p>
            <p><strong>Tamanho:</strong> ${pdf.size.toFixed(2)} KB</p>
        </div>
        <h4>❓ Perguntas:</h4>
    `;

    pdf.questionsList.forEach((question, index) => {
        modalContent += `
            <div class="question-item" style="animation: fadeIn 0.3s ease ${index * 0.05}s both;">
                ${index + 1}. ${question}
            </div>
        `;
    });

    document.getElementById('modal-body').innerHTML = modalContent;
    document.getElementById('view-modal').style.display = 'block';
    document.getElementById('view-modal').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('view-modal').style.opacity = '1';
    }, 100);
}

// Download selected history
function downloadSelected() {
    if (!selectedHistoryId) return;

    const pdf = mockDatabase.pdfs.find(p => p.id === selectedHistoryId);
    if (!pdf) return;

    const blob = new Blob([pdf.questionsList.join('\n\n')], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `perguntas_${pdf.topic.replace(/\s+/g, '_')}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Delete selected history
function deleteSelected() {
    if (!selectedHistoryId) return;

    const pdf = mockDatabase.pdfs.find(p => p.id === selectedHistoryId);
    if (!pdf) return;

    if (confirm(`Excluir permanentemente o PDF sobre '${pdf.topic}'?`)) {
        mockDatabase.pdfs = mockDatabase.pdfs.filter(p => p.id !== selectedHistoryId);
        selectedHistoryId = null;

        const buttons = ['view-btn', 'download-selected-btn', 'delete-btn'];
        buttons.forEach(btnId => {
            document.getElementById(btnId).disabled = true;
        });

        loadHistory();
        alert('Registro removido com sucesso!');
    }
}

// Close modal with animation
function closeModal() {
    const modal = document.getElementById('view-modal');
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// AI Modal Handling
document.getElementById('generate-with-ai').onclick = () => {
    document.getElementById('ai-modal').style.display = 'block';
    document.getElementById('ai-modal').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('ai-modal').style.opacity = '1';
    }, 100);
};

document.getElementById('cancel-ai').onclick = () => {
    const modal = document.getElementById('ai-modal');
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
};

document.getElementById('confirm-ai').onclick = async () => {
    const topic = document.getElementById('ai-topic').value.trim();
    const level = document.getElementById('ai-level').value;
    const quantity = parseInt(document.getElementById('ai-quantity').value);

    if (!topic || quantity < 1) {
        alert('Por favor, preencha o tema e a quantidade de questões!');
        return;
    }

    document.getElementById('topic-input').value = topic;
    document.getElementById('num-questions').value = quantity;

    const modal = document.getElementById('ai-modal');
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
        generateQuestions();
    }, 300);
};

// Add question dynamically
document.querySelectorAll('.add-question-btn').forEach(btn => {
    btn.onclick = () => {
        const type = btn.dataset.type;
        const questionsContainer = document.getElementById('questions-container');
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item';
        questionDiv.style.animation = 'fadeIn 0.5s ease';
        questionDiv.innerHTML = `
            <p>Nova questão (${type}): <input type="text" placeholder="Digite a questão aqui"></p>
        `;
        questionsContainer.appendChild(questionDiv);
    };
});

// Export PDF (placeholder)
document.getElementById('export-pdf').onclick = () => {
    alert('Exportando PDF... (Funcionalidade a ser implementada)');
};

// Export answer key (placeholder)
document.getElementById('export-answer-key').onclick = () => {
    alert('Exportando gabarito... (Funcionalidade a ser implementada)');
};

// Clear all questions
document.getElementById('clear-all').onclick = () => {
    document.getElementById('questions-container').innerHTML = '';
    clearOutput();
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeQuestionTypeSlider();
    switchTab('generate');
});