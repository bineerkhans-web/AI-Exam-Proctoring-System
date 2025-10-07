# Exam Proctoring Backend (FastAPI)

## Quickstart

1. Create venv and install deps
```bash
python -m venv .venv && . .venv/Scripts/activate  # Windows PowerShell
pip install -r requirements.txt
```

2. Run server
```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

3. API docs
- Open `http://localhost:8000/docs`

## Endpoints
- `GET /health/` — health check
- `POST /auth/register` — create user
- `POST /auth/login` — get JWT
- `POST /submissions/` — create submission record
- `POST /logs/` — push proctoring log
- `POST /monitoring/analyze` — analyze base64 image/audio + events → `risk_score`, `labels`

## Storage
- SQLite file `app.db` in project root (adjust in `backend/database.py`).
  - Table `proctoring_logs` stores analyzer results with `metadata.risk_score` and `labels`.

# Exam Proctoring Backend

A comprehensive backend system for AI-powered exam proctoring with monitoring and data handling capabilities.

## Features

- **Authentication & Session Management**: Secure candidate registration and exam session management
- **Real-time Monitoring**: Track tab switches, camera/mic status, and user activity
- **AI/ML Monitoring**: 
  - Face detection and tracking using MediaPipe
  - Gaze tracking and attention monitoring
  - Audio analysis for background voice detection
  - Suspicious activity detection and reporting
- **Code Submission Handling**: Secure storage and management of code submissions
- **Admin Dashboard**: Comprehensive monitoring and management tools
- **Database Integration**: PostgreSQL with SQLAlchemy ORM

## Tech Stack

- **FastAPI**: Modern, fast web framework for building APIs
- **PostgreSQL**: Robust relational database
- **SQLAlchemy**: Python SQL toolkit and ORM
- **OpenCV**: Computer vision library
- **MediaPipe**: Google's framework for building multimodal ML pipelines
- **TensorFlow**: Machine learning platform
- **Redis**: In-memory data structure store
- **JWT**: JSON Web Token authentication

## Installation

1. **Clone the repository and navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Set up PostgreSQL database**:
   ```bash
   # Create database
   createdb exam_proctoring
   
   # Run migrations
   alembic upgrade head
   ```

6. **Start Redis server** (for background tasks):
   ```bash
   redis-server
   ```

7. **Run the application**:
   ```bash
   python main.py
   # or
   uvicorn main:app --reload
   ```

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new candidate
- `POST /api/auth/login` - Login candidate
- `POST /api/auth/start-exam/{candidate_id}` - Start exam session
- `POST /api/auth/end-exam/{session_token}` - End exam session

### Monitoring
- `POST /api/monitoring/data` - Send real-time monitoring data
- `POST /api/monitoring/log` - Create monitoring log entry
- `GET /api/monitoring/logs` - Get monitoring logs
- `POST /api/monitoring/suspicious-activity` - Report suspicious activity

### Code Submissions
- `POST /api/submissions/submit` - Submit code
- `GET /api/submissions/submissions` - Get all submissions
- `GET /api/submissions/submissions/{problem_id}` - Get submissions for problem
- `POST /api/submissions/final-submit` - Final submit exam

### AI Monitoring
- `POST /api/ai-monitoring/analyze` - Analyze monitoring data with AI
- `GET /api/ai-monitoring/results` - Get AI monitoring results
- `GET /api/ai-monitoring/stats` - Get AI monitoring statistics

### Admin
- `GET /api/admin/stats` - Get system statistics
- `GET /api/admin/candidates` - Get all candidates
- `GET /api/admin/exam-sessions` - Get all exam sessions
- `POST /api/admin/exam-sessions/{session_id}/terminate` - Terminate session

## Database Schema

### Core Tables
- **candidates**: Candidate information
- **exam_sessions**: Active and completed exam sessions
- **code_submissions**: Code submissions for each problem
- **monitoring_logs**: Real-time monitoring data logs
- **ai_monitoring_results**: AI analysis results
- **suspicious_activities**: Flagged suspicious activities

## AI Monitoring Features

### Face Detection
- Detects presence/absence of faces
- Multi-person detection
- Face tracking and confidence scoring

### Gaze Tracking
- Eye movement monitoring
- Attention direction detection
- Looking away from screen detection

### Audio Analysis
- Background voice detection
- Multiple voice detection
- Volume and activity monitoring

### Risk Assessment
- Automatic risk level calculation
- Suspicious activity flagging
- Confidence scoring for all detections

## Development

### Running Tests
```bash
pytest
```

### Code Formatting
```bash
black .
flake8 .
```

### Database Migrations
```bash
# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

## Deployment

### Docker (Recommended)
```bash
# Build image
docker build -t exam-proctoring-backend .

# Run container
docker run -p 8000:8000 exam-proctoring-backend
```

### Environment Variables
Ensure the following environment variables are set:
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT secret key
- `REDIS_URL`: Redis connection string
- `ALLOWED_ORIGINS`: CORS allowed origins

## Security Considerations

- All API endpoints require authentication (except registration/login)
- JWT tokens expire after 30 minutes by default
- Session tokens are cryptographically secure
- Database queries use parameterized statements
- CORS is properly configured
- Input validation using Pydantic models

## Monitoring and Logging

- Comprehensive logging for all monitoring events
- Suspicious activity tracking and alerting
- Real-time statistics and reporting
- Admin dashboard for monitoring all sessions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
