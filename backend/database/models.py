from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.database import Base


class Candidate(Base):
    __tablename__ = "candidates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    exam_sessions = relationship("ExamSession", back_populates="candidate")
    monitoring_logs = relationship("MonitoringLog", back_populates="candidate")


class ExamSession(Base):
    __tablename__ = "exam_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    session_token = Column(String(255), unique=True, index=True, nullable=False)
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), default="active")  # active, completed, terminated
    total_tab_switches = Column(Integer, default=0)
    camera_disconnects = Column(Integer, default=0)
    mic_disconnects = Column(Integer, default=0)
    suspicious_activities = Column(Integer, default=0)
    
    # Relationships
    candidate = relationship("Candidate", back_populates="exam_sessions")
    submissions = relationship("CodeSubmission", back_populates="exam_session")
    monitoring_logs = relationship("MonitoringLog", back_populates="exam_session")


class CodeSubmission(Base):
    __tablename__ = "code_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    exam_session_id = Column(Integer, ForeignKey("exam_sessions.id"), nullable=False)
    problem_id = Column(Integer, nullable=False)
    language = Column(String(50), nullable=False)
    code = Column(Text, nullable=False)
    output = Column(Text, nullable=True)
    submission_time = Column(DateTime(timezone=True), server_default=func.now())
    is_final = Column(Boolean, default=False)
    
    # Relationships
    exam_session = relationship("ExamSession", back_populates="submissions")


class MonitoringLog(Base):
    __tablename__ = "monitoring_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    exam_session_id = Column(Integer, ForeignKey("exam_sessions.id"), nullable=False)
    log_type = Column(String(50), nullable=False)  # tab_switch, camera_disconnect, mic_disconnect, suspicious_activity
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    details = Column(JSON, nullable=True)
    severity = Column(String(20), default="medium")  # low, medium, high, critical
    
    # Relationships
    candidate = relationship("Candidate", back_populates="monitoring_logs")
    exam_session = relationship("ExamSession", back_populates="monitoring_logs")


class AIMonitoringResult(Base):
    __tablename__ = "ai_monitoring_results"
    
    id = Column(Integer, primary_key=True, index=True)
    exam_session_id = Column(Integer, ForeignKey("exam_sessions.id"), nullable=False)
    analysis_type = Column(String(50), nullable=False)  # face_detection, gaze_tracking, presence_detection, audio_analysis
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    confidence_score = Column(Float, nullable=False)
    result_data = Column(JSON, nullable=True)
    is_suspicious = Column(Boolean, default=False)
    processed = Column(Boolean, default=False)
    
    # Relationships
    exam_session = relationship("ExamSession")


class SuspiciousActivity(Base):
    __tablename__ = "suspicious_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    exam_session_id = Column(Integer, ForeignKey("exam_sessions.id"), nullable=False)
    activity_type = Column(String(100), nullable=False)  # no_face_detected, multiple_faces, looking_away, background_voice
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    confidence = Column(Float, nullable=False)
    details = Column(JSON, nullable=True)
    resolved = Column(Boolean, default=False)
    
    # Relationships
    exam_session = relationship("ExamSession")
