document.addEventListener('DOMContentLoaded', () => {
    const { jsPDF } = window.jspdf;

    let docConfig = {
        template: 'simple',
        orientation: 'portrait',
        size: 'a4',
        margins: 'normal',
        header: true,
        footer: true,
        pageNumbers: false
    };

    const $pdfPreview = $('#pdf-preview');
    const $pdfHeader = $('#pdf-header');
    const $pdfContent = $('#pdf-content');
    const $pdfFooter = $('#pdf-footer');

    // Inicialização
    $('.template-btn[data-template="simple"]').click();

    // Aplicar template visual
    function applyTemplate() {
        const styles = {
            simple: { header: 'text-gray-900', text: 'text-gray-700', bg: '#ffffff' },
            professional: { header: 'text-gray-800', text: 'text-gray-600', bg: '#ffffff' },
            academic: { header: 'text-blue-800', text: 'text-gray-700', bg: '#f8fafc' },
            creative: { header: 'text-purple-600', text: 'text-gray-700', bg: '#faf5ff' }
        };

        const { header, text, bg } = styles[docConfig.template];
        $pdfPreview.css('background-color', bg);
        $pdfHeader.find('h1').attr('class', `text-3xl font-bold mb-2 ${header}`);
        $pdfHeader.find('p').attr('class', text);
        $pdfContent.find('h2').attr('class', `text-xl font-bold mb-3 border-b pb-2 ${header}`);
        $pdfContent.find('p').attr('class', `mb-4 ${text}`);
    }

    // Adicionar elementos ao conteúdo
    function addElement(type) {
        const elements = {
            text: `<div class="mb-6" contenteditable="true"><p>Novo parágrafo de texto. Comece a digitar aqui...</p></div>`,
            image: `<div class="mb-6"><div class="border-2 border-dashed border-gray-300 p-4 text-center"><p class="text-gray-500 mb-2">Clique para adicionar uma imagem</p><button class="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-lg"><i class="fas fa-upload mr-2"></i>Enviar Imagem</button></div></div>`,
            table: `<div class="mb-6" contenteditable="true"><table class="w-full border-collapse"><thead><tr class="bg-gray-100"><th class="border p-2 text-left">Cabeçalho 1</th><th class="border p-2 text-left">Cabeçalho 2</th></tr></thead><tbody><tr><td class="border p-2">Dado 1</td><td class="border p-2">Dado 2</td></tr><tr class="bg-gray-50"><td class="border p-2">Dado 3</td><td class="border p-2">Dado 4</td></tr></tbody></table></div>`,
            list: `<div class="mb-6" contenteditable="true"><ul class="list-disc pl-5"><li class="mb-2">Item de lista 1</li><li class="mb-2">Item de lista 2</li><li>Item de lista 3</li></ul></div>`
        };
        $pdfContent.append(elements[type] || '');
    }

    function generatePDF() {
        $('#export-pdf').html('<i class="fas fa-spinner fa-spin mr-2"></i> Gerando...');
        html2canvas(document.getElementById('pdf-preview')).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: docConfig.orientation, unit: 'mm', format: docConfig.size });

            const imgWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = canvas.height * imgWidth / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save('documento-gerado.pdf');

            $('#export-pdf').html('<i class="fas fa-file-pdf mr-2"></i> PDF');
        });
    }

    async function saveDocument() {
        const token = localStorage.getItem('token');
        const content = $pdfContent.html();
        try {
            const response = await fetch('/api/save-document', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content, config: docConfig })
            });
            if (!response.ok) throw new Error('Falha ao salvar documento');
            alert('Documento salvo com sucesso!');
        } catch (err) {
            console.error('Erro:', err);
            alert('Erro ao salvar documento! Verifique se você está logado.');
        }
    }

    // Conversão de arquivos
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');
    const outputFormat = document.getElementById('output-format');
    const convertBtn = document.getElementById('convert-btn');

    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileInfo.textContent = `Arquivo selecionado: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
            fileInfo.classList.remove('hidden');
        }
    });

    convertBtn?.addEventListener('click', async () => {
        if (!fileInput.files.length) return showConversionStatus('Por favor, selecione um arquivo primeiro.', 'error');

        const file = fileInput.files[0];
        try {
            showConversionStatus('Convertendo arquivo...', 'info');
            const blob = await convertToPdf(file); // Exemplo apenas com PDF por ora
            downloadFile(blob, `converted.pdf`);
            showConversionStatus('Conversão concluída com sucesso!', 'success');
        } catch (error) {
            console.error('Erro na conversão:', error);
            showConversionStatus('Erro ao converter arquivo: ' + error.message, 'error');
        }
    });

    function showConversionStatus(message, type) {
        const statusClass = `conversion-status ${type}`;
        let statusElement = document.querySelector('.conversion-status');

        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.className = statusClass;
            convertBtn.parentNode.insertBefore(statusElement, convertBtn.nextSibling);
        }

        statusElement.className = statusClass;
        statusElement.textContent = message;
    }

    async function convertToPdf(file) {
        if (file.name.endsWith('.docx')) {
            const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
            const doc = new jsPDF();
            doc.text(result.value, 10, 10);
            return doc.output('blob');
        } else {
            return createPdfFromText(await file.text());
        }
    }

    async function createPdfFromText(text) {
        const doc = new jsPDF();
        doc.text(text, 10, 10);
        return doc.output('blob');
    }

    function downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    // Event listeners
    $('.template-btn').click(function () {
        $('.template-btn').removeClass('border-indigo-500 bg-indigo-50');
        $(this).addClass('border-indigo-500 bg-indigo-50');
        docConfig.template = $(this).data('template');
        applyTemplate();
    });

    $('.orientation-btn').click(function () {
        $('.orientation-btn').removeClass('bg-indigo-600 text-white').addClass('border-gray-300');
        $(this).addClass('bg-indigo-600 text-white').removeClass('border-gray-300');
        docConfig.orientation = $(this).data('orientation');
    });

    $('#margin-select').change(function () {
        docConfig.margins = $(this).val();
    });

    $('#size-select').change(function () {
        docConfig.size = $(this).val();
    });

    $('#header-toggle').change(function () {
        docConfig.header = $(this).is(':checked');
        $pdfHeader.toggle(docConfig.header);
    });

    $('#footer-toggle').change(function () {
        docConfig.footer = $(this).is(':checked');
        $pdfFooter.toggle(docConfig.footer);
    });

    $('#pagenum-toggle').change(function () {
        docConfig.pageNumbers = $(this).is(':checked');
    });

    $('.add-element-btn').click(function () {
        addElement($(this).data('element'));
    });

    $('#export-pdf').click(generatePDF);
    $('#save-btn').click(saveDocument);
    $('#clear-btn').click(() => {
        $pdfContent.html('<div class="mb-6" contenteditable="true"><h2 class="text-xl font-bold mb-3 border-b pb-2">Nova Seção</h2><p>Comece a digitar seu conteúdo aqui...</p></div>');
    });
});
