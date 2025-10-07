"use client";
import { useEffect, useRef, useState } from "react";

interface CameraFeedProps {
  onStatusChange?: (status: { camera: string; mic: string }) => void;
  onViolation?: (violation: { type: string; message: string; details?: any }) => void;
}

const CameraFeed = ({ onStatusChange, onViolation }: CameraFeedProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [cameraConnected, setCameraConnected] = useState(true);
  const [micConnected, setMicConnected] = useState(true);
  const statusRef = useRef({ camera: "connected", mic: "connected" });
  const analysisTimerRef = useRef<number | null>(null);
  const consecutiveGazeAwayRef = useRef<number>(0);
  const startFramesRef = useRef<number>(0);
  const startEnforcementSeconds = 6; // strict checks within the first N seconds
  const consecutiveDarkFramesRef = useRef<number>(0);
  const consecutiveNoFaceRef = useRef<number>(0);
  const consecutiveBlurFramesRef = useRef<number>(0);
  const initialFaceIdRef = useRef<string | null>(null);
  const lastFaceIdRef = useRef<string | null>(null);
  const consecutiveOcclusionRef = useRef<number>(0);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let animationId: number | null = null;
    let analysisInFlight = false;
    const analysisIntervalMs = 1000; // capture every ~1s for faster response

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsRecording(true);
          setCameraConnected(true);
          setMicConnected(true);
          statusRef.current.camera = "connected";
          statusRef.current.mic = "connected";
          
          // Notify parent component of status
          if (onStatusChange) {
            onStatusChange({ camera: "connected", mic: "connected" });
          }
        }

        // Monitor microphone level
        audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        
        microphone.connect(analyser);
        analyser.fftSize = 256;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const updateMicLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          setMicLevel(average);
          animationId = requestAnimationFrame(updateMicLevel);
        };
        
        updateMicLevel();

        // Periodic frame capture and backend analysis
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const faceDetector: any = (window as any).FaceDetector ? new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 }) : null;

        const captureAndAnalyze = async () => {
          if (!videoRef.current || !ctx || analysisInFlight) return;
          try {
            analysisInFlight = true;
            const video = videoRef.current as HTMLVideoElement;
            if (video.videoWidth === 0 || video.videoHeight === 0) {
              analysisInFlight = false;
              return;
            }
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);

            // Heuristic: detect covered camera (very dark, low variance) for consecutive frames
            try {
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const data = imageData.data;
              let sum = 0;
              let sumSq = 0;
              let darkCount = 0;
              const total = data.length / 4;
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                // perceived luminance
                const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                sum += y;
                sumSq += y * y;
                if (y < 25) darkCount += 1;
              }
              const mean = sum / total;
              const variance = Math.max(0, sumSq / total - mean * mean);
              const stddev = Math.sqrt(variance);
              const darkRatio = darkCount / total;
              if ((mean < 20 && stddev < 12) || darkRatio > 0.85) {
                consecutiveDarkFramesRef.current += 1;
              } else {
                consecutiveDarkFramesRef.current = 0;
              }
              const darkSeconds = consecutiveDarkFramesRef.current * (analysisIntervalMs / 1000);
              if (darkSeconds >= 2) {
                onViolation?.({ type: 'camera_covered', message: 'Camera appears covered or too dark', details: { mean, stddev } });
                return;
              }
            } catch {}

            const { apiClient } = await import('../lib/api');
            const result: any = await apiClient.analyzeWithAI(dataUrl, undefined, 'image');
            // Expected shape: { labels: string[], risk_score: number, details?: any }
            const labels: string[] = result?.labels || [];
            const details: any = result?.details || {};

            // Local eyes-occlusion fallback using FaceDetector if backend labels are missing
            if (!labels.some(l => l.includes('eyes')) && faceDetector) {
              try {
                const faces = await faceDetector.detect(videoRef.current);
                if (faces && faces.length > 0) {
                  const f = faces[0].boundingBox as DOMRectReadOnly;
                  const fx = Math.max(0, Math.floor(f.x));
                  const fy = Math.max(0, Math.floor(f.y));
                  const fw = Math.min(canvas.width - fx, Math.floor(f.width));
                  const fh = Math.min(canvas.height - fy, Math.floor(f.height));
                  if (fw > 10 && fh > 10) {
                    // Define eye region as upper quarter of face box, lower face as middle-bottom half
                    const eyeH = Math.max(2, Math.floor(fh * 0.25));
                    const eyeW = fw;
                    const eyeData = ctx.getImageData(fx, fy, eyeW, eyeH).data;
                    const lowerY = fy + Math.floor(fh * 0.5);
                    const lowerH = Math.max(2, Math.floor(fh * 0.45));
                    const lowerData = ctx.getImageData(fx, lowerY, fw, lowerH).data;
                    const lumAvg = (arr: Uint8ClampedArray) => {
                      let s = 0; let n = 0;
                      for (let i = 0; i < arr.length; i += 4) {
                        const r = arr[i], g = arr[i+1], b = arr[i+2];
                        s += 0.2126*r + 0.7152*g + 0.0722*b; n++;
                      }
                      return n ? s / n : 0;
                    };
                    const eyeMean = lumAvg(eyeData);
                    const lowerMean = lumAvg(lowerData);
                    // If eye region is much darker than lower face, suspect occlusion (hands/glasses)
                    if (lowerMean > 0 && (eyeMean / lowerMean) < 0.45) {
                      consecutiveOcclusionRef.current += 1;
                    } else {
                      consecutiveOcclusionRef.current = 0;
                    }
                    const occSecLocal = consecutiveOcclusionRef.current * (analysisIntervalMs / 1000);
                    if (occSecLocal >= 1.5) {
                      onViolation?.({ type: 'eyes_occluded_local', message: 'Eyes likely occluded/not visible', details: { eyeMean, lowerMean } });
                      return;
                    }
                  }
                }
              } catch {}
            }

            // Heuristic eyes-occlusion without FaceDetector: compare top vs lower frame luminance
            if (!labels.some(l => l.includes('eyes')) && !faceDetector) {
              try {
                const topH = Math.max(2, Math.floor(canvas.height * 0.25));
                const lowerY = Math.floor(canvas.height * 0.5);
                const lowerH = Math.max(2, canvas.height - lowerY);
                const topData = ctx.getImageData(0, 0, canvas.width, topH).data;
                const lowData = ctx.getImageData(0, lowerY, canvas.width, lowerH).data;
                const lumAvg = (arr: Uint8ClampedArray) => {
                  let s = 0; let n = 0;
                  for (let i = 0; i < arr.length; i += 4) {
                    const r = arr[i], g = arr[i+1], b = arr[i+2];
                    s += 0.2126*r + 0.7152*g + 0.0722*b; n++;
                  }
                  return n ? s / n : 0;
                };
                const topMean = lumAvg(topData);
                const lowMean = lumAvg(lowData);
                if (lowMean > 0 && (topMean / lowMean) < 0.5) {
                  consecutiveOcclusionRef.current += 1;
                } else {
                  consecutiveOcclusionRef.current = 0;
                }
                const occSecSimple = consecutiveOcclusionRef.current * (analysisIntervalMs / 1000);
                if (occSecSimple >= 1.5) {
                  onViolation?.({ type: 'eyes_occluded_simple', message: 'Eyes likely occluded/not visible', details: { topMean, lowMean } });
                  return;
                }
              } catch {}
            }

            // Background/virtual background detection — terminate on detection
            if (labels.includes('background_motion') || labels.includes('animated_background') || labels.includes('virtual_background')) {
              onViolation?.({ type: 'background_violation', message: 'Background movement or virtual background detected', details: result });
              return;
            }

            // Immediate violations
            if (labels.includes('multiple_faces')) {
              onViolation?.({ type: 'multiple_faces', message: 'Multiple faces detected', details: result });
              return;
            }
            if (labels.includes('phone_detected') || labels.includes('mobile_phone')) {
              onViolation?.({ type: 'phone_detected', message: 'Phone detected in camera view', details: result });
              return;
            }

            // Start-of-exam face presence/cover enforcement
            if (startFramesRef.current * (analysisIntervalMs / 1000) < startEnforcementSeconds) {
              startFramesRef.current += 1;
              if (labels.includes('face_covered') || labels.includes('no_face') || !labels.includes('face_present')) {
                onViolation?.({ type: 'face_not_visible_at_start', message: 'Face not clearly visible at exam start', details: result });
                return;
              }

              // Blur detection using Laplacian variance on luminance
              try {
                // Downscale to speed up
                const scale = Math.max(1, Math.floor(Math.min(canvas.width, canvas.height) / 160));
                const w = Math.max(32, Math.floor(canvas.width / scale));
                const h = Math.max(32, Math.floor(canvas.height / scale));
                const smallCanvas = document.createElement('canvas');
                smallCanvas.width = w; smallCanvas.height = h;
                const sctx = smallCanvas.getContext('2d');
                if (sctx) {
                  sctx.drawImage(canvas, 0, 0, w, h);
                  const img = sctx.getImageData(0, 0, w, h);
                  // Compute Laplacian approximation on luminance
                  const lum = new Float32Array(w * h);
                  let idx = 0;
                  for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                      const i = (y * w + x) * 4;
                      const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
                      lum[idx++] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                    }
                  }
                  let sumLap = 0;
                  let sumLapSq = 0;
                  let count = 0;
                  for (let y = 1; y < h - 1; y++) {
                    for (let x = 1; x < w - 1; x++) {
                      const c = lum[y * w + x];
                      const up = lum[(y - 1) * w + x];
                      const down = lum[(y + 1) * w + x];
                      const left = lum[y * w + (x - 1)];
                      const right = lum[y * w + (x + 1)];
                      // 4-neighbor Laplacian
                      const lap = (4 * c) - (up + down + left + right);
                      sumLap += lap;
                      sumLapSq += lap * lap;
                      count++;
                    }
                  }
                  if (count > 0) {
                    const meanLap = sumLap / count;
                    const varLap = Math.max(0, sumLapSq / count - meanLap * meanLap);
                    // Lower variance implies blur. Threshold calibrated empirically.
                    if (varLap < 55) {
                      consecutiveBlurFramesRef.current += 1;
                    } else {
                      consecutiveBlurFramesRef.current = 0;
                    }
                    const blurSeconds = consecutiveBlurFramesRef.current * (analysisIntervalMs / 1000);
                    if (blurSeconds >= 2) {
                      onViolation?.({ type: 'face_blurred_start', message: 'Face too blurred at exam start', details: { varLap } });
                      return;
                    }
                  }
                }
              } catch {}
            }
            // Face switch detection using analyzer-provided identity
            if (details && (details.face_id || details.face_signature)) {
              const currentId: string = String(details.face_id || details.face_signature);
              if (!initialFaceIdRef.current) {
                initialFaceIdRef.current = currentId;
              }
              if (lastFaceIdRef.current && currentId !== lastFaceIdRef.current && currentId !== initialFaceIdRef.current) {
                onViolation?.({ type: 'face_switched', message: 'Different face detected — exam terminated', details: { currentId, initial: initialFaceIdRef.current } });
                return;
              }
              lastFaceIdRef.current = currentId;
            }

            // Continuous no-face enforcement beyond start window
            if (labels.includes('no_face') || !labels.includes('face_present')) {
              consecutiveNoFaceRef.current += 1;
            } else {
              consecutiveNoFaceRef.current = 0;
            }
            const noFaceSeconds = consecutiveNoFaceRef.current * (analysisIntervalMs / 1000);
            if (noFaceSeconds >= 5) {
              onViolation?.({ type: 'face_missing', message: 'Face not visible for too long', details: result });
              return;
            }

            // Prolonged gaze-away: accumulate consecutive frames flagged as gaze_away
            if (labels.includes('gaze_away') || labels.includes('looking_away')) {
              consecutiveGazeAwayRef.current += 1;
            } else {
              consecutiveGazeAwayRef.current = 0;
            }
            const gazeAwaySeconds = consecutiveGazeAwayRef.current * (analysisIntervalMs / 1000);
            if (gazeAwaySeconds >= 5) {
              onViolation?.({ type: 'gaze_away_prolonged', message: 'Prolonged gaze away from screen', details: { seconds: gazeAwaySeconds, result } });
              return;
            }

            // Eyes/face occlusion monitoring: terminate if eyes not visible or face occluded for ~2s
            const occlusionLabels = new Set([
              'eyes_closed', 'eyes_not_visible', 'no_eyes', 'eye_not_detected',
              'face_occluded', 'face_covered', 'mask', 'sunglasses'
            ]);
            const hasOcclusion = labels.some(l => occlusionLabels.has(l));
            if (hasOcclusion) {
              consecutiveOcclusionRef.current += 1;
            } else {
              consecutiveOcclusionRef.current = 0;
            }
            const occlusionSeconds = consecutiveOcclusionRef.current * (analysisIntervalMs / 1000);
            if (occlusionSeconds >= 2) {
              onViolation?.({ type: 'face_or_eyes_occluded', message: 'Face or eyes are occluded/not visible', details: { labels, seconds: occlusionSeconds } });
              return;
            }
          } catch (e) {
            // Swallow analysis errors to avoid interrupting camera; optionally could notify as warning
          } finally {
            analysisInFlight = false;
          }
        };

        const startAnalysisLoop = () => {
          analysisTimerRef.current = window.setInterval(captureAndAnalyze, analysisIntervalMs);
        };
        startAnalysisLoop();

        // Monitor for device disconnection
        stream.getTracks().forEach(track => {
          track.addEventListener('ended', () => {
            if (track.kind === 'video') {
              setCameraConnected(false);
              setIsRecording(false);
              statusRef.current.camera = "disconnected";
              if (onStatusChange) {
                onStatusChange({ camera: "disconnected", mic: statusRef.current.mic });
              }
            } else if (track.kind === 'audio') {
              setMicConnected(false);
              statusRef.current.mic = "disconnected";
              if (onStatusChange) {
                onStatusChange({ camera: statusRef.current.camera, mic: "disconnected" });
              }
            }
          });
        });

      } catch (err) {
        console.error("Error accessing camera/mic:", err);
        setCameraConnected(false);
        setMicConnected(false);
        statusRef.current.camera = "disconnected";
        statusRef.current.mic = "disconnected";
        if (onStatusChange) {
          onStatusChange({ camera: "disconnected", mic: "disconnected" });
        }
        alert("Camera and microphone access is required for exam monitoring.");
      }
    };

    startCamera();

    // Cleanup function
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (audioContext) {
        audioContext.close();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (analysisTimerRef.current) {
        clearInterval(analysisTimerRef.current);
      }
    };
  }, []); // Remove dependencies to prevent re-initialization

  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        muted
        className="w-full h-auto border border-gray-300 rounded"
      />
      
      {/* Status indicators */}
      <div className="absolute bottom-2 left-2 flex space-x-2">
        {/* Camera indicator */}
        <div className="flex items-center space-x-1 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
          <div className={`w-2 h-2 rounded-full ${cameraConnected ? 'bg-red-500' : 'bg-gray-400'}`}></div>
          <span>{cameraConnected ? 'CAM' : 'CAM OFF'}</span>
        </div>
        
        {/* Microphone indicator */}
        <div className="flex items-center space-x-1 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${micConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            {micConnected && (
              <div className="flex space-x-0.5">
                {[1, 2, 3].map((bar) => (
                  <div
                    key={bar}
                    className={`w-0.5 bg-white rounded-full transition-all duration-100 ${
                      micLevel > bar * 20 ? 'h-2' : 'h-1'
                    }`}
                  ></div>
                ))}
              </div>
            )}
          </div>
          <span>{micConnected ? 'MIC' : 'MIC OFF'}</span>
        </div>
      </div>
      
      {/* Recording indicator */}
      <div className="absolute top-2 left-2 flex items-center space-x-1 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <span>LIVE</span>
      </div>
    </div>
  );
};

export default CameraFeed;
