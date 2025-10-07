from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from database.database import get_db
from database.models import ExamSession, MonitoringLog, SuspiciousActivity
from api.schemas import MonitoringData, MonitoringLogCreate, MonitoringLogResponse, SuspiciousActivityResponse
from core.auth import get_current_exam_session

router = APIRouter()


@router.post("/data")
async def receive_monitoring_data(
    monitoring_data: MonitoringData,
    exam_session: ExamSession = Depends(get_current_exam_session),
    db: Session = Depends(get_db)
):
    """Receive real-time monitoring data from the frontend"""
    
    # Update exam session statistics
    if monitoring_data.tab_switches:
        exam_session.total_tab_switches += monitoring_data.tab_switches
    
    if monitoring_data.camera_status == "disconnected":
        exam_session.camera_disconnects += 1
    
    if monitoring_data.mic_status == "disconnected":
        exam_session.mic_disconnects += 1
    
    # Log tab switches if any
    if monitoring_data.tab_switches > 0:
        log = MonitoringLog(
            candidate_id=exam_session.candidate_id,
            exam_session_id=exam_session.id,
            log_type="tab_switch",
            details={
                "count": monitoring_data.tab_switches,
                "current_window": monitoring_data.current_window,
                "timestamp": monitoring_data.timestamp.isoformat()
            },
            severity="medium" if monitoring_data.tab_switches <= 3 else "high"
        )
        db.add(log)
        
        # Increment suspicious activities if too many tab switches
        if exam_session.total_tab_switches > 5:
            exam_session.suspicious_activities += 1
    
    # Log camera/mic disconnections
    if monitoring_data.camera_status == "disconnected":
        log = MonitoringLog(
            candidate_id=exam_session.candidate_id,
            exam_session_id=exam_session.id,
            log_type="camera_disconnect",
            details={
                "timestamp": monitoring_data.timestamp.isoformat(),
                "previous_status": "connected"
            },
            severity="high"
        )
        db.add(log)
    
    if monitoring_data.mic_status == "disconnected":
        log = MonitoringLog(
            candidate_id=exam_session.candidate_id,
            exam_session_id=exam_session.id,
            log_type="mic_disconnect",
            details={
                "timestamp": monitoring_data.timestamp.isoformat(),
                "previous_status": "connected"
            },
            severity="high"
        )
        db.add(log)
    
    # Log mouse/keyboard inactivity
    if not monitoring_data.mouse_activity or not monitoring_data.keyboard_activity:
        log = MonitoringLog(
            candidate_id=exam_session.candidate_id,
            exam_session_id=exam_session.id,
            log_type="inactivity",
            details={
                "mouse_activity": monitoring_data.mouse_activity,
                "keyboard_activity": monitoring_data.keyboard_activity,
                "timestamp": monitoring_data.timestamp.isoformat()
            },
            severity="low"
        )
        db.add(log)
    
    db.commit()
    
    return {"message": "Monitoring data received successfully"}


@router.post("/log")
async def create_monitoring_log(
    log_data: MonitoringLogCreate,
    exam_session: ExamSession = Depends(get_current_exam_session),
    db: Session = Depends(get_db)
):
    """Create a monitoring log entry"""
    
    log = MonitoringLog(
        candidate_id=exam_session.candidate_id,
        exam_session_id=exam_session.id,
        log_type=log_data.log_type,
        details=log_data.details,
        severity=log_data.severity
    )
    
    db.add(log)
    db.commit()
    db.refresh(log)
    
    return {"message": "Monitoring log created successfully", "log_id": log.id}


@router.get("/logs", response_model=list[MonitoringLogResponse])
async def get_monitoring_logs(
    exam_session: ExamSession = Depends(get_current_exam_session),
    db: Session = Depends(get_db)
):
    """Get monitoring logs for current exam session"""
    
    logs = db.query(MonitoringLog).filter(
        MonitoringLog.exam_session_id == exam_session.id
    ).order_by(MonitoringLog.timestamp.desc()).all()
    
    return logs


@router.post("/suspicious-activity")
async def report_suspicious_activity(
    activity_type: str,
    confidence: float,
    details: dict = None,
    exam_session: ExamSession = Depends(get_current_exam_session),
    db: Session = Depends(get_db)
):
    """Report a suspicious activity detected by AI monitoring"""
    
    # Create suspicious activity record
    activity = SuspiciousActivity(
        exam_session_id=exam_session.id,
        activity_type=activity_type,
        confidence=confidence,
        details=details
    )
    
    db.add(activity)
    
    # Increment suspicious activities counter
    exam_session.suspicious_activities += 1
    
    # Create monitoring log
    log = MonitoringLog(
        candidate_id=exam_session.candidate_id,
        exam_session_id=exam_session.id,
        log_type="suspicious_activity",
        details={
            "activity_type": activity_type,
            "confidence": confidence,
            "details": details,
            "timestamp": datetime.utcnow().isoformat()
        },
        severity="high" if confidence > 0.8 else "medium"
    )
    
    db.add(log)
    db.commit()
    
    return {"message": "Suspicious activity reported successfully", "activity_id": activity.id}


@router.get("/suspicious-activities", response_model=list[SuspiciousActivityResponse])
async def get_suspicious_activities(
    exam_session: ExamSession = Depends(get_current_exam_session),
    db: Session = Depends(get_db)
):
    """Get suspicious activities for current exam session"""
    
    activities = db.query(SuspiciousActivity).filter(
        SuspiciousActivity.exam_session_id == exam_session.id
    ).order_by(SuspiciousActivity.timestamp.desc()).all()
    
    return activities


@router.get("/session-status")
async def get_session_status(
    exam_session: ExamSession = Depends(get_current_exam_session),
    db: Session = Depends(get_db)
):
    """Get current exam session monitoring status"""
    
    return {
        "session_id": exam_session.id,
        "status": exam_session.status,
        "total_tab_switches": exam_session.total_tab_switches,
        "camera_disconnects": exam_session.camera_disconnects,
        "mic_disconnects": exam_session.mic_disconnects,
        "suspicious_activities": exam_session.suspicious_activities,
        "start_time": exam_session.start_time
    }
