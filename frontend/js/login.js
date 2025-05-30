document.addEventListener('DOMContentLoaded', () => {
    // Google login
    document.getElementById('google-login').addEventListener('click', () => {
        const clientId = '952457096208-ggu8g9v8eh5nmar6kgn0sklrb24h7lan.apps.googleusercontent.com';
        const redirectUri = 'http://127.0.0.1:5500/frontend/pages/google-callback.html';
        const scope = 'openid profile email';
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=token&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
        window.location.href = authUrl;
    });

    // Enviar código OTP
    document.getElementById('sendOtpBtn').addEventListener('click', async () => {
        const email = document.getElementById('otpEmail').value;
        const res = await fetch('http://localhost:8080/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (res.ok) {
            document.getElementById('otpVerification').classList.remove('hidden');
        } else {
            alert('Erro ao enviar código.');
        }
    });

    // Verificar código OTP
    document.getElementById('verifyOtpBtn').addEventListener('click', async () => {
        const email = document.getElementById('otpEmail').value;
        const code = document.getElementById('otpCode').value;
        const res = await fetch('http://localhost:8080/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('token', data.jwt);
            window.location.href = '/dashboard.html';
        } else {
            alert('Código inválido.');
        }
    });
});
