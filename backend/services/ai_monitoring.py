import cv2
import numpy as np
import mediapipe as mp
import base64
import io
from PIL import Image
from typing import Dict, Any, Optional, Tuple
import logging
from datetime import datetime

from core.config import settings

logger = logging.getLogger(__name__)


class FaceDetectionService:
    def __init__(self):
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_drawing = mp.solutions.drawing_utils
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=0, min_detection_confidence=settings.CONFIDENCE_THRESHOLD
        )
    
    def detect_faces(self, image_data: str) -> Dict[str, Any]:
        """Detect faces in base64 encoded image"""
        try:
            # Decode base64 image
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            image_np = np.array(image)
            
            # Convert BGR to RGB
            if len(image_np.shape) == 3:
                image_rgb = cv2.cvtColor(image_np, cv2.COLOR_BGR2RGB)
            else:
                image_rgb = image_np
            
            # Process image
            results = self.face_detection.process(image_rgb)
            
            faces_detected = 0
            face_locations = []
            
            if results.detections:
                faces_detected = len(results.detections)
                for detection in results.detections:
                    # Get bounding box
                    bbox = detection.location_data.relative_bounding_box
                    h, w, _ = image_rgb.shape
                    
                    x = int(bbox.xmin * w)
                    y = int(bbox.ymin * h)
                    width = int(bbox.width * w)
                    height = int(bbox.height * h)
                    
                    face_locations.append({
                        "x": x, "y": y, "width": width, "height": height,
                        "confidence": detection.score[0]
                    })
            
            return {
                "faces_detected": faces_detected,
                "face_locations": face_locations,
                "is_suspicious": faces_detected == 0 or faces_detected > 1,
                "confidence": max([loc["confidence"] for loc in face_locations]) if face_locations else 0.0
            }
            
        except Exception as e:
            logger.error(f"Error in face detection: {str(e)}")
            return {
                "faces_detected": 0,
                "face_locations": [],
                "is_suspicious": True,
                "confidence": 0.0,
                "error": str(e)
            }


class GazeTrackingService:
    def __init__(self):
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=settings.CONFIDENCE_THRESHOLD,
            min_tracking_confidence=0.5
        )
        
        # Eye landmarks
        self.LEFT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
        self.RIGHT_EYE = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
        
    def calculate_eye_ratio(self, eye_landmarks):
        """Calculate eye aspect ratio for blink detection"""
        # Calculate distances
        vertical_1 = np.linalg.norm(eye_landmarks[1] - eye_landmarks[5])
        vertical_2 = np.linalg.norm(eye_landmarks[2] - eye_landmarks[4])
        horizontal = np.linalg.norm(eye_landmarks[0] - eye_landmarks[3])
        
        # Calculate ratio
        ratio = (vertical_1 + vertical_2) / (2.0 * horizontal)
        return ratio
    
    def track_gaze(self, image_data: str) -> Dict[str, Any]:
        """Track eye gaze direction"""
        try:
            # Decode base64 image
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            image_np = np.array(image)
            
            if len(image_np.shape) == 3:
                image_rgb = cv2.cvtColor(image_np, cv2.COLOR_BGR2RGB)
            else:
                image_rgb = image_np
            
            results = self.face_mesh.process(image_rgb)
            
            gaze_direction = "center"
            eye_ratio = 0.0
            is_looking_away = False
            
            if results.multi_face_landmarks:
                for face_landmarks in results.multi_face_landmarks:
                    # Extract eye landmarks
                    left_eye_landmarks = np.array([
                        [face_landmarks.landmark[i].x, face_landmarks.landmark[i].y] 
                        for i in self.LEFT_EYE
                    ])
                    right_eye_landmarks = np.array([
                        [face_landmarks.landmark[i].x, face_landmarks.landmark[i].y] 
                        for i in self.RIGHT_EYE
                    ])
                    
                    # Calculate eye ratios
                    left_ratio = self.calculate_eye_ratio(left_eye_landmarks)
                    right_ratio = self.calculate_eye_ratio(right_eye_landmarks)
                    eye_ratio = (left_ratio + right_ratio) / 2.0
                    
                    # Simple gaze direction estimation
                    left_eye_center = np.mean(left_eye_landmarks, axis=0)
                    right_eye_center = np.mean(right_eye_landmarks, axis=0)
                    
                    # Determine if looking away (simplified)
                    if left_eye_center[0] < 0.3 or left_eye_center[0] > 0.7:
                        gaze_direction = "left" if left_eye_center[0] < 0.3 else "right"
                        is_looking_away = True
                    elif right_eye_center[0] < 0.3 or right_eye_center[0] > 0.7:
                        gaze_direction = "left" if right_eye_center[0] < 0.3 else "right"
                        is_looking_away = True
            
            return {
                "gaze_direction": gaze_direction,
                "eye_ratio": eye_ratio,
                "is_looking_away": is_looking_away,
                "confidence": 0.8 if results.multi_face_landmarks else 0.0
            }
            
        except Exception as e:
            logger.error(f"Error in gaze tracking: {str(e)}")
            return {
                "gaze_direction": "unknown",
                "eye_ratio": 0.0,
                "is_looking_away": True,
                "confidence": 0.0,
                "error": str(e)
            }


class AudioAnalysisService:
    def __init__(self):
        self.sample_rate = 16000
        self.frame_length = 1024
    
    def analyze_audio(self, audio_data: str) -> Dict[str, Any]:
        """Analyze audio for background voices and suspicious sounds"""
        try:
            # Decode base64 audio
            audio_bytes = base64.b64decode(audio_data)
            
            # Convert bytes to numpy array (assuming 16-bit PCM)
            audio_array = np.frombuffer(audio_bytes, dtype=np.int16)
            
            # Calculate audio features
            volume = np.sqrt(np.mean(audio_array**2))
            zero_crossings = np.sum(np.diff(np.sign(audio_array)) != 0)
            
            # Simple voice detection based on volume and zero crossings
            has_voice = volume > 1000 and zero_crossings > 50
            
            # Detect multiple voices (simplified - would need more sophisticated analysis)
            has_multiple_voices = False  # Placeholder for more complex analysis
            
            return {
                "volume": float(volume),
                "zero_crossings": int(zero_crossings),
                "has_voice": has_voice,
                "has_multiple_voices": has_multiple_voices,
                "is_suspicious": has_multiple_voices,
                "confidence": 0.7 if has_voice else 0.3
            }
            
        except Exception as e:
            logger.error(f"Error in audio analysis: {str(e)}")
            return {
                "volume": 0.0,
                "zero_crossings": 0,
                "has_voice": False,
                "has_multiple_voices": False,
                "is_suspicious": False,
                "confidence": 0.0,
                "error": str(e)
            }


class AIMonitoringService:
    def __init__(self):
        self.face_detector = FaceDetectionService()
        self.gaze_tracker = GazeTrackingService()
        self.audio_analyzer = AudioAnalysisService()
    
    def analyze_image(self, image_data: str) -> Dict[str, Any]:
        """Comprehensive image analysis"""
        face_result = self.face_detector.detect_faces(image_data)
        gaze_result = self.gaze_tracker.track_gaze(image_data)
        
        # Combine results
        is_suspicious = (
            face_result["is_suspicious"] or 
            gaze_result["is_looking_away"] or
            face_result["faces_detected"] == 0
        )
        
        suspicious_activities = []
        
        if face_result["faces_detected"] == 0:
            suspicious_activities.append("no_face_detected")
        elif face_result["faces_detected"] > 1:
            suspicious_activities.append("multiple_faces_detected")
        
        if gaze_result["is_looking_away"]:
            suspicious_activities.append("looking_away_from_screen")
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "face_detection": face_result,
            "gaze_tracking": gaze_result,
            "is_suspicious": is_suspicious,
            "suspicious_activities": suspicious_activities,
            "overall_confidence": (face_result["confidence"] + gaze_result["confidence"]) / 2
        }
    
    def analyze_audio(self, audio_data: str) -> Dict[str, Any]:
        """Comprehensive audio analysis"""
        audio_result = self.audio_analyzer.analyze_audio(audio_data)
        
        suspicious_activities = []
        if audio_result["has_multiple_voices"]:
            suspicious_activities.append("multiple_voices_detected")
        elif audio_result["has_voice"] and audio_result["volume"] > 5000:
            suspicious_activities.append("loud_background_voice")
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "audio_analysis": audio_result,
            "is_suspicious": audio_result["is_suspicious"],
            "suspicious_activities": suspicious_activities,
            "overall_confidence": audio_result["confidence"]
        }
    
    def analyze_combined(self, image_data: str, audio_data: str) -> Dict[str, Any]:
        """Combined image and audio analysis"""
        image_result = self.analyze_image(image_data)
        audio_result = self.analyze_audio(audio_data)
        
        # Combine suspicious activities
        all_suspicious_activities = (
            image_result["suspicious_activities"] + 
            audio_result["suspicious_activities"]
        )
        
        # Overall assessment
        is_suspicious = (
            image_result["is_suspicious"] or 
            audio_result["is_suspicious"] or
            len(all_suspicious_activities) > 0
        )
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "image_analysis": image_result,
            "audio_analysis": audio_result,
            "is_suspicious": is_suspicious,
            "suspicious_activities": all_suspicious_activities,
            "overall_confidence": (image_result["overall_confidence"] + audio_result["overall_confidence"]) / 2,
            "risk_level": self._calculate_risk_level(all_suspicious_activities, is_suspicious)
        }
    
    def _calculate_risk_level(self, activities: list, is_suspicious: bool) -> str:
        """Calculate risk level based on suspicious activities"""
        if not is_suspicious:
            return "low"
        
        high_risk_activities = ["no_face_detected", "multiple_faces_detected", "multiple_voices_detected"]
        medium_risk_activities = ["looking_away_from_screen", "loud_background_voice"]
        
        high_risk_count = sum(1 for activity in activities if activity in high_risk_activities)
        medium_risk_count = sum(1 for activity in activities if activity in medium_risk_activities)
        
        if high_risk_count > 0:
            return "high"
        elif medium_risk_count > 1:
            return "medium"
        else:
            return "low"
