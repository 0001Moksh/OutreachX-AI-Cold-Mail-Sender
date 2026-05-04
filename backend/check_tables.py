import os
import psycopg2
from dotenv import load_dotenv

load_dotenv("c:\\Users\\renuk\\Projects\\cold Mail Sender\\backend\\.env")

DATABASE_URL = os.getenv("DATABASE_URL")
try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
    """)
    tables = cur.fetchall()
    print("Tables in public schema:")
    for table in tables:
        print("-", table[0])
    conn.close()
except Exception as e:
    print("Error:", e)
