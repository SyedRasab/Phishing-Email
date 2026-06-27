import sys
import os
import sqlite3

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import DATABASE_PATH

conn = sqlite3.connect(DATABASE_PATH)
c = conn.cursor()
c.execute("UPDATE users SET role='admin'")
conn.commit()
print("Updated all users to admin")
conn.close()
