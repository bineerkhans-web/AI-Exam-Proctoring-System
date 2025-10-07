# Exam Proctoring System

A comprehensive AI-powered exam proctoring system with multi-language code execution capabilities.

## 🚀 Quick Start

### Single Command Launch (Recommended)
```bash
# Install dependencies and start both frontend and backend
npm run dev:full
```

This will start:
- Backend API server on `http://localhost:8000`
- Frontend application on `http://localhost:3000`
- Code execution service for all programming languages

### Alternative Launch Options

#### Frontend Only (Client-side execution)
```bash
npm run dev
```
- Runs only the frontend
- Supports JavaScript and Python execution client-side
- No backend required

#### Backend Only
```bash
npm run backend
```
- Runs only the backend API
- Full multi-language support with Docker sandboxing

#### Docker Deployment
```bash
npm run docker:dev
```
- Full containerized deployment
- PostgreSQL database
- Redis cache
- Docker-based code execution

## ✨ Features

### 🎯 Multi-Language Code Execution
- **JavaScript** - Full support (client-side & backend)
- **Python** - Full support (client-side & backend)
- **Java** - Backend only (requires Docker)
- **C++** - Backend only (requires Docker)
- **C** - Backend only (requires Docker)

### 🔒 AI-Powered Proctoring
- Real-time camera monitoring
- Face detection and tracking
- Gaze tracking and attention monitoring
- Audio analysis for background voices
- Tab switch detection
- Suspicious activity flagging

### 📊 Exam Management
- Candidate registration and authentication
- Session management with JWT tokens
- Code submission tracking
- Real-time monitoring dashboard
- Admin panel for oversight

### 🛡️ Security Features
- Docker sandboxing for code execution
- Timeout protection
- Input validation and sanitization
- Secure authentication
- Session-based authorization

## 🏗️ Architecture

### Frontend (Next.js)
- React-based user interface
- Client-side code execution for JavaScript/Python
- Real-time monitoring integration
- Responsive design with Tailwind CSS

### Backend (FastAPI)
- RESTful API with automatic documentation
- Multi-language code execution service
- AI monitoring with OpenCV and MediaPipe
- PostgreSQL database with SQLAlchemy ORM
- Redis for caching and session management

### AI/ML Layer
- **OpenCV** - Computer vision and image processing
- **MediaPipe** - Face detection and pose estimation
- **TensorFlow** - Machine learning models
- **Custom Models** - Suspicious activity detection

## 📋 Prerequisites

### For Full Backend Support
- Python 3.11+
- Node.js 18+
- Docker (for code execution sandboxing)
- PostgreSQL (or use Docker)
- Redis (or use Docker)

### For Client-side Only
- Node.js 18+
- Modern web browser

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd exam-proctoring
```

### 2. Install Dependencies
```bash
# Install all dependencies (frontend + backend)
npm run setup

# Or install separately
npm install                    # Frontend dependencies
cd backend && pip install -r requirements.txt  # Backend dependencies
```

### 3. Environment Setup
```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit configuration
nano backend/.env
```

### 4. Database Setup
```bash
# Initialize database
cd backend
python scripts/init_db.py

# Or use Docker
docker-compose up -d postgres
```

## 🎮 Usage

### Starting the Application

#### Option 1: Full Stack (Recommended)
```bash
npm run dev:full
```
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`
- API Docs: `http://localhost:8000/docs`

#### Option 2: Frontend Only
```bash
npm run dev
```
- Frontend: `http://localhost:3000`
- Limited to JavaScript/Python execution

#### Option 3: Docker Deployment
```bash
npm run docker:dev
```
- All services containerized
- Full multi-language support

### Using the Exam Interface

1. **Register/Login**: Enter name and email
2. **Select Language**: Choose from supported languages
3. **Write Code**: Use the code editor
4. **Run Tests**: Click "Run [LANGUAGE]" button
5. **Submit**: Final submit when done

### Language Support Matrix

| Language | Client-side | Backend | Docker Required |
|----------|-------------|---------|-----------------|
| JavaScript | ✅ | ✅ | ❌ |
| Python | ✅ | ✅ | ❌ |
| Java | ❌ | ✅ | ✅ |
| C++ | ❌ | ✅ | ✅ |
| C | ❌ | ✅ | ✅ |

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost/exam_proctoring

# JWT
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
ALLOWED_ORIGINS=["http://localhost:3000"]

# AI/ML
CONFIDENCE_THRESHOLD=0.7
```

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/register` - Register candidate
- `POST /api/auth/login` - Login candidate
- `POST /api/auth/start-exam/{candidate_id}` - Start exam session

### Code Execution
- `POST /api/code-execution/execute` - Execute code
- `GET /api/code-execution/languages` - Get supported languages
- `GET /api/code-execution/health` - Check service health

### Monitoring
- `POST /api/monitoring/data` - Send monitoring data
- `POST /api/monitoring/suspicious-activity` - Report suspicious activity

### Submissions
- `POST /api/submissions/submit` - Submit code
- `GET /api/submissions/submissions` - Get submissions

### AI Monitoring
- `POST /api/ai-monitoring/analyze` - Analyze with AI
- `GET /api/ai-monitoring/results` - Get AI results

### Admin
- `GET /api/admin/stats` - Get system statistics
- `GET /api/admin/exam-sessions` - Get exam sessions

## 🧪 Testing

### Frontend Tests
```bash
npm test
```

### Backend Tests
```bash
cd backend
pytest tests/
```

### Integration Tests
```bash
# Start full stack
npm run dev:full

# Test API endpoints
curl http://localhost:8000/health
curl http://localhost:8000/api/code-execution/health
```

## 🐳 Docker Deployment

### Development
```bash
npm run docker:dev
```

### Production
```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml up -d
```

### Docker Services
- **postgres** - Database
- **redis** - Cache
- **backend** - API server
- **frontend** - Web application

## 🔍 Monitoring and Logs

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

### Health Checks
```bash
# Backend health
curl http://localhost:8000/health

# Code execution health
curl http://localhost:8000/api/code-execution/health

# Database health
docker-compose exec postgres pg_isready
```

## 🚨 Troubleshooting

### Common Issues

#### Backend Not Starting
```bash
# Check Python version
python --version

# Check dependencies
pip list

# Check database connection
python -c "from database.database import engine; print(engine.url)"
```

#### Frontend Build Issues
```bash
# Clear cache
rm -rf .next node_modules
npm install

# Check Node version
node --version
```

#### Docker Issues
```bash
# Check Docker
docker --version
docker-compose --version

# Restart services
docker-compose down
docker-compose up -d
```

#### Code Execution Issues
```bash
# Check Docker daemon
sudo systemctl status docker

# Test code execution
curl -X POST http://localhost:8000/api/code-execution/execute \
  -H "Content-Type: application/json" \
  -d '{"code":"print(\"Hello World\")","language":"python","test_cases":[],"problem_id":1}'
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Open an issue on GitHub
4. Contact the development team

## 🔮 Roadmap

### Upcoming Features
- [ ] Real-time collaboration
- [ ] Advanced AI monitoring
- [ ] Mobile app support
- [ ] Cloud deployment
- [ ] Performance analytics
- [ ] Custom problem sets
- [ ] Video recording
- [ ] Plagiarism detection

### Performance Improvements
- [ ] Code execution optimization
- [ ] Database query optimization
- [ ] Caching improvements
- [ ] Load balancing
- [ ] CDN integration

---

**Happy Coding! 🎉**