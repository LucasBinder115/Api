 $(document).ready(function() {
            // Validação do formulário
            $('#loginForm').submit(function(e) {
                e.preventDefault();
                
                // Resetar mensagens de erro
                $('.error-message').hide();
                let isValid = true;
                
                // Validação de e-mail
                const email = $('#email').val();
                if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    $('#emailError').show();
                    isValid = false;
                }
                
                // Validação de senha
                const password = $('#password').val();
                if (!password || password.length < 6) {
                    $('#passwordError').show();
                    isValid = false;
                }
                
                // Se válido, pode enviar o formulário
                if (isValid) {
                    // Simulação de login - substituir por chamada AJAX real
                    console.log('Login submitted:', {
                        email: email,
                        password: password,
                        remember: $('#remember').is(':checked')
                    });
                    
                    // Redirecionamento temporário - substituir por lógica real
                    alert('Login bem-sucedido! Redirecionando...');
                    window.location.href = 'index.html';
                }
            });
            
            // Efeitos visuais
            $('.form-input').focus(function() {
                $(this).addClass('border-indigo-500');
            }).blur(function() {
                $(this).removeClass('border-indigo-500');
            });
        });