import base64
import io
from dataclasses import dataclass
from typing import List, Optional, Tuple

import numpy as np
from PIL import Image


@dataclass
class AnalysisResult:
    risk_score: float
    labels: List[str]
    explanations: List[str]


def _decode_image(b64_jpeg: str) -> Optional[np.ndarray]:
    try:
        image_bytes = base64.b64decode(b64_jpeg)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return np.array(image)
    except Exception:
        return None


def _basic_face_presence_stub(image_np: Optional[np.ndarray]) -> Tuple[bool, int, List[str]]:
    # Placeholder: returns no-face if image missing; otherwise assume one face
    if image_np is None:
        return False, 0, ["no_frame"]
    # Heuristic placeholder: treat every frame as single face present
    return True, 1, []


def _vad_voice_presence_stub(audio_bytes: Optional[bytes]) -> bool:
    # Placeholder: without real VAD, mark voice as False
    return False


def analyze(frame_b64: Optional[str], audio_b64: Optional[str], events: List[dict]) -> AnalysisResult:
    labels: List[str] = []
    explanations: List[str] = []
    risk = 0.0

    image_np = _decode_image(frame_b64) if frame_b64 else None
    face_present, num_faces, img_notes = _basic_face_presence_stub(image_np)
    labels.extend(img_notes)

    if not face_present:
        labels.append("no_face")
        explanations.append("No face detected in current frame")
        risk += 0.6
    elif num_faces > 1:
        labels.append("multiple_faces")
        explanations.append("Multiple faces detected")
        risk += 0.8

    audio_bytes = None
    if audio_b64:
        try:
            audio_bytes = base64.b64decode(audio_b64)
        except Exception:
            labels.append("audio_decode_error")
            explanations.append("Audio payload could not be decoded")

    if _vad_voice_presence_stub(audio_bytes):
        labels.append("voice_detected")
        explanations.append("Speech detected in audio snippet")
        risk += 0.3

    # Incorporate frontend events crudely
    for ev in events or []:
        t = ev.get("type")
        if t in ("fullscreen_exit", "tab_switch", "dev_tools"):
            labels.append(t)
            risk += 0.15

    risk = max(0.0, min(1.0, risk))
    return AnalysisResult(risk_score=risk, labels=list(set(labels)), explanations=explanations)


