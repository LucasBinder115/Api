 $(document).ready(function() {
            $('#loginForm').on('submit', function(e) {
                e.preventDefault();
                
                // Reset error messages
                $('.error-message').hide();
                let isValid = true;

                // Validate email
                const email = $('#email').val().trim();
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    $('#emailError').show();
                    isValid = false;
                }

                // Validate password
                const password = $('#password').val();
                if (password.length === 0) {
                    $('#passwordError').show();
                    isValid = false;
                }

                if (isValid) {
                    // Simulate form submission
                    alert('Login successful! (This is a demo)');
                    $('#loginForm')[0].reset();
                }
            });

            // Add focus animation
            $('.form-input').on('focus', function() {
                $(this).parent().find('label').addClass('text-blue-600 font-semibold');
            }).on('blur', function() {
                $(this).parent().find('label').removeClass('text-blue-600 font-semibold');
            });
        });