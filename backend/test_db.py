from database import engine

try:
    connection = engine.connect()
    print("✅ PostgreSQL connection successful!")
    connection.close()
except Exception as e:
    print("❌ Connection failed:", e)
