from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost/exam_proctoring"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # AI/ML
    AI_MODEL_PATH: str = "models/"
    CONFIDENCE_THRESHOLD: float = 0.7
    
    # Monitoring
    MAX_TAB_SWITCHES: int = 5
    CAMERA_CHECK_INTERVAL: int = 30  # seconds
    
    class Config:
        env_file = ".env"


settings = Settings()
