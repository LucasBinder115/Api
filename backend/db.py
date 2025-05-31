import sqlite3

def get_db_connection():
    try:
        conn = sqlite3.connect('database.sqlite3', check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn
    except sqlite3.Error as e:
        print("Erro ao conectar ao banco de dados:", e)
        return None
