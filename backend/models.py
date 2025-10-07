from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    submissions = relationship("Submission", back_populates="user", cascade="all, delete-orphan")
    logs = relationship("ProctoringLog", back_populates="user", cascade="all, delete-orphan")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    language = Column(String, nullable=False)
    code = Column(Text, nullable=False)
    problem_id = Column(Integer, nullable=False)
    test_results = Column(JSON, nullable=True)
    execution_time = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="submissions")


class ProctoringLog(Base):
    __tablename__ = "proctoring_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    type = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    log_metadata = Column(JSON, nullable=True)

    user = relationship("User", back_populates="logs")




