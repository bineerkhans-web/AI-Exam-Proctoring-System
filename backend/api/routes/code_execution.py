from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any

from database.database import get_db
from database.models import ExamSession
from core.auth import get_current_exam_session
from services.code_execution import code_execution_service

router = APIRouter()


class TestCase(BaseModel):
    input: str
    expected: str


class CodeExecutionRequest(BaseModel):
    code: str
    language: str
    test_cases: List[TestCase]
    problem_id: int
    timeout: int = 10


class CodeExecutionResponse(BaseModel):
    success: bool
    error: str = None
    test_results: List[Dict[str, Any]] = []
    execution_time: float = 0.0


@router.post("/execute", response_model=CodeExecutionResponse)
async def execute_code(
    request: CodeExecutionRequest,
    exam_session: ExamSession = Depends(get_current_exam_session),
    db: Session = Depends(get_db)
):
    """Execute code in the specified language with test cases"""
    
    try:
        # Convert test cases to the format expected by the execution service
        test_cases = [
            {
                "input": tc.input,
                "expected": tc.expected
            }
            for tc in request.test_cases
        ]
        
        # Execute the code
        import time
        start_time = time.time()
        
        result = await code_execution_service.execute_code(
            code=request.code,
            language=request.language,
            test_cases=test_cases,
            problem_id=request.problem_id,
            timeout=request.timeout
        )
        
        execution_time = time.time() - start_time
        
        return CodeExecutionResponse(
            success=result["success"],
            error=result.get("error"),
            test_results=result.get("test_results", []),
            execution_time=execution_time
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Code execution failed: {str(e)}"
        )


@router.get("/languages")
async def get_supported_languages():
    """Get list of supported programming languages"""
    
    return {
        "languages": [
            {
                "value": "javascript",
                "label": "JavaScript",
                "extension": ".js",
                "docker_image": "node:18-alpine"
            },
            {
                "value": "python",
                "label": "Python",
                "extension": ".py",
                "docker_image": "python:3.11-alpine"
            },
            {
                "value": "java",
                "label": "Java",
                "extension": ".java",
                "docker_image": "openjdk:17-alpine"
            },
            {
                "value": "cpp",
                "label": "C++",
                "extension": ".cpp",
                "docker_image": "gcc:latest"
            },
            {
                "value": "c",
                "label": "C",
                "extension": ".c",
                "docker_image": "gcc:latest"
            }
        ]
    }


@router.get("/health")
async def health_check():
    """Check if code execution service is healthy"""
    
    try:
        # Test if Docker is available
        docker_available = code_execution_service.docker_client is not None
        
        return {
            "status": "healthy",
            "docker_available": docker_available,
            "supported_languages": ["javascript", "python", "java", "cpp", "c"]
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "docker_available": False
        }
