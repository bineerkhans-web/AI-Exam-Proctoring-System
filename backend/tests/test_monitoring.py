import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from database.database import get_db, Base
from database.models import Candidate, ExamSession
from core.auth import create_exam_session_token

# Create test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_monitoring.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture
def test_candidate_and_session():
    """Create a test candidate and exam session"""
    db = TestingSessionLocal()
    
    # Create candidate
    candidate = Candidate(name="Test User", email="test@example.com")
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    
    # Create exam session
    session = ExamSession(
        candidate_id=candidate.id,
        session_token="test-session-token",
        status="active"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # Create token
    token = create_exam_session_token(candidate.id, session.session_token)
    
    db.close()
    
    return candidate, session, token


def test_receive_monitoring_data(test_candidate_and_session):
    candidate, session, token = test_candidate_and_session
    
    headers = {"Authorization": f"Bearer {token}"}
    
    monitoring_data = {
        "timestamp": "2024-01-01T12:00:00",
        "tab_switches": 2,
        "camera_status": "connected",
        "mic_status": "connected",
        "current_window": "exam-window",
        "mouse_activity": True,
        "keyboard_activity": True
    }
    
    response = client.post("/api/monitoring/data", json=monitoring_data, headers=headers)
    assert response.status_code == 200


def test_camera_disconnect_logging(test_candidate_and_session):
    candidate, session, token = test_candidate_and_session
    
    headers = {"Authorization": f"Bearer {token}"}
    
    monitoring_data = {
        "timestamp": "2024-01-01T12:00:00",
        "tab_switches": 0,
        "camera_status": "disconnected",
        "mic_status": "connected",
        "mouse_activity": True,
        "keyboard_activity": True
    }
    
    response = client.post("/api/monitoring/data", json=monitoring_data, headers=headers)
    assert response.status_code == 200


def test_get_monitoring_logs(test_candidate_and_session):
    candidate, session, token = test_candidate_and_session
    
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/api/monitoring/logs", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_report_suspicious_activity(test_candidate_and_session):
    candidate, session, token = test_candidate_and_session
    
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.post(
        "/api/monitoring/suspicious-activity",
        params={
            "activity_type": "no_face_detected",
            "confidence": 0.85
        },
        headers=headers
    )
    assert response.status_code == 200


def test_get_session_status(test_candidate_and_session):
    candidate, session, token = test_candidate_and_session
    
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/api/monitoring/session-status", headers=headers)
    assert response.status_code == 200
    
    data = response.json()
    assert "session_id" in data
    assert "status" in data
    assert "total_tab_switches" in data
