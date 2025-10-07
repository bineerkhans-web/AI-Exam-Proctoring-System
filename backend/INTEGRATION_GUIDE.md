# Frontend-Backend Integration Guide

This guide explains how to integrate the existing Next.js frontend with the new FastAPI backend.

## Backend Setup

1. **Start the backend services**:
   ```bash
   cd backend
   docker-compose up -d
   ```

2. **Or run manually**:
   ```bash
   cd backend
   pip install -r requirements.txt
   python scripts/init_db.py
   python main.py
   ```

## Frontend Integration

### 1. Update API Configuration

Create a new API configuration file in the frontend:

```typescript
// src/lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Authentication methods
  async registerCandidate(name: string, email: string) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email }),
    });
  }

  async loginCandidate(email: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async startExamSession(candidateId: number) {
    return this.request(`/api/auth/start-exam/${candidateId}`, {
      method: 'POST',
    });
  }

  // Monitoring methods
  async sendMonitoringData(data: any) {
    return this.request('/api/monitoring/data', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async reportSuspiciousActivity(activityType: string, confidence: number, details?: any) {
    return this.request('/api/monitoring/suspicious-activity', {
      method: 'POST',
      body: JSON.stringify({
        activity_type: activityType,
        confidence,
        details,
      }),
    });
  }

  // Submission methods
  async submitCode(problemId: number, language: string, code: string, output?: string, isFinal: boolean = false) {
    return this.request('/api/submissions/submit', {
      method: 'POST',
      body: JSON.stringify({
        problem_id: problemId,
        language,
        code,
        output,
        is_final: isFinal,
      }),
    });
  }

  async getSubmissions() {
    return this.request('/api/submissions/submissions');
  }

  async finalSubmitExam() {
    return this.request('/api/submissions/final-submit', {
      method: 'POST',
    });
  }

  // AI Monitoring methods
  async analyzeWithAI(imageData?: string, audioData?: string, analysisType: string = 'combined') {
    return this.request('/api/ai-monitoring/analyze', {
      method: 'POST',
      body: JSON.stringify({
        image_data: imageData,
        audio_data: audioData,
        analysis_type: analysisType,
      }),
    });
  }

  async getAIMonitoringResults() {
    return this.request('/api/ai-monitoring/results');
  }
}

export const apiClient = new ApiClient();
```

### 2. Update the Login Page

Modify `src/app/page.tsx` to use the backend API:

```typescript
// src/app/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../lib/api";

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Register or login candidate
      let candidate;
      try {
        candidate = await apiClient.registerCandidate(formData.name, formData.email);
      } catch (err) {
        // If registration fails, try login
        candidate = await apiClient.loginCandidate(formData.email);
      }

      // Start exam session
      const sessionData = await apiClient.startExamSession(candidate.id);
      
      // Store token and session info
      localStorage.setItem('exam_token', sessionData.access_token);
      localStorage.setItem('session_token', sessionData.session_token);
      localStorage.setItem('candidate_id', candidate.id.toString());
      
      // Set token for API client
      apiClient.setToken(sessionData.access_token);

      // Navigate to exam
      router.push(`/exam?name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}`);
    } catch (err) {
      setError("Failed to start exam session. Please try again.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ... existing UI ... */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {/* ... rest of the form ... */}
    </div>
  );
}
```

### 3. Update the Exam Page

Modify `src/app/exam/page.jsx` to integrate with backend monitoring:

```typescript
// src/app/exam/page.jsx
"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import CameraFeed from "../../components/CameraFeed";
import { apiClient } from "../../lib/api";

export default function Exam() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const name = searchParams.get("name");
  const email = searchParams.get("email");
  
  // ... existing state ...
  const [monitoringData, setMonitoringData] = useState({
    tabSwitches: 0,
    cameraStatus: "connected",
    micStatus: "connected",
  });

  // Initialize API client with token
  useEffect(() => {
    const token = localStorage.getItem('exam_token');
    if (token) {
      apiClient.setToken(token);
    }
  }, []);

  // Send monitoring data to backend
  useEffect(() => {
    const sendMonitoringData = async () => {
      try {
        await apiClient.sendMonitoringData({
          timestamp: new Date().toISOString(),
          tab_switches: monitoringData.tabSwitches,
          camera_status: monitoringData.cameraStatus,
          mic_status: monitoringData.micStatus,
          current_window: document.title,
          mouse_activity: true, // Implement mouse tracking
          keyboard_activity: true, // Implement keyboard tracking
        });
      } catch (error) {
        console.error("Failed to send monitoring data:", error);
      }
    };

    // Send monitoring data every 30 seconds
    const interval = setInterval(sendMonitoringData, 30000);
    return () => clearInterval(interval);
  }, [monitoringData]);

  // Handle camera/mic status changes
  const handleStatusChange = (status: { camera: string; mic: string }) => {
    setMonitoringData(prev => ({
      ...prev,
      cameraStatus: status.camera,
      micStatus: status.mic,
    }));
  };

  // Submit code to backend
  const handleSubmitCode = async (problemId: number, language: string, code: string, output: string) => {
    try {
      await apiClient.submitCode(problemId, language, code, output);
      setOutput(output);
    } catch (error) {
      console.error("Failed to submit code:", error);
    }
  };

  // Final submit exam
  const handleFinalSubmit = async () => {
    try {
      await apiClient.finalSubmitExam();
      alert("Exam submitted successfully!");
      router.push("/");
    } catch (error) {
      console.error("Failed to submit exam:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ... existing UI ... */}
      <CameraFeed onStatusChange={handleStatusChange} />
      {/* ... rest of the component ... */}
    </div>
  );
}
```

### 4. Enhanced Camera Feed Component

Update `src/components/CameraFeed.tsx` to capture frames for AI analysis:

```typescript
// src/components/CameraFeed.tsx
"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { apiClient } from "../lib/api";

interface CameraFeedProps {
  onStatusChange?: (status: { camera: string; mic: string }) => void;
  onFrameCapture?: (imageData: string) => void;
}

const CameraFeed = ({ onStatusChange, onFrameCapture }: CameraFeedProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // ... existing state ...

  // Capture frame for AI analysis
  const captureFrame = useCallback(() => {
    if (videoRef.current && canvasRef.current && onFrameCapture) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        onFrameCapture(imageData.split(',')[1]); // Remove data:image/jpeg;base64, prefix
      }
    }
  }, [onFrameCapture]);

  // Capture frames periodically for AI analysis
  useEffect(() => {
    if (isRecording && onFrameCapture) {
      const interval = setInterval(captureFrame, 5000); // Capture every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isRecording, captureFrame, onFrameCapture]);

  return (
    <div className="relative">
      <video ref={videoRef} autoPlay muted className="w-full h-auto border border-gray-300 rounded" />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {/* ... existing UI ... */}
    </div>
  );
};

export default CameraFeed;
```

### 5. Environment Variables

Create `.env.local` in the frontend root:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 6. Install Additional Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    // ... existing dependencies ...
    "axios": "^1.6.0"
  }
}
```

## Testing the Integration

1. **Start the backend**:
   ```bash
   cd backend
   docker-compose up -d
   ```

2. **Start the frontend**:
   ```bash
   npm run dev
   ```

3. **Test the flow**:
   - Register a candidate
   - Start an exam session
   - Monitor the backend logs for API calls
   - Check the database for stored data

## Key Features Integrated

- ✅ **Authentication**: Candidate registration and session management
- ✅ **Real-time Monitoring**: Tab switches, camera/mic status
- ✅ **Code Submissions**: Secure storage of code submissions
- ✅ **AI Monitoring**: Frame capture and analysis (ready for implementation)
- ✅ **Session Management**: Token-based authentication
- ✅ **Error Handling**: Proper error handling and user feedback

## Next Steps

1. **Implement AI Analysis**: Add frame capture and send to AI monitoring endpoint
2. **Add Audio Capture**: Implement audio recording for voice analysis
3. **Enhanced Monitoring**: Add mouse/keyboard activity tracking
4. **Admin Dashboard**: Create admin interface to monitor all sessions
5. **Real-time Updates**: Implement WebSocket for real-time notifications

This integration provides a solid foundation for a complete exam proctoring system with AI monitoring capabilities.
