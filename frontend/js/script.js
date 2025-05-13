document.addEventListener('DOMContentLoaded', () => {
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

    // Elementos do DOM
    const $pdfPreview = $('#pdf-preview');
    const $pdfHeader = $('#pdf-header');
    const $pdfContent = $('#pdf-content');
    const $pdfFooter = $('#pdf-footer');

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

    $('#clear-btn').click(() => {
        $pdfContent.html('<div class="mb-6" contenteditable="true"><h2 class="text-xl font-bold mb-3 border-b pb-2">Nova Seção</h2><p>Comece a digitar seu conteúdo aqui...</p></div>');
    });

    $('#save-btn').click(saveDocument);

    // Aplica o template padrão
    $('.template-btn[data-template="simple"]').click();

    // Aplica o template selecionado
    function applyTemplate() {
        const styles = {
            simple: { header: 'text-gray-900', text: 'text-gray-700', bg: '#ffffff' },
            professional: { header: 'text-gray-800', text: 'text-gray-600', bg: '#ffffff' },
            academic: { header: 'text-blue-800', text: 'text-gray-700', bg: '#f8fafc' },
            creative: { header: 'text-purple-600', text: 'text-gray-700', bg: '#faf5ff' }
        };

        const { header, text, bg } = styles[docConfig.template];
        $pdfPreview.css('background-color', bg);
        $pdfHeader.find('h1').removeClass().addClass(`text-3xl font-bold mb-2 ${header}`);
        $pdfHeader.find('p').removeClass().addClass(text);
        $pdfContent.find('h2').removeClass().addClass(`text-xl font-bold mb-3 border-b pb-2 ${header}`);
        $pdfContent.find('p').removeClass().addClass(`mb-4 ${text}`);
    }

    // Adiciona novo elemento
    function addElement(type) {
        const elements = {
            text: '<div class="mb-6" contenteditable="true"><p>Novo parágrafo de texto. Comece a digitar aqui...</p></div>',
            image: '<div class="mb-6"><div class="border-2 border-dashed border-gray-300 p-4 text-center"><p class="text-gray-500 mb-2">Clique para adicionar uma imagem</p><button class="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-lg"><i class="fas fa-upload mr-2"></i>Enviar Imagem</button></div></div>',
            table: '<div class="mb-6" contenteditable="true"><table class="w-full border-collapse"><thead><tr class="bg-gray-100"><th class="border p-2 text-left">Cabeçalho 1</th><th class="border p-2 text-left">Cabeçalho 2</th></tr></thead><tbody><tr><td class="border p-2">Dado 1</td><td class="border p-2">Dado 2</td></tr><tr class="bg-gray-50"><td class="border p-2">Dado 3</td><td class="border p-2">Dado 4</td></tr></tbody></table></div>',
            list: '<div class="mb-6" contenteditable="true"><ul class="list-disc pl-5"><li class="mb-2">Item de lista 1</li><li class="mb-2">Item de lista 2</li><li>Item de lista 3</li></ul></div>'
        };

        $pdfContent.append(elements[type]);
    }

    // Gera o PDF
    function generatePDF() {
        $('#export-pdf').html('<i class="fas fa-spinner fa-spin mr-2"></i> Gerando...');
        html2canvas(document.getElementById('pdf-preview')).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: docConfig.orientation,
                unit: 'mm',
                format: docConfig.size
            });

            const imgWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = canvas.height * imgWidth / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save('documento-gerado.pdf');

            $('#export-pdf').html('<i class="fas fa-file-pdf mr-2"></i> PDF');
        });
    }

    // Salva o documento na API
    async function saveDocument() {
        const content = $pdfContent.html();
        try {
            const response = await fetch('/api/save-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, config: docConfig })
            });

            if (!response.ok) throw new Error('Falha ao salvar documento');
            alert('Documento salvo com sucesso!');
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao salvar documento!');
        }
    });
});
async function saveDocument() {
    const content = $pdfContent.html();
    const token = localStorage.getItem('token'); // Assume que o token é salvo após login
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
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao salvar documento! Verifique se você está logado.');
    }
}