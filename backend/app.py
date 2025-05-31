from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import datetime
import sqlite3
from db import get_db_connection
from models import create_tables
import random

app = Flask(__name__)
CORS(app)

app.config['SECRET_KEY'] = 'YWYQUywyueueyYWYEEUywdhwhdw'

# Cria o banco
create_tables()

# Registro simples
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    email = data['email']
    password = data['password']
    role = data.get('role', 'user')

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
                       (email, password, role))
        conn.commit()
        return jsonify({'message': 'Usuário registrado com sucesso!'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'E-mail já existe'}), 400
    finally:
        conn.close()

# Login normal
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data['email']
    password = data['password']

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE email=? AND password=?", (email, password)).fetchone()
    conn.close()

    if user:
        token = jwt.encode({
            'user_id': user['id'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=2)
        }, app.config['SECRET_KEY'], algorithm='HS256')

        return jsonify({'token': token})
    return jsonify({'error': 'Credenciais inválidas'}), 401

# Enviar código OTP (simulado)
@app.route('/api/auth/send-otp', methods=['POST'])
def send_otp():
    data = request.json
    email = data['email']
    otp_code = str(random.randint(100000, 999999))


    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()

    if not user:
        conn.execute("INSERT INTO users (email, otp, role) VALUES (?, ?, 'user')", (email, otp_code))
    else:
        conn.execute("UPDATE users SET otp=? WHERE email=?", (otp_code, email))
    conn.commit()
    conn.close()

    print(f"OTP para {email}: {otp_code}")
    return jsonify({'message': 'Código enviado (simulado).'}), 200

# Verificar código OTP
@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    data = request.json
    email = data['email']
    code = data['code']

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE email=? AND otp=?", (email, code)).fetchone()
    conn.close()

    if user:
        token = jwt.encode({
            'user_id': user['id'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=2)
        }, app.config['SECRET_KEY'], algorithm='HS256')
        return jsonify({'jwt': token})
    return jsonify({'error': 'Código inválido'}), 400

# Login via Google
@app.route('/api/auth/google', methods=['POST'])
def google_login():
    data = request.json
    email = data.get('email')
    name = data.get('name')

    if not email:
        return jsonify({'error': 'Email é obrigatório'}), 400

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()

    if not user:
        # Cadastra se não existir
        conn.execute("INSERT INTO users (email, password, role) VALUES (?, ?, 'user')", (email, '',))
        conn.commit()
        user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()

    conn.close()

    # Cria o JWT
    token = jwt.encode({
        'user_id': user['id'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=2)
    }, app.config['SECRET_KEY'], algorithm='HS256')

    return jsonify({'jwt': token})

# Inicia o servidor
if __name__ == '__main__':
    app.run(debug=True)
