from datetime import datetime
from typing import List, Optional, Any

from pydantic import BaseModel, EmailStr, Field


# Auth
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# Submissions
class TestResult(BaseModel):
    testCase: Optional[int] = None
    input: Any
    expected: Any
    output: Optional[Any] = None
    passed: Optional[bool] = None
    error: Optional[str] = None


class SubmissionCreate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    language: str
    code: str
    problem_id: int
    test_results: Optional[List[TestResult]] = None
    execution_time: Optional[float] = None


class SubmissionOut(BaseModel):
    id: int
    language: str
    problem_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Proctoring Logs
class LogCreate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    type: str
    severity: str = Field(pattern="^(info|warning|error)$")
    message: str
    timestamp: Optional[datetime] = None
    metadata: Optional[dict] = None


class LogOut(BaseModel):
    id: int
    type: str
    severity: str
    message: str
    timestamp: datetime

    class Config:
        from_attributes = True

# Monitoring
class MonitoringEvent(BaseModel):
    type: str
    severity: Optional[str] = None
    ts: Optional[datetime] = None


class MonitoringAnalyzeRequest(BaseModel):
    frame: Optional[str] = None  # base64 jpeg
    audio: Optional[str] = None  # base64 wav/pcm
    events: Optional[List[MonitoringEvent]] = None
    context: Optional[dict] = None


class MonitoringAnalyzeResponse(BaseModel):
    risk_score: float
    labels: List[str]
    explanations: List[str] = []
    actions: List[str] = []




