import sqlite3
import hashlib
import os
from datetime import datetime, timedelta

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
                FOREIGN KEY (pdf_id) REFERENCES generated_pdfs (id))'''
        ]
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for table in tables:
                cursor.execute(table)
            conn.commit()

    def _get_connection(self):
        return sqlite3.connect(self.db_name)

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

    def get_all_pdfs(self, limit=10):
        """Recupera todos os PDFs ordenados por data"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, topic, file_path, num_questions, generated_at, file_size_kb
                FROM generated_pdfs
                ORDER BY generated_at DESC
                LIMIT ?
            ''', (limit,))
            return cursor.fetchall()

    def get_pdf_by_id(self, pdf_id):
        """Recupera um PDF específico com todas suas perguntas"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT topic, file_path, num_questions, generated_at, file_size_kb
                FROM generated_pdfs
                WHERE id = ?
            ''', (pdf_id,))
            pdf_info = cursor.fetchone()
            
            if not pdf_info:
                return None
            
            cursor.execute('''
                SELECT question_number, question_text
                FROM questions
                WHERE pdf_id = ?
                ORDER BY question_number
            ''', (pdf_id,))
            questions = cursor.fetchall()
            
            return {
                'topic': pdf_info[0],
                'file_path': pdf_info[1],
                'num_questions': pdf_info[2],
                'generated_at': pdf_info[3],
                'file_size_kb': pdf_info[4],
                'questions': questions
            }

    def delete_pdf_record(self, pdf_id):
        """Remove um PDF e suas perguntas relacionadas"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('SELECT file_path FROM generated_pdfs WHERE id = ?', (pdf_id,))
            file_path = cursor.fetchone()[0]
            
            cursor.execute('DELETE FROM questions WHERE pdf_id = ?', (pdf_id,))
            cursor.execute('DELETE FROM generated_pdfs WHERE id = ?', (pdf_id,))
            
            conn.commit()
            return file_path