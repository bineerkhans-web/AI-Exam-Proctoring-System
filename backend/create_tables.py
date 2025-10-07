from database import Base, engine
from models import User, Submission, ProctoringLog

# This will create all tables defined in models.py
Base.metadata.create_all(bind=engine)

print("✅ All tables created successfully!")
