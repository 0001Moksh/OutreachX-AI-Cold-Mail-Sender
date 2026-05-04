import os
import psycopg2
from dotenv import load_dotenv

load_dotenv("c:\\Users\\renuk\\Projects\\cold Mail Sender\\backend\\.env")

DATABASE_URL = os.getenv("DATABASE_URL")
print("Trying to connect to:", DATABASE_URL)

try:
    conn = psycopg2.connect(DATABASE_URL)
    print("Connection successful!")
    conn.close()
except Exception as e:
    print("Connection failed:", e)
