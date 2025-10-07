const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface TestCase {
  input: string;
  expected: string;
}

export interface CodeExecutionRequest {
  code: string;
  language: string;
  test_cases: TestCase[];
  problem_id: number;
  timeout?: number;
}

export interface TestResult {
  testCase: number;
  input: string;
  expected: string;
  output: string | null;
  passed: boolean;
  error?: string;
}

export interface CodeExecutionResponse {
  success: boolean;
  error?: string;
  test_results: TestResult[];
  execution_time: number;
}

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
      (headers as Record<string, string>).Authorization = `Bearer ${this.token}`;
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

  // Code execution methods
  async executeCode(request: CodeExecutionRequest): Promise<CodeExecutionResponse> {
    return this.request('/api/code-execution/execute', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getSupportedLanguages() {
    return this.request('/api/code-execution/languages');
  }

  async checkCodeExecutionHealth() {
    return this.request('/api/code-execution/health');
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
