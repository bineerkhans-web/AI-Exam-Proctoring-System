"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import CameraFeed from "../../components/CameraFeed";
import { apiClient } from "../../lib/api";
import { clientCodeExecutionService } from "../../lib/clientCodeExecution";

const problems = [
  {
    id: 1,
    title: "Problem 1: Two Sum",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
    example: "Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].",
    testCases: [
      { input: "[2,7,11,15], 9", expected: "[0,1]" },
      { input: "[3,2,4], 6", expected: "[1,2]" },
      { input: "[3,3], 6", expected: "[0,1]" }
    ]
  },
  {
    id: 2,
    title: "Problem 2: Reverse String",
    description: "Write a function that reverses a string. The input string is given as an array of characters s. You must do this by modifying the input array in-place with O(1) extra memory.",
    example: "Input: s = [\"h\",\"e\",\"l\",\"l\",\"o\"]\nOutput: [\"o\",\"l\",\"l\",\"e\",\"h\"]",
    testCases: [
      { input: "[\"h\",\"e\",\"l\",\"l\",\"o\"]", expected: "[\"o\",\"l\",\"l\",\"e\",\"h\"]" },
      { input: "[\"H\",\"a\",\"n\",\"n\",\"a\",\"h\"]", expected: "[\"h\",\"a\",\"n\",\"n\",\"a\",\"H\"]" }
    ]
  }
];

const languages = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" }
];

const defaultCode = {
  javascript: {
    1: "function twoSum(nums, target) {\n  // TODO: implement\n}",
    2: "function reverseString(s) {\n  // TODO: implement\n}"
  },
  python: {
    1: "def two_sum(nums, target):\n    pass",
    2: "def reverse_string(s):\n    pass"
  },
  java: {
    1: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // TODO: implement\n        return new int[]{};\n    }\n}",
    2: "class Solution {\n    public void reverseString(char[] s) {\n        // TODO: implement\n    }\n}"
  },
  cpp: {
    1: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // TODO: implement\n        return {};\n    }\n};",
    2: "class Solution {\npublic:\n    void reverseString(vector<char>& s) {\n        // TODO: implement\n    }\n};"
  },
  c: {
    1: "int* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n    // TODO: implement\n    *returnSize = 0;\n    return NULL;\n}",
    2: "void reverseString(char* s, int sSize) {\n    // TODO: implement\n}"
  }
};

function ExamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const name = searchParams.get("name");
  const email = searchParams.get("email");
  
  const [currentProblem, setCurrentProblem] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [code, setCode] = useState(defaultCode.javascript[1]);
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour in seconds
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("connected");
  const [micStatus, setMicStatus] = useState("connected");
  const [tabSwitches, setTabSwitches] = useState(0);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [examTerminated, setExamTerminated] = useState(false);
  const instanceIdRef = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const terminateExam = (reason) => {
    if (examTerminated) return;
    setExamTerminated(true);
    addAlert({
      type: "exam_terminated",
      message: `Exam terminated: ${reason}`,
      severity: "error",
      timestamp: new Date()
    });
    alert(`Exam terminated: ${reason}`);
    router.push("/");
  };

  useEffect(() => {
    if (!name) {
      router.push("/");
    }
  }, [name]);

  // Check backend availability on component mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await apiClient.checkCodeExecutionHealth();
        setBackendAvailable(true);
        console.log("Backend code execution service is available");
      } catch (error) {
        setBackendAvailable(false);
        console.log("Backend code execution service is not available, falling back to client-side execution");
      }
    };
    
    checkBackend();
  }, []);

  // Test Python execution on component mount
  useEffect(() => {
    const testPython = async () => {
      try {
        const { pythonExecutor } = await import('../../lib/pythonExecutor');
        const isWorking = await pythonExecutor.testPythonExecution();
        console.log('Python execution test result:', isWorking);
      } catch (error) {
        console.log('Python execution test failed:', error);
      }
    };
    
    testPython();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up - submit exam
          alert("Time's up! Your exam has been submitted.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (problems && problems[currentProblem]) {
      const problemId = problems[currentProblem].id;
      if (defaultCode[selectedLanguage] && defaultCode[selectedLanguage][problemId]) {
        setCode(defaultCode[selectedLanguage][problemId]);
      }
    }
  }, [selectedLanguage, currentProblem]);

  // Reset editor to starter stub on mount/start
  useEffect(() => {
    if (problems && problems[currentProblem]) {
      const problemId = problems[currentProblem].id;
      if (defaultCode[selectedLanguage] && defaultCode[selectedLanguage][problemId]) {
        setCode(defaultCode[selectedLanguage][problemId]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Proctoring detection effects
  useEffect(() => {
    // Tab switching detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const newSwitchCount = tabSwitches + 1;
        setTabSwitches(newSwitchCount);
        addAlert({
          type: "tab_switch",
          message: `Tab switch detected! (${newSwitchCount} times)`,
          severity: "warning",
          timestamp: new Date()
        });
        // Terminate immediately on leaving the tab
        terminateExam("Left the exam tab (visibility change)");
      }
    };

    // Page focus/blur detection
    const handleFocus = () => {
      addAlert({
        type: "focus",
        message: "Exam tab focused",
        severity: "info",
        timestamp: new Date()
      });
    };

    const handleBlur = () => {
      addAlert({
        type: "blur",
        message: "Exam tab lost focus - potential cheating attempt!",
        severity: "error",
        timestamp: new Date()
      });
      terminateExam("Window lost focus");
    };

    // Fullscreen change detection
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        addAlert({
          type: "fullscreen_exit",
          message: "Fullscreen mode exited - potential cheating attempt!",
          severity: "warning",
          timestamp: new Date()
        });
      }
    };

    // Keyboard shortcuts detection
    const handleKeyDown = (e) => {
      // Detect common cheating shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === 't' || e.key === 'n' || e.key === 'w')) {
        addAlert({
          type: "shortcut",
          message: `Potentially suspicious shortcut detected: ${e.ctrlKey ? 'Ctrl' : 'Cmd'}+${e.key.toUpperCase()}`,
          severity: "warning",
          timestamp: new Date()
        });
        terminateExam("Prohibited shortcut used");
      }
      
      // Detect F12 (developer tools)
      if (e.key === 'F12') {
        addAlert({
          type: "dev_tools",
          message: "Developer tools access attempt detected!",
          severity: "error",
          timestamp: new Date()
        });
        terminateExam("Developer tools opened");
      }

      // Block copy/cut/paste via keyboard
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'v' || e.key.toLowerCase() === 'x')) {
        e.preventDefault();
        addAlert({
          type: "clipboard_block",
          message: "Copy/Cut/Paste is not allowed during the exam.",
          severity: "warning",
          timestamp: new Date()
        });
        terminateExam("Copy/Cut/Paste attempted");
      }
    };

    // Right-click detection
    const handleContextMenu = (e) => {
      e.preventDefault();
      addAlert({
        type: "right_click",
        message: "Right-click disabled - context menu access attempted",
        severity: "warning",
        timestamp: new Date()
      });
      terminateExam("Right-click/context menu attempt");
    };

    // Copy/Cut/Paste blocking via events
    const handleCopy = (e) => {
      e.preventDefault();
      addAlert({
        type: "copy_block",
        message: "Copy is not allowed during the exam.",
        severity: "warning",
        timestamp: new Date()
      });
      terminateExam("Copy attempted");
    };
    const handleCut = (e) => {
      e.preventDefault();
      addAlert({
        type: "cut_block",
        message: "Cut is not allowed during the exam.",
        severity: "warning",
        timestamp: new Date()
      });
      terminateExam("Cut attempted");
    };
    const handlePaste = (e) => {
      e.preventDefault();
      addAlert({
        type: "paste_block",
        message: "Paste is not allowed during the exam.",
        severity: "warning",
        timestamp: new Date()
      });
      terminateExam("Paste attempted");
    };

    // Tab close detection
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      // Some browsers require returnValue to show a prompt; we terminate regardless
      e.returnValue = '';
      terminateExam("Tab/window closed");
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [tabSwitches, examTerminated]);

  // Detect multiple tabs/windows and terminate
  useEffect(() => {
    if (examTerminated) return;

    const KEY = 'exam_active_instance_id';
    const myId = instanceIdRef.current;

    // LocalStorage lock check
    const existing = localStorage.getItem(KEY);
    if (existing && existing !== myId) {
      terminateExam('Multiple exam tabs detected (storage lock)');
      return;
    }
    localStorage.setItem(KEY, myId);

    const onStorage = (e) => {
      if (e.key === KEY && e.newValue && e.newValue !== myId) {
        terminateExam('Multiple exam tabs detected');
      }
    };
    window.addEventListener('storage', onStorage);

    // BroadcastChannel presence
    let bc;
    let presenceTimeoutId;
    try {
      bc = new BroadcastChannel('exam-proctoring');
      bc.onmessage = (msg) => {
        const data = msg?.data;
        if (data?.type === 'presence' && data?.id && data.id !== myId) {
          terminateExam('Multiple exam tabs detected (broadcast)');
        }
      };
      // Announce presence (slight delay to avoid race on first paint)
      presenceTimeoutId = setTimeout(() => {
        try {
          bc?.postMessage({ type: 'presence', id: myId });
        } catch (e) {
          // Channel might be closed during navigation/unmount; safely ignore
        }
      }, 100);
    } catch (err) {
      // Ignore BroadcastChannel unsupported errors
    }

    return () => {
      // Cleanup lock only if still owner
      if (localStorage.getItem(KEY) === myId) {
        localStorage.removeItem(KEY);
      }
      window.removeEventListener('storage', onStorage);
      if (presenceTimeoutId) {
        clearTimeout(presenceTimeoutId);
      }
      try { bc && bc.close(); } catch {}
    };
  }, [examTerminated]);

  const addAlert = (alert) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const alertWithId = { ...alert, id };
    setAlerts(prev => [...prev, alertWithId]);
    
    // Auto-remove alert after 5 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 5000);

    // Termination on high severity detections (e.g., multiple faces, recording)
    const immediateStopTypes = new Set(["multiple_faces", "phone_detected", "recording_detected"]);
    if (immediateStopTypes.has(alert.type)) {
      alertWithId.severity = alertWithId.severity || 'error';
      setTimeout(() => {
        // Delay slightly to allow the alert to render
        window.dispatchEvent(new Event('blur'));
      }, 0);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        addAlert({
          type: "fullscreen_enter",
          message: "Entered fullscreen mode",
          severity: "info",
          timestamp: new Date()
        });
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
      addAlert({
        type: "fullscreen_error",
        message: "Could not enter fullscreen mode",
        severity: "warning",
        timestamp: new Date()
      });
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = () => {
    if (window.confirm("Are you sure you want to submit your exam? This action cannot be undone.")) {
      alert("Exam submitted successfully!");
      router.push("/");
    }
  };

  const executeCode = async () => {
    setIsRunning(true);
    setOutput("🚀 Running tests...\n");
    console.log("Starting code execution...");

    // Add a small delay to see the initial output
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const problem = problems[currentProblem];
      
      if (backendAvailable) {
        // Use backend execution for all languages
        await executeCodeWithBackend(problem);
      } else {
        // Use client-side execution for all languages
        await executeCodeClientSide(problem);
      }

    } catch (error) {
      setOutput(prev => prev + `\n❌ Execution Error: ${error.message}\n`);
    }

    setIsRunning(false);
  };

  const executeCodeWithBackend = async (problem) => {
    try {
      const request = {
        code: code,
        language: selectedLanguage,
        test_cases: problem.testCases.map(tc => ({
          input: tc.input,
          expected: tc.expected
        })),
        problem_id: problem.id,
        timeout: 10
      };

      setOutput(prev => prev + `\n🌐 Executing ${selectedLanguage.toUpperCase()} code on backend...\n`);
      
      const response = await apiClient.executeCode(request);
      
      if (response.success) {
        const testResults = response.test_results;
        
        for (let i = 0; i < testResults.length; i++) {
          const result = testResults[i];
          setOutput(prev => prev + 
            `\n📝 Test Case ${result.testCase}: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n` +
            `   Input: ${result.input}\n` +
            `   Expected: ${result.expected}\n` +
            `   Got: ${result.output || 'undefined'}\n` +
            (result.error ? `   Error: ${result.error}\n` : '') +
            `   ---\n`
          );
        }

        const passedTests = testResults.filter(r => r.passed).length;
        setOutput(prev => prev + 
          `\n📊 SUMMARY:\n` +
          `   Passed: ${passedTests}/${testResults.length} tests\n` +
          `   Execution Time: ${response.execution_time.toFixed(3)}s\n` +
          `   ${passedTests === testResults.length ? '🎉 All tests passed!' : '❌ Some tests failed.'}\n`
        );
      } else {
        setOutput(prev => prev + 
          `\n❌ Backend Execution Failed:\n` +
          `   Error: ${response.error || 'Unknown error'}\n`
        );
      }
    } catch (error) {
      setOutput(prev => prev + 
        `\n❌ Backend Communication Error:\n` +
        `   Error: ${error.message}\n` +
        `   Falling back to JavaScript-only execution...\n\n`
      );
      
      // Fallback to JavaScript execution
      await executeCodeFallback(problem);
    }
  };

  const executeCodeClientSide = async (problem) => {
    try {
      const request = {
        code: code,
        language: selectedLanguage,
        test_cases: problem.testCases.map(tc => ({
          input: tc.input,
          expected: tc.expected
        })),
        problem_id: problem.id,
        timeout: 10
      };

      setOutput(prev => prev + `\n💻 Executing ${selectedLanguage.toUpperCase()} code client-side...\n`);
      
      // Add language-specific execution info
      if (selectedLanguage === 'python') {
        setOutput(prev => prev + `🐍 Using Python native execution (Pyodide)...\n`);
      } else if (selectedLanguage === 'java') {
        setOutput(prev => prev + `☕ Using Java runtime execution...\n`);
      } else if (selectedLanguage === 'cpp') {
        setOutput(prev => prev + `⚡ Using C++ runtime execution...\n`);
      } else if (selectedLanguage === 'c') {
        setOutput(prev => prev + `🔧 Using C runtime execution...\n`);
      }
      
      const response = await clientCodeExecutionService.executeCode(
        request.code,
        request.language,
        request.test_cases,
        request.problem_id,
        request.timeout
      );
      
      if (response.success) {
        const testResults = response.test_results;
        
        for (let i = 0; i < testResults.length; i++) {
          const result = testResults[i];
          setOutput(prev => prev + 
            `\n📝 Test Case ${result.testCase}: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n` +
            `   Input: ${result.input}\n` +
            `   Expected: ${result.expected}\n` +
            `   Got: ${result.output || 'undefined'}\n` +
            (result.error ? `   Error: ${result.error}\n` : '') +
            `   ---\n`
          );
        }

        const passedTests = testResults.filter(r => r.passed).length;
        setOutput(prev => prev + 
          `\n📊 SUMMARY:\n` +
          `   Passed: ${passedTests}/${testResults.length} tests\n` +
          `   Execution Time: ${response.execution_time.toFixed(3)}s\n` +
          `   ${passedTests === testResults.length ? '🎉 All tests passed!' : '❌ Some tests failed.'}\n`
        );
      } else {
        setOutput(prev => prev + 
          `\n❌ Client-side Execution Failed:\n` +
          `   Error: ${response.error || 'Unknown error'}\n`
        );
      }
    } catch (error) {
      setOutput(prev => prev + 
        `\n❌ Client-side Execution Error:\n` +
        `   Error: ${error.message}\n`
      );
    }
  };

  const runJavaScriptTest = async (code, testCase, problemId) => {
    try {
      // Create a sandboxed environment
      const func = new Function(`
        ${code}
        
        // Test execution based on problem
        if (${problemId} === 1) {
          // Two Sum problem
          const input = ${testCase.input};
          const nums = input[0];
          const target = input[1];
          const result = twoSum(nums, target);
          return JSON.stringify(result);
        } else if (${problemId} === 2) {
          // Reverse String problem
          const input = ${testCase.input};
          const s = [...input]; // Convert string to array
          reverseString(s);
          return JSON.stringify(s);
        }
      `);

      const output = func();
      return { output, error: null };
    } catch (error) {
      return { output: null, error: error.message };
    }
  };

  const runPythonTest = async (code, testCase, problemId) => {
    // This function is no longer used when backend is available
    return { 
      output: null, 
      error: "Python execution requires a backend server. Please start the backend server." 
    };
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="grid grid-cols-3 items-center p-4">
          {/* Left spacer to avoid overlap with fixed camera */}
          <div className="hidden sm:block"></div>

          {/* Centered candidate info */}
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">Coding Exam</h1>
            <p className="text-gray-900">
              Candidate: <span className="font-semibold">{name}</span> | {email}
            </p>
          </div>

          {/* Right-side controls */}
          <div className="flex items-center justify-end space-x-4">
            <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
              Time Left: {formatTime(timeLeft)}
            </div>
            <button
              onClick={toggleFullscreen}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 mr-2"
            >
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
            <button
              onClick={handleSubmit}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Submit Exam
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Left Panel - Problems */}
        <div className="w-1/2 bg-white border-r overflow-y-auto">
          <div className="p-4 pt-20 select-none"> {/* Added top padding to account for camera; prevent text selection */}
            {/* Problem Tabs */}
            <div className="flex mb-4 border-b border-gray-300">
              {problems.map((problem, index) => (
                <button
                  key={problem.id}
                  onClick={() => setCurrentProblem(index)}
                  className={`px-4 py-2 font-semibold ${
                    currentProblem === index
                      ? "border-b-2 border-gray-700 text-gray-900"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  {problem.title}
                </button>
              ))}
            </div>

            {/* Problem Content */}
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-3">
                {problems[currentProblem].title}
              </h2>
              <p className="text-gray-700 mb-4 whitespace-pre-line leading-relaxed">
                {problems[currentProblem].description}
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-4 border-l-4 border-gray-700">
                <h4 className="font-semibold mb-2 text-gray-900">Example:</h4>
                <pre className="text-sm text-gray-900 whitespace-pre-line bg-white p-3 rounded border">
                  {problems[currentProblem].example}
                </pre>
              </div>

              <div>
                <h4 className="font-semibold mb-3 text-gray-900">Test Cases:</h4>
                <div className="space-y-3">
                  {problems[currentProblem].testCases.map((testCase, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg border">
                      <div className="text-sm mb-1">
                        <span className="font-medium text-gray-800">Input:</span> 
                        <code className="ml-2 bg-white px-2 py-1 rounded text-xs text-gray-900">{testCase.input}</code>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-800">Expected:</span> 
                        <code className="ml-2 bg-white px-2 py-1 rounded text-xs text-gray-900">{testCase.expected}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="w-1/2 flex flex-col">
          {/* Language Selector */}
          <div className="bg-white border-b p-3">
            <div className="flex items-center space-x-4">
              <label className="font-semibold text-gray-900">Language:</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="border border-gray-600 text-gray-900 rounded px-3 py-1 bg-white"
              >
                {languages.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
              <button 
                onClick={executeCode}
                disabled={isRunning}
                className={`px-4 py-1 rounded text-white ${
                  isRunning 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isRunning ? 'Running...' : `Run ${selectedLanguage.toUpperCase()}`}
              </button>
              {/* Runtime hint text removed per request */}
              <div className="ml-auto">
                <button
                  onClick={() => {
                    const editor = document.querySelector('.code-editor');
                    if (editor) {
                      editor.requestFullscreen();
                    }
                  }}
                  className="bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-800 text-sm"
                >
                  Fullscreen Editor
                </button>
              </div>
            </div>
          </div>

          {/* Resizable Code Editor */}
          <div className="flex-1 bg-gray-900 text-white relative">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="code-editor w-full h-full p-4 bg-gray-900 text-white font-mono text-sm resize-none focus:outline-none"
              placeholder="Write your code here..."
              spellCheck={false}
              style={{ minHeight: '200px' }}
            />
            {/* Resize handle */}
            <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-700 hover:bg-gray-600 opacity-50 hover:opacity-100 transition-opacity"></div>
          </div>

          {/* Resizable Output Panel */}
          <div className="bg-white border-t h-48 p-4 relative" style={{ minHeight: '120px', maxHeight: '400px' }}>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-800">Test Results:</h4>
              {isRunning && (
                <div className="flex items-center text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm font-medium">Running...</span>
                </div>
              )}
            </div>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono h-32 overflow-y-auto whitespace-pre-wrap border border-gray-300">
              {output || "💡 Click 'Run Code' to test your solution against the test cases..."}
            </div>
            {output && (
              <div className="mt-2 text-xs text-gray-500">
                Output length: {output.length} characters
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Camera Feed - Top Left */}
      <div className="fixed top-4 left-4 w-40 shadow-lg rounded overflow-hidden border-2 border-red-400 z-50">
        <CameraFeed 
          onStatusChange={(status) => {
            setCameraStatus(status.camera);
            setMicStatus(status.mic);
            
            if (status.camera === "disconnected") {
              addAlert({
                type: "camera_disconnected",
                message: "Camera disconnected! Please reconnect immediately.",
                severity: "error",
                timestamp: new Date()
              });
            }
            
            if (status.mic === "disconnected") {
              addAlert({
                type: "mic_disconnected",
                message: "Microphone disconnected! Please reconnect immediately.",
                severity: "error",
                timestamp: new Date()
              });
            }
          }}
          onViolation={(v) => {
            addAlert({
              type: v.type,
              message: v.message,
              severity: 'error',
              timestamp: new Date(),
            });
            terminateExam(v.message);
          }}
        />
      </div>

      {/* Alert System */}
      <div className="fixed top-4 right-4 w-80 z-50 space-y-2">
        {alerts.map((alert, index) => (
          <div
            key={alert.id || `${alert.type}-${alert.timestamp?.getTime?.() ?? 0}-${index}`}
            className={`p-3 rounded-lg shadow-lg border-l-4 animate-slide-in ${
              alert.severity === 'error' 
                ? 'bg-red-100 border-red-500 text-red-800'
                : alert.severity === 'warning'
                ? 'bg-yellow-100 border-yellow-500 text-yellow-800'
                : 'bg-blue-100 border-blue-500 text-blue-800'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-sm">
                  {alert.severity === 'error' ? '🚨 VIOLATION' : 
                   alert.severity === 'warning' ? '⚠️ WARNING' : 'ℹ️ INFO'}
                </div>
                <div className="text-xs mt-1">{alert.message}</div>
                <div className="text-xs mt-1 opacity-75">
                  {alert.timestamp.toLocaleTimeString()}
                </div>
              </div>
              <button
                onClick={() => setAlerts(prev => prev.filter((a) => (
                  alert.id ? a.id !== alert.id : a.timestamp !== alert.timestamp
                )))}
                className="text-gray-500 hover:text-gray-700 ml-2"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Proctoring Status Bar removed per request */}
    </div>
  );
}

export default function Exam() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading exam...</p>
      </div>
    </div>}>
      <ExamContent />
    </Suspense>
  );
}

