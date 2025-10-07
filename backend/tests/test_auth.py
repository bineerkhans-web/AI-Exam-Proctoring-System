import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from database.database import get_db, Base
from database.models import Candidate

# Create test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
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


def test_register_candidate():
    response = client.post("/api/auth/register", json={
        "name": "Test User",
        "email": "test@example.com"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test User"
    assert data["email"] == "test@example.com"
    assert "id" in data


def test_register_duplicate_email():
    # Register first candidate
    client.post("/api/auth/register", json={
        "name": "Test User 1",
        "email": "duplicate@example.com"
    })
    
    # Try to register with same email
    response = client.post("/api/auth/register", json={
        "name": "Test User 2",
        "email": "duplicate@example.com"
    })
    assert response.status_code == 400


def test_login_candidate():
    # First register a candidate
    client.post("/api/auth/register", json={
        "name": "Login Test User",
        "email": "login@example.com"
    })
    
    # Then login
    response = client.post("/api/auth/login", json={
        "email": "login@example.com"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "login@example.com"


def test_login_nonexistent_candidate():
    response = client.post("/api/auth/login", json={
        "email": "nonexistent@example.com"
    })
    assert response.status_code == 404


def test_start_exam_session():
    # Register candidate
    register_response = client.post("/api/auth/register", json={
        "name": "Exam User",
        "email": "exam@example.com"
    })
    candidate_id = register_response.json()["id"]
    
    # Start exam session
    response = client.post(f"/api/auth/start-exam/{candidate_id}")
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "session_token" in data
    assert data["token_type"] == "bearer"
