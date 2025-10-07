from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from database.database import get_db
from database.models import ExamSession, CodeSubmission
from api.schemas import CodeSubmissionCreate, CodeSubmissionResponse
from core.auth import get_current_exam_session

router = APIRouter()


@router.post("/submit", response_model=CodeSubmissionResponse)
async def submit_code(
    submission: CodeSubmissionCreate,
    exam_session: ExamSession = Depends(get_current_exam_session),
    db: Session = Depends(get_db)
):
    """Submit code for a problem"""
    
    # Create code submission
    code_submission = CodeSubmission(
        exam_session_id=exam_session.id,
        problem_id=submission.problem_id,
        language=submission.language,
        code=submission.code,
        output=submission.output,
        is_final=submission.is_final
    )
    
    db.add(code_submission)
    db.commit()
    db.refresh(code_submission)
    
    return code_submission


@router.get("/submissions", response_model=list[CodeSubmissionResponse])
async def get_submissions(
    exam_session: ExamSession = Depends(get_current_exam_session),
    db: Session = Depends(get_db)
):
    """Get all code submissions for current exam session"""
    
    submissions = db.query(CodeSubmission).filter(
        CodeSubmission.exam_session_id == exam_session.id
    ).order_by(CodeSubmission.submission_time.desc()).all()
    
    return submissions


@router.get("/submissions/{problem_id}", response_model=list[CodeSubmissionResponse])
async def get_submissions_for_problem(
    problem_id: int,
    exam_session: ExamSession = Depends(get_current_exam_session),
    db: Session = Depends(get_db)
):
    """Get code submissions for a specific problem"""
    
    submissions = db.query(CodeSubmission).filter(
        CodeSubmission.exam_session_id == exam_session.id,
        CodeSubmission.problem_id == problem_id
    ).order_by(CodeSubmission.submission_time.desc()).all()
    
    return submissions


@router.get("/latest-submission/{problem_id}", response_model=CodeSubmissionResponse)
async def get_latest_submission_for_problem(
    problem_id: int,
    exam_session: ExamSession = Depends(get_current_exam_session),
    db: Session = Depends(get_db)
):
    """Get the latest code submission for a specific problem"""
    
    submission = db.query(CodeSubmission).filter(
        CodeSubmission.exam_session_id == exam_session.id,
        CodeSubmission.problem_id == problem_id
    ).order_by(CodeSubmission.submission_time.desc()).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No submissions found for this problem"
        )
    
    return submission


@router.post("/final-submit")
async def final_submit_exam(
    exam_session: ExamSession = Depends(get_current_exam_session),
    db: Session = Depends(get_db)
):
    """Final submit the exam (mark all submissions as final and end session)"""
    
    # Mark all submissions as final
    submissions = db.query(CodeSubmission).filter(
        CodeSubmission.exam_session_id == exam_session.id,
        CodeSubmission.is_final == False
    ).all()
    
    for submission in submissions:
        submission.is_final = True
    
    # End the exam session
    exam_session.status = "completed"
    exam_session.end_time = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Exam submitted successfully", "submissions_count": len(submissions)}


@router.delete("/submission/{submission_id}")
async def delete_submission(
    submission_id: int,
    exam_session: ExamSession = Depends(get_current_exam_session),
    db: Session = Depends(get_db)
):
    """Delete a code submission (only if not final)"""
    
    submission = db.query(CodeSubmission).filter(
        CodeSubmission.id == submission_id,
        CodeSubmission.exam_session_id == exam_session.id
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    if submission.is_final:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete final submission"
        )
    
    db.delete(submission)
    db.commit()
    
    return {"message": "Submission deleted successfully"}
