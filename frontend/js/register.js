 $(document).ready(function() {
            $('#registerForm').on('submit', function(e) {
                e.preventDefault();
                
                // Reset error messages
                $('.error-message').hide();
                let isValid = true;

                // Validate name
                const name = $('#name').val().trim();
                if (name === '') {
                    $('#nameError').show();
                    isValid = false;
                }

                // Validate email
                const email = $('#email').val().trim();
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    $('#emailError').show();
                    isValid = false;
                }

                // Validate password
                const password = $('#password').val();
                if (password.length < 8) {
                    $('#passwordError').show();
                    isValid = false;
                }

                // Validate confirm password
                const confirmPassword = $('#confirmPassword').val();
                if (confirmPassword !== password) {
                    $('#confirmPasswordError').show();
                    isValid = false;
                }

                if (isValid) {
                    // Simulate form submission
                    alert('Registration successful! (This is a demo)');
                    $('#registerForm')[0].reset();
                }
            });

            // Add focus animation
            $('.form-input').on('focus', function() {
                $(this).parent().find('label').addClass('text-blue-600 font-semibold');
            }).on('blur', function() {
                $(this).parent().find('label').removeClass('text-blue-600 font-semibold');
            });
        });