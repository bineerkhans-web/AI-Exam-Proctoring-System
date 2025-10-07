# 🚀 Quick Start Guide

## Single Command Launch

The easiest way to start the Exam Proctoring System is with a single command:

```bash
npm run dev:full
```

This will:
- ✅ Start the backend API server on `http://localhost:8000`
- ✅ Start the frontend application on `http://localhost:3000`
- ✅ Enable multi-language code execution
- ✅ Set up AI-powered proctoring

## Alternative Launch Options

### Frontend Only (No Backend Required)
```bash
npm run dev
```
- Runs only the frontend
- Supports JavaScript and Python execution
- Perfect for development and testing

### Backend Only
```bash
npm run backend
```
- Runs only the backend API
- Full multi-language support with Docker

### Docker Deployment
```bash
npm run docker:dev
```
- Full containerized deployment
- PostgreSQL database included
- Redis cache included

## What You Get

### 🌐 Web Interface
- **URL**: `http://localhost:3000`
- **Features**: Code editor, language selection, real-time execution
- **Languages**: JavaScript, Python, Java, C++, C

### 🔧 API Server
- **URL**: `http://localhost:8000`
- **Documentation**: `http://localhost:8000/docs`
- **Features**: Code execution, monitoring, authentication

### 🎯 Code Execution
- **JavaScript**: ✅ Client-side + Backend
- **Python**: ✅ Client-side + Backend
- **Java**: ✅ Backend only (Docker required)
- **C++**: ✅ Backend only (Docker required)
- **C**: ✅ Backend only (Docker required)

## First Steps

1. **Start the application**:
   ```bash
   npm run dev:full
   ```

2. **Open your browser**:
   - Go to `http://localhost:3000`
   - Register with your name and email
   - Start coding!

3. **Try different languages**:
   - Select JavaScript or Python for immediate execution
   - Switch to Java/C++/C for backend execution (requires Docker)

## Troubleshooting

### Backend Not Starting
```bash
# Check Python installation
python --version

# Install backend dependencies
cd backend && pip install -r requirements.txt

# Start backend manually
cd backend && python main.py
```

### Frontend Issues
```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run dev
```

### Docker Issues
```bash
# Check Docker installation
docker --version

# Start with Docker
npm run docker:dev
```

## Development Mode

For development, you can run just the frontend:

```bash
npm run dev
```

This gives you:
- Fast development cycle
- JavaScript and Python execution
- No backend setup required
- Perfect for UI development

## Production Mode

For production deployment:

```bash
# Build the application
npm run build:full

# Start in production mode
npm run start:full
```

## Need Help?

- 📚 **Documentation**: Check `README.md`
- 🔧 **Setup Guide**: Check `backend/CODE_EXECUTION_SETUP.md`
- 🐳 **Docker Guide**: Check `backend/README.md`
- 🆘 **Issues**: Open a GitHub issue

## Quick Commands Reference

```bash
# Development
npm run dev:full          # Start both frontend and backend
npm run dev               # Start frontend only
npm run backend           # Start backend only

# Docker
npm run docker:dev        # Start with Docker
npm run docker:stop       # Stop Docker services

# Production
npm run build:full        # Build for production
npm run start:full        # Start in production mode

# Setup
npm run setup             # Install all dependencies
```

---

**Happy Coding! 🎉**
