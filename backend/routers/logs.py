from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ProctoringLog
from ..schemas import LogCreate, LogOut


router = APIRouter()


@router.post("/", response_model=LogOut)
def create_log(payload: LogCreate, db: Session = Depends(get_db)):
    log = ProctoringLog(
        name=payload.name,
        email=payload.email,
        type=payload.type,
        severity=payload.severity,
        message=payload.message,
        timestamp=payload.timestamp,
        metadata=payload.metadata,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log




