// Python Executor using Pyodide
export class PythonExecutor {
  private pyodide: any = null;
  private loaded: boolean = false;

  async initialize(): Promise<void> {
    if (this.loaded) return;

    try {
      // Load Pyodide from CDN
      if (typeof window !== 'undefined') {
        console.log('Python Executor: Starting Pyodide initialization...');
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
        script.async = true;
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        
        console.log('Python Executor: Pyodide script loaded, initializing...');
        
        // Initialize Pyodide
        this.pyodide = await (window as any).loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
        });
        
        this.loaded = true;
        console.log('Python Executor: Pyodide loaded and initialized successfully');
        
        // Test Python execution
        try {
          const testResult = this.pyodide.runPython('print("Python is working!")');
          console.log('Python Executor: Test execution successful:', testResult);
        } catch (testError) {
          console.warn('Python Executor: Test execution failed:', testError);
        }
      }
    } catch (error) {
      console.error('Python Executor: Failed to load Pyodide:', error);
      this.loaded = false;
    }
  }

  async executePython(code: string, testCases: any[], problemId: number): Promise<any> {
    await this.initialize();

    if (!this.loaded || !this.pyodide) {
      console.error('Python Executor: Pyodide not loaded, cannot execute Python code');
      throw new Error('Python environment not available - Pyodide failed to load');
    }

    console.log('Python Executor: Executing Python code with Pyodide');
    console.log('Python code:', code);

    const testResults: any[] = [];

    try {
      // Load the Python code into Pyodide
      console.log('Python Executor: Loading Python code into Pyodide...');
      this.pyodide.runPython(code);
      console.log('Python Executor: Python code loaded successfully');

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        
        try {
          let output: string;
          
          if (problemId === 1) {
            // Two Sum problem
            const parts = testCase.input.split('], ');
            const nums = JSON.parse(parts[0] + ']');
            const target = parseInt(parts[1]);
            
            // Set variables in Python environment
            this.pyodide.globals.set('nums', nums);
            this.pyodide.globals.set('target', target);
            
            // Execute the function
            const result = this.pyodide.runPython('two_sum(nums, target)');
            output = JSON.stringify(result);
            
          } else if (problemId === 2) {
            // Reverse String problem
            const s = JSON.parse(testCase.input);
            
            // Set variables in Python environment
            this.pyodide.globals.set('s', s);
            
            // Execute the function
            this.pyodide.runPython('reverse_string(s)');
            const result = this.pyodide.globals.get('s');
            output = JSON.stringify(result);
            
          } else {
            // Generic Python execution
            const parsedInput = JSON.parse(testCase.input);
            this.pyodide.globals.set('input_data', parsedInput);
            
            // Try to find the function name
            const funcMatch = code.match(/def\s+(\w+)\s*\([^)]*\):/);
            if (funcMatch) {
              const funcName = funcMatch[1];
              const result = this.pyodide.runPython(`${funcName}(input_data)`);
              output = JSON.stringify(result);
            } else {
              throw new Error('Could not find function definition');
            }
          }

          const passed = output === testCase.expected;

          testResults.push({
            testCase: i + 1,
            input: testCase.input,
            expected: testCase.expected,
            output: output,
            passed: passed
          });

        } catch (error) {
          testResults.push({
            testCase: i + 1,
            input: testCase.input,
            expected: testCase.expected,
            output: null,
            passed: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return {
        success: true,
        test_results: testResults,
        execution_time: 0
      };

    } catch (error) {
      throw new Error(`Python execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isLoaded(): boolean {
    return this.loaded && this.pyodide !== null;
  }

  async waitForLoad(): Promise<boolean> {
    // Wait up to 10 seconds for Pyodide to load
    for (let i = 0; i < 100; i++) {
      if (this.isLoaded()) return true;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  }

  async testPythonExecution(): Promise<boolean> {
    try {
      await this.initialize();
      if (!this.isLoaded()) return false;
      
      // Test simple Python execution
      const result = this.pyodide.runPython('2 + 2');
      console.log('Python Executor: Test result (2 + 2):', result);
      return result === 4;
    } catch (error) {
      console.error('Python Executor: Test execution failed:', error);
      return false;
    }
  }
}

export const pythonExecutor = new PythonExecutor();
