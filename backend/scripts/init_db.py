#!/usr/bin/env python3
"""
Database initialization script
Run this script to create the database and run initial migrations
"""

import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database.database import Base
from database.models import *
from core.config import settings


def init_database():
    """Initialize the database with tables"""
    print("Initializing database...")
    
    # Create engine
    engine = create_engine(settings.DATABASE_URL)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    print("Database initialized successfully!")
    print(f"Database URL: {settings.DATABASE_URL}")


def create_sample_data():
    """Create sample data for testing"""
    print("Creating sample data...")
    
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Create sample candidate
        candidate = Candidate(
            name="John Doe",
            email="john.doe@example.com"
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)
        
        print(f"Created sample candidate: {candidate.name} ({candidate.email})")
        
    except Exception as e:
        print(f"Error creating sample data: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    init_database()
    
    if len(sys.argv) > 1 and sys.argv[1] == "--with-sample":
        create_sample_data()
    
    print("Done!")
