from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets
import string

from database.database import get_db
from database.models import Candidate, ExamSession
from api.schemas import CandidateCreate, CandidateLogin, Token, CandidateResponse
from core.auth import create_exam_session_token

router = APIRouter()


def generate_session_token(length: int = 32) -> str:
    """Generate a random session token"""
    characters = string.ascii_letters + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))


@router.post("/register", response_model=CandidateResponse)
async def register_candidate(candidate: CandidateCreate, db: Session = Depends(get_db)):
    """Register a new candidate"""
    
    # Check if candidate already exists
    existing_candidate = db.query(Candidate).filter(Candidate.email == candidate.email).first()
    if existing_candidate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new candidate
    db_candidate = Candidate(
        name=candidate.name,
        email=candidate.email
    )
    
    db.add(db_candidate)
    db.commit()
    db.refresh(db_candidate)
    
    return db_candidate


@router.post("/login", response_model=CandidateResponse)
async def login_candidate(candidate: CandidateLogin, db: Session = Depends(get_db)):
    """Login candidate and return candidate info"""
    
    # Find candidate by email
    db_candidate = db.query(Candidate).filter(Candidate.email == candidate.email).first()
    if not db_candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )
    
    return db_candidate


@router.post("/start-exam/{candidate_id}", response_model=Token)
async def start_exam_session(candidate_id: int, db: Session = Depends(get_db)):
    """Start a new exam session for a candidate"""
    
    # Verify candidate exists
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )
    
    # Check if candidate already has an active session
    active_session = db.query(ExamSession).filter(
        ExamSession.candidate_id == candidate_id,
        ExamSession.status == "active"
    ).first()
    
    if active_session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candidate already has an active exam session"
        )
    
    # Generate session token
    session_token = generate_session_token()
    
    # Create exam session
    exam_session = ExamSession(
        candidate_id=candidate_id,
        session_token=session_token,
        status="active"
    )
    
    db.add(exam_session)
    db.commit()
    db.refresh(exam_session)
    
    # Create JWT token
    access_token = create_exam_session_token(candidate_id, session_token)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "session_token": session_token
    }


@router.post("/end-exam/{session_token}")
async def end_exam_session(session_token: str, db: Session = Depends(get_db)):
    """End an exam session"""
    
    exam_session = db.query(ExamSession).filter(ExamSession.session_token == session_token).first()
    if not exam_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam session not found"
        )
    
    if exam_session.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exam session is not active"
        )
    
    # Update session status
    exam_session.status = "completed"
    exam_session.end_time = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Exam session ended successfully"}


@router.get("/candidate/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    """Get candidate information"""
    
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )
    
    return candidate
