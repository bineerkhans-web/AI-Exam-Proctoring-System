from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from database.database import get_db
from database.models import ExamSession, AIMonitoringResult, SuspiciousActivity
from api.schemas import AIMonitoringData, AIMonitoringResult as AIMonitoringResultSchema
from core.auth import get_current_exam_session
from services.ai_monitoring import AIMonitoringService

router = APIRouter()
ai_service = AIMonitoringService()


@router.post("/analyze", response_model=AIMonitoringResultSchema)
async def analyze_monitoring_data(
    data: AIMonitoringData,
    exam_session: ExamSession = Depends(get_current_exam_session),
    db: Session = Depends(get_db)
):
    """Analyze image and/or audio data for suspicious activities"""
    
    try:
        # Perform AI analysis based on data type
        if data.image_data and data.audio_data:
            result = ai_service.analyze_combined(data.image_data, data.audio_data)
        elif data.image_data:
            result = ai_service.analyze_image(data.image_data)
        elif data.audio_data:
            result = ai_service.analyze_audio(data.audio_data)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either image_data or audio_data must be provided"
            )
        
        # Store AI monitoring result in database
        ai_result = AIMonitoringResult(
            exam_session_id=exam_session.id,
            analysis_type=data.analysis_type,
            confidence_score=result["overall_confidence"],
            result_data=result,
            is_suspicious=result["is_suspicious"]
        )
        
        db.add(ai_result)
        db.commit()
        db.refresh(ai_result)
        
        # If suspicious activities detected, create suspicious activity records
        if result["is_suspicious"] and "suspicious_activities" in result:
            for activity_type in result["suspicious_activities"]:
                suspicious_activity = SuspiciousActivity(
                    exam_session_id=exam_session.id,
                    activity_type=activity_type,
                    confidence=result["overall_confidence"],
                    details=result
                )
                db.add(suspicious_activity)
        
        db.commit()
        
        return AIMonitoringResultSchema(
            analysis_type=data.analysis_type,
            confidence_score=result["overall_confidence"],
            result_data=result,
            is_suspicious=result["is_suspicious"],
            timestamp=ai_result.timestamp
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI analysis failed: {str(e)}"
        )


@router.get("/results")
async def get_ai_monitoring_results(
    exam_session: ExamSession = Depends(get_current_exam_session),
    db: Session = Depends(get_db)
):
    """Get AI monitoring results for current exam session"""
    
    results = db.query(AIMonitoringResult).filter(
        AIMonitoringResult.exam_session_id == exam_session.id
    ).order_by(AIMonitoringResult.timestamp.desc()).all()
    
    return results


@router.get("/results/suspicious")
async def get_suspicious_results(
    exam_session: ExamSession = Depends(get_current_exam_session),
    db: Session = Depends(get_db)
):
    """Get only suspicious AI monitoring results"""
    
    results = db.query(AIMonitoringResult).filter(
        AIMonitoringResult.exam_session_id == exam_session.id,
        AIMonitoringResult.is_suspicious == True
    ).order_by(AIMonitoringResult.timestamp.desc()).all()
    
    return results


@router.get("/results/{result_id}")
async def get_ai_monitoring_result(
    result_id: int,
    exam_session: ExamSession = Depends(get_current_exam_session),
    db: Session = Depends(get_db)
):
    """Get specific AI monitoring result"""
    
    result = db.query(AIMonitoringResult).filter(
        AIMonitoringResult.id == result_id,
        AIMonitoringResult.exam_session_id == exam_session.id
    ).first()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI monitoring result not found"
        )
    
    return result


@router.post("/batch-analyze")
async def batch_analyze_monitoring_data(
    data_list: list[AIMonitoringData],
    exam_session: ExamSession = Depends(get_current_exam_session),
    db: Session = Depends(get_db)
):
    """Analyze multiple monitoring data points in batch"""
    
    results = []
    
    for data in data_list:
        try:
            if data.image_data and data.audio_data:
                result = ai_service.analyze_combined(data.image_data, data.audio_data)
            elif data.image_data:
                result = ai_service.analyze_image(data.image_data)
            elif data.audio_data:
                result = ai_service.analyze_audio(data.audio_data)
            else:
                continue
            
            # Store result
            ai_result = AIMonitoringResult(
                exam_session_id=exam_session.id,
                analysis_type=data.analysis_type,
                confidence_score=result["overall_confidence"],
                result_data=result,
                is_suspicious=result["is_suspicious"]
            )
            
            db.add(ai_result)
            results.append(result)
            
        except Exception as e:
            # Log error but continue processing other items
            continue
    
    db.commit()
    
    return {
        "processed_count": len(results),
        "results": results
    }


@router.get("/stats")
async def get_ai_monitoring_stats(
    exam_session: ExamSession = Depends(get_current_exam_session),
    db: Session = Depends(get_db)
):
    """Get AI monitoring statistics for current exam session"""
    
    total_analyses = db.query(AIMonitoringResult).filter(
        AIMonitoringResult.exam_session_id == exam_session.id
    ).count()
    
    suspicious_analyses = db.query(AIMonitoringResult).filter(
        AIMonitoringResult.exam_session_id == exam_session.id,
        AIMonitoringResult.is_suspicious == True
    ).count()
    
    # Get analysis type breakdown
    face_detection_count = db.query(AIMonitoringResult).filter(
        AIMonitoringResult.exam_session_id == exam_session.id,
        AIMonitoringResult.analysis_type == "face_detection"
    ).count()
    
    gaze_tracking_count = db.query(AIMonitoringResult).filter(
        AIMonitoringResult.exam_session_id == exam_session.id,
        AIMonitoringResult.analysis_type == "gaze_tracking"
    ).count()
    
    audio_analysis_count = db.query(AIMonitoringResult).filter(
        AIMonitoringResult.exam_session_id == exam_session.id,
        AIMonitoringResult.analysis_type == "audio_analysis"
    ).count()
    
    # Calculate average confidence
    avg_confidence = db.query(AIMonitoringResult.confidence_score).filter(
        AIMonitoringResult.exam_session_id == exam_session.id
    ).all()
    
    avg_conf = sum([r[0] for r in avg_confidence]) / len(avg_confidence) if avg_confidence else 0.0
    
    return {
        "total_analyses": total_analyses,
        "suspicious_analyses": suspicious_analyses,
        "suspicious_rate": (suspicious_analyses / total_analyses * 100) if total_analyses > 0 else 0,
        "analysis_breakdown": {
            "face_detection": face_detection_count,
            "gaze_tracking": gaze_tracking_count,
            "audio_analysis": audio_analysis_count
        },
        "average_confidence": round(avg_conf, 3)
    }
