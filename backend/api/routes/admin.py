from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import List

from database.database import get_db
from database.models import Candidate, ExamSession, CodeSubmission, MonitoringLog, SuspiciousActivity
from api.schemas import (
    CandidateResponse, ExamSessionResponse, ExamSessionSummary, 
    SystemStats, SuspiciousActivityResponse, MonitoringLogResponse
)

router = APIRouter()


@router.get("/stats", response_model=SystemStats)
async def get_system_stats(db: Session = Depends(get_db)):
    """Get system-wide statistics"""
    
    today = datetime.utcnow().date()
    
    total_candidates = db.query(Candidate).count()
    active_sessions = db.query(ExamSession).filter(ExamSession.status == "active").count()
    completed_sessions = db.query(ExamSession).filter(ExamSession.status == "completed").count()
    total_submissions = db.query(CodeSubmission).count()
    suspicious_activities_today = db.query(SuspiciousActivity).filter(
        func.date(SuspiciousActivity.timestamp) == today
    ).count()
    
    return SystemStats(
        total_candidates=total_candidates,
        active_sessions=active_sessions,
        completed_sessions=completed_sessions,
        total_submissions=total_submissions,
        suspicious_activities_today=suspicious_activities_today
    )


@router.get("/candidates", response_model=List[CandidateResponse])
async def get_all_candidates(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all candidates with pagination"""
    
    candidates = db.query(Candidate).offset(skip).limit(limit).all()
    return candidates


@router.get("/exam-sessions", response_model=List[ExamSessionSummary])
async def get_all_exam_sessions(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    db: Session = Depends(get_db)
):
    """Get all exam sessions with pagination and optional status filter"""
    
    query = db.query(ExamSession).join(Candidate)
    
    if status:
        query = query.filter(ExamSession.status == status)
    
    sessions = query.offset(skip).limit(limit).all()
    
    result = []
    for session in sessions:
        submissions_count = db.query(CodeSubmission).filter(
            CodeSubmission.exam_session_id == session.id
        ).count()
        
        monitoring_logs_count = db.query(MonitoringLog).filter(
            MonitoringLog.exam_session_id == session.id
        ).count()
        
        suspicious_activities_count = db.query(SuspiciousActivity).filter(
            SuspiciousActivity.exam_session_id == session.id
        ).count()
        
        result.append(ExamSessionSummary(
            session=ExamSessionResponse(
                id=session.id,
                session_token=session.session_token,
                start_time=session.start_time,
                status=session.status,
                total_tab_switches=session.total_tab_switches,
                camera_disconnects=session.camera_disconnects,
                mic_disconnects=session.mic_disconnects,
                suspicious_activities=session.suspicious_activities
            ),
            candidate=CandidateResponse(
                id=session.candidate.id,
                name=session.candidate.name,
                email=session.candidate.email,
                created_at=session.candidate.created_at
            ),
            submissions_count=submissions_count,
            monitoring_logs_count=monitoring_logs_count,
            suspicious_activities_count=suspicious_activities_count
        ))
    
    return result


@router.get("/exam-sessions/{session_id}/details")
async def get_exam_session_details(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific exam session"""
    
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam session not found"
        )
    
    # Get submissions
    submissions = db.query(CodeSubmission).filter(
        CodeSubmission.exam_session_id == session_id
    ).all()
    
    # Get monitoring logs
    monitoring_logs = db.query(MonitoringLog).filter(
        MonitoringLog.exam_session_id == session_id
    ).order_by(desc(MonitoringLog.timestamp)).all()
    
    # Get suspicious activities
    suspicious_activities = db.query(SuspiciousActivity).filter(
        SuspiciousActivity.exam_session_id == session_id
    ).order_by(desc(SuspiciousActivity.timestamp)).all()
    
    return {
        "session": session,
        "candidate": session.candidate,
        "submissions": submissions,
        "monitoring_logs": monitoring_logs,
        "suspicious_activities": suspicious_activities
    }


@router.get("/suspicious-activities", response_model=List[SuspiciousActivityResponse])
async def get_all_suspicious_activities(
    skip: int = 0,
    limit: int = 100,
    resolved: bool = None,
    db: Session = Depends(get_db)
):
    """Get all suspicious activities with pagination and optional filter"""
    
    query = db.query(SuspiciousActivity).join(ExamSession).join(Candidate)
    
    if resolved is not None:
        query = query.filter(SuspiciousActivity.resolved == resolved)
    
    activities = query.order_by(desc(SuspiciousActivity.timestamp)).offset(skip).limit(limit).all()
    
    return activities


@router.post("/suspicious-activities/{activity_id}/resolve")
async def resolve_suspicious_activity(
    activity_id: int,
    db: Session = Depends(get_db)
):
    """Mark a suspicious activity as resolved"""
    
    activity = db.query(SuspiciousActivity).filter(SuspiciousActivity.id == activity_id).first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Suspicious activity not found"
        )
    
    activity.resolved = True
    db.commit()
    
    return {"message": "Suspicious activity marked as resolved"}


@router.get("/monitoring-logs", response_model=List[MonitoringLogResponse])
async def get_all_monitoring_logs(
    skip: int = 0,
    limit: int = 100,
    log_type: str = None,
    severity: str = None,
    db: Session = Depends(get_db)
):
    """Get all monitoring logs with pagination and optional filters"""
    
    query = db.query(MonitoringLog).join(ExamSession).join(Candidate)
    
    if log_type:
        query = query.filter(MonitoringLog.log_type == log_type)
    
    if severity:
        query = query.filter(MonitoringLog.severity == severity)
    
    logs = query.order_by(desc(MonitoringLog.timestamp)).offset(skip).limit(limit).all()
    
    return logs


@router.post("/exam-sessions/{session_id}/terminate")
async def terminate_exam_session(
    session_id: int,
    reason: str = "Admin termination",
    db: Session = Depends(get_db)
):
    """Terminate an active exam session"""
    
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam session not found"
        )
    
    if session.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exam session is not active"
        )
    
    # Update session status
    session.status = "terminated"
    session.end_time = datetime.utcnow()
    
    # Create monitoring log
    log = MonitoringLog(
        candidate_id=session.candidate_id,
        exam_session_id=session.id,
        log_type="session_terminated",
        details={"reason": reason, "terminated_by": "admin"},
        severity="critical"
    )
    
    db.add(log)
    db.commit()
    
    return {"message": "Exam session terminated successfully"}
