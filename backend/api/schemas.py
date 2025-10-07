from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


# Authentication schemas
class CandidateCreate(BaseModel):
    name: str
    email: EmailStr


class CandidateLogin(BaseModel):
    email: EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str
    session_token: str


# Monitoring schemas
class MonitoringData(BaseModel):
    timestamp: datetime
    tab_switches: Optional[int] = 0
    camera_status: str  # connected, disconnected
    mic_status: str     # connected, disconnected
    current_window: Optional[str] = None
    mouse_activity: Optional[bool] = True
    keyboard_activity: Optional[bool] = True


class MonitoringLogCreate(BaseModel):
    log_type: str
    details: Optional[Dict[str, Any]] = None
    severity: str = "medium"


# Code submission schemas
class CodeSubmissionCreate(BaseModel):
    problem_id: int
    language: str
    code: str
    output: Optional[str] = None
    is_final: bool = False


class CodeSubmissionResponse(BaseModel):
    id: int
    problem_id: int
    language: str
    submission_time: datetime
    is_final: bool


# AI Monitoring schemas
class AIMonitoringData(BaseModel):
    image_data: Optional[str] = None  # base64 encoded image
    audio_data: Optional[str] = None  # base64 encoded audio
    analysis_type: str  # face_detection, gaze_tracking, presence_detection, audio_analysis


class AIMonitoringResult(BaseModel):
    analysis_type: str
    confidence_score: float
    result_data: Dict[str, Any]
    is_suspicious: bool
    timestamp: datetime


# Response schemas
class CandidateResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime


class ExamSessionResponse(BaseModel):
    id: int
    session_token: str
    start_time: datetime
    status: str
    total_tab_switches: int
    camera_disconnects: int
    mic_disconnects: int
    suspicious_activities: int


class MonitoringLogResponse(BaseModel):
    id: int
    log_type: str
    timestamp: datetime
    details: Optional[Dict[str, Any]]
    severity: str


class SuspiciousActivityResponse(BaseModel):
    id: int
    activity_type: str
    timestamp: datetime
    confidence: float
    details: Optional[Dict[str, Any]]
    resolved: bool


# Admin schemas
class ExamSessionSummary(BaseModel):
    session: ExamSessionResponse
    candidate: CandidateResponse
    submissions_count: int
    monitoring_logs_count: int
    suspicious_activities_count: int


class SystemStats(BaseModel):
    total_candidates: int
    active_sessions: int
    completed_sessions: int
    total_submissions: int
    suspicious_activities_today: int
