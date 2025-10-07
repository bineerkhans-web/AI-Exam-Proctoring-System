# Code Execution Setup Guide

This guide explains how to set up multi-language code execution for the exam proctoring system.

## Overview

The system now supports code execution in multiple programming languages:
- **JavaScript** (Node.js)
- **Python** (Python 3.11)
- **Java** (OpenJDK 17)
- **C++** (GCC)
- **C** (GCC)

## Architecture

### Frontend (Next.js)
- Detects backend availability
- Falls back to JavaScript-only execution if backend is unavailable
- Provides real-time feedback on execution status

### Backend (FastAPI)
- Code execution service with Docker sandboxing
- Support for multiple programming languages
- Secure execution environment with timeouts
- Test case validation and results

## Setup Options

### Option 1: Docker Compose (Recommended)

1. **Start all services**:
   ```bash
   cd backend
   docker-compose up -d
   ```

   This will start:
   - PostgreSQL database
   - Redis cache
   - Backend API with code execution
   - Docker daemon access for sandboxing

2. **Verify setup**:
   ```bash
   # Check backend health
   curl http://localhost:8000/api/code-execution/health
   
   # Expected response:
   {
     "status": "healthy",
     "docker_available": true,
     "supported_languages": ["javascript", "python", "java", "cpp", "c"]
   }
   ```

### Option 2: Local Development

1. **Install system dependencies**:
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install -y nodejs npm python3 openjdk-17-jdk gcc g++
   
   # macOS
   brew install node python openjdk@17 gcc
   ```

2. **Start backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   python main.py
   ```

3. **Start frontend**:
   ```bash
   npm run dev
   ```

## Code Execution Flow

### 1. Frontend Detection
```javascript
// Check if backend is available
const response = await apiClient.checkCodeExecutionHealth();
if (response.docker_available) {
  // Use backend execution for all languages
  setBackendAvailable(true);
} else {
  // Fallback to JavaScript-only execution
  setBackendAvailable(false);
}
```

### 2. Backend Execution
```python
# Execute code in Docker container
container = docker_client.containers.run(
    image="python:3.11-alpine",
    command="python script.py",
    volumes={temp_dir: {'bind': '/tmp', 'mode': 'rw'}},
    remove=True,
    detach=True
)
```

### 3. Test Case Validation
```python
# Validate test cases
for test_case in test_cases:
    result = execute_user_code(test_case.input)
    passed = result.output == test_case.expected
    test_results.append({
        "testCase": i + 1,
        "input": test_case.input,
        "expected": test_case.expected,
        "output": result.output,
        "passed": passed
    })
```

## Security Features

### Docker Sandboxing
- Isolated execution environment
- Resource limits (CPU, memory, time)
- Network isolation
- Automatic cleanup

### Timeout Protection
- Default 10-second timeout per execution
- Configurable per request
- Automatic process termination

### Input Validation
- Code length limits
- Test case validation
- Language-specific sanitization

## Supported Languages

### JavaScript
- **Runtime**: Node.js 18
- **Docker Image**: `node:18-alpine`
- **Features**: Full ES6+ support, npm packages

### Python
- **Runtime**: Python 3.11
- **Docker Image**: `python:3.11-alpine`
- **Features**: Standard library, pip packages

### Java
- **Runtime**: OpenJDK 17
- **Docker Image**: `openjdk:17-alpine`
- **Features**: Full Java SE support

### C++
- **Compiler**: GCC
- **Docker Image**: `gcc:latest`
- **Features**: C++17 standard, STL

### C
- **Compiler**: GCC
- **Docker Image**: `gcc:latest`
- **Features**: C11 standard, standard library

## API Endpoints

### Execute Code
```http
POST /api/code-execution/execute
Content-Type: application/json

{
  "code": "def hello(): return 'world'",
  "language": "python",
  "test_cases": [
    {
      "input": "hello()",
      "expected": "world"
    }
  ],
  "problem_id": 1,
  "timeout": 10
}
```

### Get Supported Languages
```http
GET /api/code-execution/languages
```

### Health Check
```http
GET /api/code-execution/health
```

## Troubleshooting

### Docker Not Available
```bash
# Check Docker installation
docker --version

# Check Docker daemon
sudo systemctl status docker

# Start Docker daemon
sudo systemctl start docker
```

### Backend Connection Issues
```bash
# Check backend logs
docker-compose logs backend

# Check API health
curl http://localhost:8000/health

# Check code execution health
curl http://localhost:8000/api/code-execution/health
```

### Language-Specific Issues

#### Python
```bash
# Test Python execution
docker run --rm python:3.11-alpine python -c "print('Hello World')"
```

#### JavaScript
```bash
# Test Node.js execution
docker run --rm node:18-alpine node -e "console.log('Hello World')"
```

#### Java
```bash
# Test Java execution
docker run --rm openjdk:17-alpine java -version
```

## Performance Optimization

### Container Reuse
- Consider using container pools for high-frequency execution
- Implement connection pooling for database operations

### Resource Limits
```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

### Caching
- Cache compiled code for repeated executions
- Use Redis for session data and temporary storage

## Monitoring

### Logs
```bash
# View execution logs
docker-compose logs -f backend

# Filter code execution logs
docker-compose logs backend | grep "code-execution"
```

### Metrics
- Execution time per language
- Success/failure rates
- Resource usage statistics
- Error frequency and types

## Development

### Adding New Languages

1. **Update backend service**:
   ```python
   # services/code_execution.py
   async def _execute_new_language(self, code, test_cases, problem_id, timeout):
       # Implementation
   ```

2. **Update frontend**:
   ```javascript
   // Add to languages array
   const languages = [
     // ... existing languages
     { value: "newlang", label: "New Language" }
   ];
   ```

3. **Add Docker image**:
   ```dockerfile
   # Add to Dockerfile
   RUN apt-get install -y new-language-runtime
   ```

### Testing
```bash
# Run tests
cd backend
pytest tests/test_code_execution.py

# Test specific language
python -m pytest tests/test_code_execution.py::test_python_execution
```

## Production Deployment

### Security Considerations
- Use read-only containers
- Implement network policies
- Monitor resource usage
- Log all executions

### Scaling
- Use container orchestration (Kubernetes)
- Implement load balancing
- Add horizontal scaling
- Monitor performance metrics

### Backup and Recovery
- Database backups
- Code execution logs
- Configuration management
- Disaster recovery procedures

This setup provides a robust, secure, and scalable code execution environment for the exam proctoring system.
