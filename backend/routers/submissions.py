from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Submission
from ..schemas import SubmissionCreate, SubmissionOut


router = APIRouter()


@router.post("/", response_model=SubmissionOut)
def create_submission(payload: SubmissionCreate, db: Session = Depends(get_db)):
    submission = Submission(
        name=payload.name,
        email=payload.email,
        language=payload.language,
        code=payload.code,
        problem_id=payload.problem_id,
        test_results=[r.dict() for r in (payload.test_results or [])],
        execution_time=payload.execution_time,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission




