from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
import uvicorn
from contextlib import asynccontextmanager

from backend.database.database import engine, Base
from backend.api.routes import auth, monitoring, submissions, admin, ai_monitoring, code_execution
from backend.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    pass


app = FastAPI(
    title="Exam Proctoring System",
    description="Backend API for AI-powered exam proctoring with monitoring and data handling",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(monitoring.router, prefix="/api/monitoring", tags=["Monitoring"])
app.include_router(submissions.router, prefix="/api/submissions", tags=["Submissions"])
app.include_router(ai_monitoring.router, prefix="/api/ai-monitoring", tags=["AI Monitoring"])
app.include_router(code_execution.router, prefix="/api/code-execution", tags=["Code Execution"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])


@app.get("/")
async def root():
    return {"message": "Exam Proctoring System API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
