import sqlite3
import os
from datetime import datetime

class QuestionDatabase:
    def __init__(self, db_name='questions.db'):
        self.db_name = db_name
        self._create_tables()
    
    def _create_tables(self):
        tables = [
            '''CREATE TABLE IF NOT EXISTS generated_pdfs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                topic TEXT NOT NULL,
                file_path TEXT NOT NULL UNIQUE,
                num_questions INTEGER NOT NULL,
                generated_at TEXT NOT NULL,
                file_size_kb REAL NOT NULL)''',
            
            '''CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pdf_id INTEGER NOT NULL,
                question_number INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                FOREIGN KEY (pdf_id) REFERENCES generated_pdfs (id) ON DELETE CASCADE)''',
                
            '''CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL)'''
        ]
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for table in tables:
                cursor.execute(table)
            conn.commit()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_name)
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    # Métodos para PDFs
    def insert_pdf_record(self, topic, file_path, questions):
        try:
            file_size_kb = os.path.getsize(file_path) / 1024
            generated_at = datetime.now().isoformat()
            
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO generated_pdfs 
                    (topic, file_path, num_questions, generated_at, file_size_kb)
                    VALUES (?, ?, ?, ?, ?)
                ''', (topic, file_path, len(questions), generated_at, file_size_kb))
                
                pdf_id = cursor.lastrowid
                
                question_data = [(pdf_id, i+1, q) for i, q in enumerate(questions)]
                cursor.executemany('''
                    INSERT INTO questions (pdf_id, question_number, question_text)
                    VALUES (?, ?, ?)
                ''', question_data)
                
                conn.commit()
                return pdf_id
        except sqlite3.Error as e:
            print(f"Erro ao inserir PDF: {e}")
            return None

    def get_all_pdfs(self, limit=100):
        """Recupera todos os PDFs ordenados por data"""
        with self._get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, topic, file_path, num_questions, 
                       generated_at, file_size_kb
                FROM generated_pdfs
                ORDER BY generated_at DESC
                LIMIT ?
            ''', (limit,))
            return [dict(row) for row in cursor.fetchall()]

    def get_pdf_by_id(self, pdf_id):
        """Recupera um PDF específico com todas suas perguntas"""
        with self._get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Obter informações básicas do PDF
            cursor.execute('''
                SELECT id, topic, file_path, num_questions, 
                       generated_at, file_size_kb
                FROM generated_pdfs
                WHERE id = ?
            ''', (pdf_id,))
            pdf_data = cursor.fetchone()
            
            if not pdf_data:
                return None
            
            # Obter perguntas associadas
            cursor.execute('''
                SELECT question_number, question_text
                FROM questions
                WHERE pdf_id = ?
                ORDER BY question_number
            ''', (pdf_id,))
            questions = cursor.fetchall()
            
            # Converter para dicionário
            result = dict(pdf_data)
            result['questions'] = [dict(q) for q in questions]
            
            return result

    def delete_pdf_record(self, pdf_id):
        """Remove um PDF e suas perguntas relacionadas"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Primeiro obtemos o file_path para poder remover o arquivo depois
            cursor.execute('''
                SELECT file_path FROM generated_pdfs WHERE id = ?
            ''', (pdf_id,))
            result = cursor.fetchone()
            
            if not result:
                return None
                
            file_path = result[0]
            
            # A exclusão em cascata vai remover as perguntas automaticamente
            cursor.execute('''
                DELETE FROM generated_pdfs WHERE id = ?
            ''', (pdf_id,))
            
            conn.commit()
            return file_path

    # Métodos para usuários
    def add_user_with_email(self, username, email, password):
        """Adiciona um novo usuário ao banco de dados"""
        try:
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            created_at = datetime.now().isoformat()
            
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO users (username, email, password_hash, created_at)
                    VALUES (?, ?, ?, ?)
                ''', (username, email, password_hash, created_at))
                conn.commit()
                return cursor.lastrowid
        except sqlite3.IntegrityError:
            return None

    def get_users_list(self):
        """Obtém a lista de todos os usuários"""
        with self._get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT id, username, email, created_at FROM users')
            return [dict(row) for row in cursor.fetchall()]