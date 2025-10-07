from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ProctoringLog
from ..schemas import MonitoringAnalyzeRequest, MonitoringAnalyzeResponse
from ..monitoring.analyzer import analyze as run_analysis


router = APIRouter()


@router.post("/analyze", response_model=MonitoringAnalyzeResponse)
def analyze_event(payload: MonitoringAnalyzeRequest, db: Session = Depends(get_db)):
    result = run_analysis(payload.frame, payload.audio, [e.dict() for e in (payload.events or [])])

    # Persist aggregate result as a log entry for traceability
    log = ProctoringLog(
        name=(payload.context or {}).get("name"),
        email=(payload.context or {}).get("email"),
        type="monitoring_result",
        severity="warning" if result.risk_score >= 0.5 else "info",
        message=";".join(result.labels) or "ok",
        metadata={
            "risk_score": result.risk_score,
            "labels": result.labels,
            "explanations": result.explanations,
        },
    )
    db.add(log)
    db.commit()

    return MonitoringAnalyzeResponse(
        risk_score=result.risk_score,
        labels=result.labels,
        explanations=result.explanations,
        actions=[],
    )




