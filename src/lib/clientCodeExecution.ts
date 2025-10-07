// Client-side code execution for all languages
// This allows the app to work without a backend server
// Uses proper language runtimes where possible

import { pythonExecutor } from './pythonExecutor';

export interface TestCase {
  input: string;
  expected: string;
}

export interface TestResult {
  testCase: number;
  input: string;
  expected: string;
  output: string | null;
  passed: boolean;
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  error?: string;
  test_results: TestResult[];
  execution_time: number;
}

class ClientCodeExecutionService {
  private pyodide: any = null;
  private pyodideLoaded: boolean = false;

  constructor() {
    this.initializePyodide();
  }

  private async initializePyodide() {
    try {
      // Load Pyodide from CDN for Python execution
      if (typeof window !== 'undefined') {
        // Load Pyodide from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
        script.async = true;
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        
        // Initialize Pyodide
        this.pyodide = await (window as any).loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
        });
        
        this.pyodideLoaded = true;
        console.log('Pyodide loaded successfully');
      }
    } catch (error) {
      console.warn('Pyodide failed to load, Python will use transpilation:', error);
      this.pyodideLoaded = false;
    }
  }

  async executeCode(
    code: string,
    language: string,
    testCases: TestCase[],
    problemId: number,
    timeout: number = 10
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      let result: ExecutionResult;

      switch (language) {
        case 'javascript':
          result = await this.executeJavaScript(code, testCases, problemId);
          break;
        case 'python':
          result = await this.executePython(code, testCases, problemId);
          break;
        case 'java':
          result = await this.executeJava(code, testCases, problemId);
          break;
        case 'cpp':
          result = await this.executeCpp(code, testCases, problemId);
          break;
        case 'c':
          result = await this.executeC(code, testCases, problemId);
          break;
        default:
          result = {
            success: false,
            error: `Language ${language} not supported`,
            test_results: [],
            execution_time: 0
          };
      }

      result.execution_time = (Date.now() - startTime) / 1000;
      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        test_results: [],
        execution_time: (Date.now() - startTime) / 1000
      };
    }
  }

  private async executeJavaScript(code: string, testCases: TestCase[], problemId: number): Promise<ExecutionResult> {
    const testResults: TestResult[] = [];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      try {
        // Create a sandboxed execution environment
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
            const s = [...input];
            reverseString(s);
            return JSON.stringify(s);
          }
        `);

        const output = func();
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
  }

  private async executePython(code: string, testCases: TestCase[], problemId: number): Promise<ExecutionResult> {
    console.log('ClientCodeExecution: Starting Python execution');
    
    // Try to use the dedicated Python executor first
    try {
      console.log('ClientCodeExecution: Waiting for Python executor to be ready...');
      const isReady = await pythonExecutor.waitForLoad();
      
      if (isReady) {
        console.log('ClientCodeExecution: Python executor is ready, executing...');
        const result = await pythonExecutor.executePython(code, testCases, problemId);
        console.log('ClientCodeExecution: Python executor succeeded');
        return result;
      } else {
        console.log('ClientCodeExecution: Python executor not ready after timeout');
        throw new Error('Python executor not ready');
      }
    } catch (error) {
      console.error('ClientCodeExecution: Python executor failed:', error);
      console.log('ClientCodeExecution: Falling back to transpilation');
    }

    // Fallback to transpilation if Python executor is not available
    console.log('ClientCodeExecution: Using transpilation fallback for Python');
    const testResults: TestResult[] = [];
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      try {
        let output: string;
        
        if (problemId === 1) {
          output = this.executeTwoSumPython(code, testCase.input);
        } else if (problemId === 2) {
          output = this.executeReverseStringPython(code, testCase.input);
        } else {
          output = this.executeGenericPython(code, testCase.input, problemId);
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
  }

  private async waitForPyodide(): Promise<void> {
    if (this.pyodideLoaded) return;
    
    // Wait up to 5 seconds for Pyodide to load
    for (let i = 0; i < 50; i++) {
      if (this.pyodideLoaded) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async executePythonWithPyodide(code: string, testCases: TestCase[], problemId: number): Promise<ExecutionResult> {
    const testResults: TestResult[] = [];

    try {
      // Load the Python code into Pyodide
      this.pyodide.runPython(code);

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

  private executeTwoSumPython(code: string, input: string): string {
    try {
      // Parse input like "[2,7,11,15], 9"
      const parts = input.split('], ');
      const nums = JSON.parse(parts[0] + ']');
      const target = parseInt(parts[1]);

      // Extract the function body from Python code
      const funcMatch = code.match(/def\s+two_sum\s*\([^)]*\):\s*([\s\S]*)/);
      if (!funcMatch) {
        throw new Error('Could not find two_sum function definition');
      }

      const functionBody = funcMatch[1].trim();
      
      // Convert Python code to JavaScript manually for better control
      let jsCode = this.convertPythonToJS(functionBody);
      
      // Create the complete JavaScript function
      const completeJsCode = `function two_sum(nums, target) {
        ${jsCode}
      }`;

      // Debug: Log the transpiled JavaScript
      console.log('Transpiled JavaScript:', completeJsCode);

      // Create and execute the JavaScript function
      const jsFunc = new Function('nums', 'target', `
        ${completeJsCode}
        return two_sum(nums, target);
      `);

      const result = jsFunc(nums, target);
      return JSON.stringify(result);

    } catch (error) {
      throw new Error(`Python execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private convertPythonToJS(pythonCode: string): string {
    const lines = pythonCode.split('\n');
    let jsLines: string[] = [];
    let indentLevel = 0;
    
    for (let line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue; // Skip empty lines and comments
      }
      
      const currentIndent = line.length - line.trimStart().length;
      const currentLevel = Math.floor(currentIndent / 4);
      
      // Handle indentation changes
      if (currentLevel < indentLevel) {
        for (let i = indentLevel; i > currentLevel; i--) {
          jsLines.push('  '.repeat(i - 1) + '}');
        }
      }
      
      indentLevel = currentLevel;
      
      // Convert Python syntax to JavaScript
      let jsLine = this.convertPythonLine(trimmedLine);
      
      // Add proper indentation
      jsLine = '  '.repeat(currentLevel) + jsLine;
      jsLines.push(jsLine);
    }
    
    // Close any remaining braces
    for (let i = indentLevel; i > 0; i--) {
      jsLines.push('  '.repeat(i - 1) + '}');
    }
    
    return jsLines.join('\n');
  }

  private convertPythonLine(line: string): string {
    return line
      // Handle variable assignments
      .replace(/^(\w+)\s*=\s*\{\}$/, 'let $1 = {}')
      .replace(/^(\w+)\s*=\s*(.+)$/, 'let $1 = $2')
      // Handle for loops with enumerate
      .replace(/^for\s+(\w+),\s*(\w+)\s+in\s+enumerate\((\w+)\):$/, 'for (let $1 = 0; $1 < $3.length; $1++) { let $2 = $3[$1];')
      // Handle for loops with range
      .replace(/^for\s+(\w+)\s+in\s+range\(len\((\w+)\)\):$/, 'for (let $1 = 0; $1 < $2.length; $1++) {')
      .replace(/^for\s+(\w+)\s+in\s+range\((\d+)\):$/, 'for (let $1 = 0; $1 < $2; $1++) {')
      .replace(/^for\s+(\w+)\s+in\s+range\((\d+),\s*(\d+)\):$/, 'for (let $1 = $2; $1 < $3; $1++) {')
      // Handle if statements
      .replace(/^if\s+(.+):$/, 'if ($1) {')
      .replace(/^elif\s+(.+):$/, '} else if ($1) {')
      .replace(/^else:$/, '} else {')
      // Handle return statements
      .replace(/^return\s+\[([^\]]*)\]$/, 'return [$1]')
      .replace(/^return\s+\[\]$/, 'return []')
      .replace(/^return\s+None$/, 'return null')
      // Handle dictionary operations
      .replace(/(\w+)\[([^\]]+)\]\s*=\s*(.+)/, '$1[$2] = $3')
      .replace(/(\w+)\s+in\s+(\w+)/, '$2.hasOwnProperty($1)')
      // Handle list operations
      .replace(/len\((\w+)\)/g, '$1.length')
      .replace(/(\w+)\.append\(([^)]+)\)/g, '$1.push($2)')
      // Handle logical operators
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||')
      .replace(/\bnot\b/g, '!')
      // Handle comparisons
      .replace(/==/g, '===')
      .replace(/!=/g, '!==')
      // Remove pass statements
      .replace(/^pass$/, '');
  }

  private executeReverseStringPython(code: string, input: string): string {
    try {
      const s = JSON.parse(input);

      // Extract the function body from Python code
      const funcMatch = code.match(/def\s+reverse_string\s*\([^)]*\):\s*([\s\S]*)/);
      if (!funcMatch) {
        throw new Error('Could not find reverse_string function definition');
      }

      const functionBody = funcMatch[1].trim();
      
      // Convert Python code to JavaScript manually for better control
      let jsCode = this.convertPythonToJS(functionBody);
      
      // Create the complete JavaScript function
      const completeJsCode = `function reverse_string(s) {
        ${jsCode}
      }`;

      // Create and execute the JavaScript function
      const jsFunc = new Function('s', `
        ${completeJsCode}
        reverse_string(s);
      `);

      const result = [...s]; // Create a copy
      jsFunc(result);
      return JSON.stringify(result);

    } catch (error) {
      throw new Error(`Python execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private enhancedPythonToJS(pythonCode: string): string {
    return pythonCode
      // Handle function definition
      .replace(/def\s+(\w+)\s*\([^)]*\):\s*/g, 'function $1(')
      // Handle Python-style loops with enumerate
      .replace(/for\s+(\w+),\s*(\w+)\s+in\s+enumerate\((\w+)\):/g, 'for (let $1 = 0; $1 < $3.length; $1++) { let $2 = $3[$1];')
      .replace(/for\s+(\w+)\s+in\s+range\(len\((\w+)\)\):/g, 'for (let $1 = 0; $1 < $2.length; $1++) {')
      .replace(/for\s+(\w+)\s+in\s+range\((\d+)\):/g, 'for (let $1 = 0; $1 < $2; $1++) {')
      .replace(/for\s+(\w+)\s+in\s+range\((\d+),\s*(\d+)\):/g, 'for (let $1 = $2; $1 < $3; $1++) {')
      .replace(/for\s+(\w+)\s+in\s+(\w+):/g, 'for (let $1 of $2) {')
      // Handle Python list access and methods
      .replace(/len\((\w+)\)/g, '$1.length')
      .replace(/(\w+)\.append\(([^)]+)\)/g, '$1.push($2)')
      .replace(/(\w+)\.pop\(\)/g, '$1.pop()')
      .replace(/(\w+)\.insert\(([^,]+),\s*([^)]+)\)/g, '$1.splice($2, 0, $3)')
      // Handle Python dictionary operations
      .replace(/(\w+)\s*=\s*\{\}/g, 'let $1 = {}')
      .replace(/(\w+)\[([^\]]+)\]\s*=\s*([^;\n]+)/g, '$1[$2] = $3')
      .replace(/(\w+)\s+in\s+(\w+)/g, '$2.hasOwnProperty($1)')
      // Handle Python return statements
      .replace(/return\s+\[([^\]]*)\]/g, 'return [$1]')
      .replace(/return\s+\[\]/g, 'return []')
      .replace(/return\s+None/g, 'return null')
      // Handle Python comments
      .replace(/#.*$/gm, '')
      // Handle indentation (convert to braces) - more sophisticated
      .replace(/\n(\s+)/g, (match, spaces) => {
        const level = spaces.length / 4; // Assuming 4 spaces per indent level
        return '\n' + '  '.repeat(level) + '{';
      })
      // Remove pass statements
      .replace(/\bpass\b/g, '')
      // Handle Python-style comparisons and operators
      .replace(/\bif\s+([^:]+):/g, 'if ($1) {')
      .replace(/\belse:/g, '} else {')
      .replace(/\belif\s+([^:]+):/g, '} else if ($1) {')
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||')
      .replace(/\bnot\b/g, '!')
      .replace(/==/g, '===')
      .replace(/!=/g, '!==')
      // Handle Python print statements
      .replace(/print\s*\(([^)]+)\)/g, 'console.log($1)')
      // Handle Python list comprehensions (basic)
      .replace(/\[([^]]+)\s+for\s+(\w+)\s+in\s+(\w+)\]/g, '$3.map($2 => $1)')
      // Handle variable assignments
      .replace(/^(\s*)(\w+)\s*=\s*/gm, '$1let $2 = ')
      // Add closing braces for functions and control structures
      .replace(/([^}])\s*$/, '$1\n}')
      // Clean up multiple braces
      .replace(/\}\s*\}/g, '}}')
      .replace(/\{\s*\{/g, '{{')
      // Fix function parameter handling
      .replace(/function\s+(\w+)\(\)/g, 'function $1()')
      .replace(/function\s+(\w+)\(\s*\)/g, 'function $1()');
  }

  private executeGenericPython(code: string, input: string, problemId: number): string {
    try {
      // Generic Python execution for any problem
      const jsCode = this.enhancedPythonToJS(code);
      
      // Try to extract function name from the code
      const funcMatch = code.match(/def\s+(\w+)\s*\([^)]*\):/);
      if (!funcMatch) {
        throw new Error('Could not find function definition in Python code');
      }
      
      const funcName = funcMatch[1];
      
      // Parse input based on problem type
      let parsedInput;
      try {
        parsedInput = JSON.parse(input);
      } catch {
        // If not JSON, treat as string
        parsedInput = input;
      }
      
      // Create and execute the JavaScript function
      const jsFunc = new Function('input', `
        ${jsCode}
        return ${funcName}(input);
      `);
      
      const result = jsFunc(parsedInput);
      return JSON.stringify(result);
      
    } catch (error) {
      throw new Error(`Generic Python execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeJava(code: string, testCases: TestCase[], problemId: number): Promise<ExecutionResult> {
    const testResults: TestResult[] = [];

    // Try to use a proper Java execution environment
    try {
      return await this.executeJavaWithRuntime(code, testCases, problemId);
    } catch (error) {
      console.warn('Java runtime execution failed, falling back to transpilation:', error);
      
      // Fallback to transpilation
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        
        try {
          let output: string;
          
          if (problemId === 1) {
            output = this.executeTwoSumJava(code, testCase.input);
          } else if (problemId === 2) {
            output = this.executeReverseStringJava(code, testCase.input);
          } else {
            output = this.executeGenericJava(code, testCase.input, problemId);
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
    }
  }

  private async executeJavaWithRuntime(code: string, testCases: TestCase[], problemId: number): Promise<ExecutionResult> {
    const testResults: TestResult[] = [];

    try {
      // For now, we'll use a Java-to-JavaScript transpiler that's more accurate
      // In a real implementation, you might use a service like Judge0 API or compile Java to WebAssembly
      
      // Create a more accurate Java transpiler
      const transpiledCode = this.transpileJavaToJS(code);
      
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        
        try {
          let output: string;
          
          if (problemId === 1) {
            const parts = testCase.input.split('], ');
            const nums = JSON.parse(parts[0] + ']');
            const target = parseInt(parts[1]);
            
            // Execute the transpiled code
            const jsFunc = new Function('nums', 'target', `
              ${transpiledCode}
              return twoSum(nums, target);
            `);
            
            const result = jsFunc(nums, target);
            output = JSON.stringify(result);
            
          } else if (problemId === 2) {
            const s = JSON.parse(testCase.input);
            
            const jsFunc = new Function('s', `
              ${transpiledCode}
              reverseString(s);
            `);
            
            const result = [...s];
            jsFunc(result);
            output = JSON.stringify(result);
            
          } else {
            // Generic Java execution
            const parsedInput = JSON.parse(testCase.input);
            
            const methodMatch = code.match(/public\s+[\w\[\]]+\s+(\w+)\s*\([^)]*\)/);
            if (methodMatch) {
              const methodName = methodMatch[1];
              const jsFunc = new Function('input', `
                ${transpiledCode}
                return ${methodName}(input);
              `);
              
              const result = jsFunc(parsedInput);
              output = JSON.stringify(result);
            } else {
              throw new Error('Could not find method definition');
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
      throw new Error(`Java execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private transpileJavaToJS(javaCode: string): string {
    return javaCode
      // Handle class definition
      .replace(/class\s+\w+\s*\{/g, '')
      .replace(/public\s+static\s+void\s+main\s*\([^)]*\)\s*\{[^}]*\}/g, '')
      // Handle method definitions
      .replace(/public\s+int\[\]\s+(\w+)\s*\([^)]*\)\s*\{/g, 'function $1(')
      .replace(/public\s+void\s+(\w+)\s*\([^)]*\)\s*\{/g, 'function $1(')
      .replace(/public\s+int\s+(\w+)\s*\([^)]*\)\s*\{/g, 'function $1(')
      .replace(/public\s+String\s+(\w+)\s*\([^)]*\)\s*\{/g, 'function $1(')
      // Handle variable declarations
      .replace(/int\[\]\s+(\w+)\s*=/g, 'let $1 =')
      .replace(/int\s+(\w+)\s*=/g, 'let $1 =')
      .replace(/String\s+(\w+)\s*=/g, 'let $1 =')
      .replace(/boolean\s+(\w+)\s*=/g, 'let $1 =')
      .replace(/char\[\]\s+(\w+)\s*=/g, 'let $1 =')
      .replace(/Map<[^>]+>\s+(\w+)\s*=/g, 'let $1 = new Map()')
      .replace(/HashMap<[^>]+>\s*\(\s*\)/g, 'new Map()')
      // Handle Java-specific syntax
      .replace(/\.length/g, '.length')
      .replace(/\.length\(\)/g, '.length')
      .replace(/\.size\(\)/g, '.size')
      .replace(/\.containsKey\(([^)]+)\)/g, '.has($1)')
      .replace(/\.get\(([^)]+)\)/g, '.get($1)')
      .replace(/\.put\(([^,]+),\s*([^)]+)\)/g, '.set($1, $2)')
      .replace(/System\.out\.print/g, 'console.log')
      .replace(/System\.out\.println/g, 'console.log')
      // Handle loops
      .replace(/for\s*\(\s*int\s+(\w+)\s*=\s*(\d+)\s*;\s*(\w+)\s*<\s*(\w+)\.length\s*;\s*(\w+)\+\+\s*\)/g, 'for (let $1 = $2; $1 < $4.length; $1++)')
      .replace(/for\s*\(\s*int\s+(\w+)\s*=\s*(\d+)\s*;\s*(\w+)\s*<\s*(\d+)\s*;\s*(\w+)\+\+\s*\)/g, 'for (let $1 = $2; $1 < $4; $1++)')
      // Handle return statements
      .replace(/return\s+new\s+int\[\]\s*\{([^}]+)\}/g, 'return [$1]')
      .replace(/return\s+null/g, 'return null')
      // Handle method calls
      .replace(/(\w+)\.add\(([^)]+)\)/g, '$1.push($2)')
      .replace(/(\w+)\.get\(([^)]+)\)/g, '$1[$2]')
      .replace(/(\w+)\.set\(([^,]+),\s*([^)]+)\)/g, '$1[$2] = $3')
      // Handle comments
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Clean up braces and semicolons
      .replace(/;\s*$/gm, '')
      .replace(/\}\s*$/, '}')
      // Handle closing braces
      .replace(/([^}])\s*$/, '$1\n}');
  }

  private executeTwoSumJava(code: string, input: string): string {
    try {
      // Parse input like "[2,7,11,15], 9"
      const parts = input.split('], ');
      const nums = JSON.parse(parts[0] + ']');
      const target = parseInt(parts[1]);

      // Convert Java code to JavaScript
      const jsCode = this.javaToJS(code);
      
      // Extract method logic
      const methodMatch = code.match(/public\s+int\[\]\s+twoSum\s*\([^)]*\)\s*\{([\s\S]+)\}/);
      if (!methodMatch) {
        throw new Error('Could not find twoSum method in Java code');
      }
      
      const methodBody = methodMatch[1].trim();
      const jsMethodBody = this.javaToJS(methodBody);
      
      // Create JavaScript function
      const jsFunc = new Function('nums', 'target', `
        ${jsCode}
        return twoSum(nums, target);
      `);

      const result = jsFunc(nums, target);
      return JSON.stringify(result);

    } catch (error) {
      throw new Error(`Java execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private executeReverseStringJava(code: string, input: string): string {
    try {
      const s = JSON.parse(input);

      // Convert Java code to JavaScript
      const jsCode = this.javaToJS(code);
      
      // Extract method logic
      const methodMatch = code.match(/public\s+void\s+reverseString\s*\([^)]*\)\s*\{([\s\S]+)\}/);
      if (!methodMatch) {
        throw new Error('Could not find reverseString method in Java code');
      }
      
      const methodBody = methodMatch[1].trim();
      const jsMethodBody = this.javaToJS(methodBody);
      
      // Create JavaScript function
      const jsFunc = new Function('s', `
        ${jsCode}
        reverseString(s);
      `);

      const result = [...s]; // Create a copy
      jsFunc(result);
      return JSON.stringify(result);

    } catch (error) {
      throw new Error(`Java execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private executeGenericJava(code: string, input: string, problemId: number): string {
    try {
      // Generic Java execution
      const jsCode = this.javaToJS(code);
      
      // Try to extract method name from the code
      const methodMatch = code.match(/public\s+[\w\[\]]+\s+(\w+)\s*\([^)]*\)/);
      if (!methodMatch) {
        throw new Error('Could not find method definition in Java code');
      }
      
      const methodName = methodMatch[1];
      
      // Parse input
      let parsedInput;
      try {
        parsedInput = JSON.parse(input);
      } catch {
        parsedInput = input;
      }
      
      // Create and execute the JavaScript function
      const jsFunc = new Function('input', `
        ${jsCode}
        return ${methodName}(input);
      `);
      
      const result = jsFunc(parsedInput);
      return JSON.stringify(result);
      
    } catch (error) {
      throw new Error(`Generic Java execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private javaToJS(javaCode: string): string {
    return javaCode
      // Handle class and method definitions
      .replace(/class\s+\w+\s*\{/g, '')
      .replace(/public\s+static\s+void\s+main\s*\([^)]*\)\s*\{[^}]*\}/g, '')
      .replace(/public\s+int\[\]\s+(\w+)\s*\([^)]*\)\s*\{/g, 'function $1(')
      .replace(/public\s+void\s+(\w+)\s*\([^)]*\)\s*\{/g, 'function $1(')
      .replace(/public\s+int\s+(\w+)\s*\([^)]*\)\s*\{/g, 'function $1(')
      .replace(/public\s+String\s+(\w+)\s*\([^)]*\)\s*\{/g, 'function $1(')
      // Handle variable declarations
      .replace(/int\[\]\s+(\w+)\s*=/g, 'let $1 =')
      .replace(/int\s+(\w+)\s*=/g, 'let $1 =')
      .replace(/String\s+(\w+)\s*=/g, 'let $1 =')
      .replace(/boolean\s+(\w+)\s*=/g, 'let $1 =')
      .replace(/char\[\]\s+(\w+)\s*=/g, 'let $1 =')
      // Handle Java-specific syntax
      .replace(/\.length/g, '.length')
      .replace(/\.length\(\)/g, '.length')
      .replace(/System\.out\.print/g, 'console.log')
      .replace(/System\.out\.println/g, 'console.log')
      // Handle loops
      .replace(/for\s*\(\s*int\s+(\w+)\s*=\s*(\d+)\s*;\s*(\w+)\s*<\s*(\w+)\.length\s*;\s*(\w+)\+\+\s*\)/g, 'for (let $1 = $2; $1 < $4.length; $1++)')
      .replace(/for\s*\(\s*int\s+(\w+)\s*=\s*(\d+)\s*;\s*(\w+)\s*<\s*(\d+)\s*;\s*(\w+)\+\+\s*\)/g, 'for (let $1 = $2; $1 < $4; $1++)')
      // Handle return statements
      .replace(/return\s+new\s+int\[\]\s*\{([^}]+)\}/g, 'return [$1]')
      .replace(/return\s+null/g, 'return null')
      // Handle method calls
      .replace(/(\w+)\.add\(([^)]+)\)/g, '$1.push($2)')
      .replace(/(\w+)\.get\(([^)]+)\)/g, '$1[$2]')
      .replace(/(\w+)\.set\(([^,]+),\s*([^)]+)\)/g, '$1[$2] = $3')
      // Handle comments
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Clean up braces and semicolons
      .replace(/;\s*$/gm, '')
      .replace(/\}\s*$/, '}')
      // Handle closing braces
      .replace(/([^}])\s*$/, '$1\n}');
  }

  private async executeCpp(code: string, testCases: TestCase[], problemId: number): Promise<ExecutionResult> {
    const testResults: TestResult[] = [];

    // Try to use a proper C++ execution environment
    try {
      return await this.executeCppWithRuntime(code, testCases, problemId);
    } catch (error) {
      console.warn('C++ runtime execution failed, falling back to transpilation:', error);
      
      // Fallback to transpilation
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        
        try {
          let output: string;
          
          if (problemId === 1) {
            output = this.executeTwoSumCpp(code, testCase.input);
          } else if (problemId === 2) {
            output = this.executeReverseStringCpp(code, testCase.input);
          } else {
            output = this.executeGenericCpp(code, testCase.input, problemId);
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
    }
  }

  private async executeCppWithRuntime(code: string, testCases: TestCase[], problemId: number): Promise<ExecutionResult> {
    const testResults: TestResult[] = [];

    try {
      // For C++, we'll use a more accurate transpiler
      // In a real implementation, you might use Emscripten to compile C++ to WebAssembly
      
      const transpiledCode = this.transpileCppToJS(code);
      
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        
        try {
          let output: string;
          
          if (problemId === 1) {
            const parts = testCase.input.split('], ');
            const nums = JSON.parse(parts[0] + ']');
            const target = parseInt(parts[1]);
            
            const jsFunc = new Function('nums', 'target', `
              ${transpiledCode}
              return twoSum(nums, target);
            `);
            
            const result = jsFunc(nums, target);
            output = JSON.stringify(result);
            
          } else if (problemId === 2) {
            const s = JSON.parse(testCase.input);
            
            const jsFunc = new Function('s', `
              ${transpiledCode}
              reverseString(s);
            `);
            
            const result = [...s];
            jsFunc(result);
            output = JSON.stringify(result);
            
          } else {
            const parsedInput = JSON.parse(testCase.input);
            
            const funcMatch = code.match(/vector<[\w<>]+>\s+(\w+)\s*\([^)]*\)/);
            if (!funcMatch) {
              const voidMatch = code.match(/void\s+(\w+)\s*\([^)]*\)/);
              if (!voidMatch) {
                throw new Error('Could not find function definition');
              }
              const jsFunc = new Function('input', `
                ${transpiledCode}
                ${voidMatch[1]}(input);
                return input;
              `);
              
              const result = jsFunc(parsedInput);
              output = JSON.stringify(result);
            } else {
              const funcName = funcMatch[1];
              const jsFunc = new Function('input', `
                ${transpiledCode}
                return ${funcName}(input);
              `);
              
              const result = jsFunc(parsedInput);
              output = JSON.stringify(result);
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
      throw new Error(`C++ execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private transpileCppToJS(cppCode: string): string {
    return cppCode
      // Handle includes and namespace
      .replace(/#include\s*<[^>]+>/g, '')
      .replace(/using\s+namespace\s+std\s*;/g, '')
      // Handle class definitions
      .replace(/class\s+\w+\s*\{/g, '')
      .replace(/public:\s*/g, '')
      .replace(/private:\s*/g, '')
      // Handle function definitions
      .replace(/vector<int>\s+(\w+)\s*\([^)]*\)\s*\{/g, 'function $1(')
      .replace(/void\s+(\w+)\s*\([^)]*\)\s*\{/g, 'function $1(')
      .replace(/int\s+(\w+)\s*\([^)]*\)\s*\{/g, 'function $1(')
      // Handle variable declarations
      .replace(/vector<int>\s+(\w+)/g, 'let $1 = []')
      .replace(/int\s+(\w+)/g, 'let $1')
      .replace(/bool\s+(\w+)/g, 'let $1')
      .replace(/string\s+(\w+)/g, 'let $1')
      .replace(/char\s+(\w+)/g, 'let $1')
      .replace(/unordered_map<[^>]+>\s+(\w+)/g, 'let $1 = new Map()')
      // Handle C++ specific syntax
      .replace(/\.size\(\)/g, '.size')
      .replace(/\.push_back\(([^)]+)\)/g, '.push($1)')
      .replace(/\.pop_back\(\)/g, '.pop()')
      .replace(/\.find\(([^)]+)\)\s*!=\s*\.end\(\)/g, '.has($1)')
      .replace(/\.find\(([^)]+)\)/g, '.get($1)')
      .replace(/\[([^\]]+)\]\s*=\s*([^;\n]+)/g, '.set($1, $2)')
      .replace(/cout\s*<<\s*/g, 'console.log(')
      .replace(/endl/g, '')
      .replace(/<<\s*/g, '')
      // Handle loops
      .replace(/for\s*\(\s*int\s+(\w+)\s*=\s*(\d+)\s*;\s*(\w+)\s*<\s*(\w+)\.size\(\)\s*;\s*(\w+)\+\+\s*\)/g, 'for (let $1 = $2; $1 < $4.size; $1++)')
      .replace(/for\s*\(\s*int\s+(\w+)\s*=\s*(\d+)\s*;\s*(\w+)\s*<\s*(\d+)\s*;\s*(\w+)\+\+\s*\)/g, 'for (let $1 = $2; $1 < $4; $1++)')
      // Handle return statements
      .replace(/return\s*\{([^}]+)\}/g, 'return [$1]')
      .replace(/return\s+(\w+)\s*;/g, 'return $1;')
      // Handle comments
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Clean up braces and semicolons
      .replace(/;\s*$/gm, '')
      .replace(/\}\s*$/, '}')
      // Handle closing braces
      .replace(/([^}])\s*$/, '$1\n}');
  }

  private executeTwoSumCpp(code: string, input: string): string {
    try {
      // Parse input like "[2,7,11,15], 9"
      const parts = input.split('], ');
      const nums = JSON.parse(parts[0] + ']');
      const target = parseInt(parts[1]);

      // Convert C++ code to JavaScript
      const jsCode = this.cppToJS(code);
      
      // Create JavaScript function
      const jsFunc = new Function('nums', 'target', `
        ${jsCode}
        return twoSum(nums, target);
      `);

      const result = jsFunc(nums, target);
      return JSON.stringify(result);

    } catch (error) {
      throw new Error(`C++ execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private executeReverseStringCpp(code: string, input: string): string {
    try {
      const s = JSON.parse(input);

      // Convert C++ code to JavaScript
      const jsCode = this.cppToJS(code);
      
      // Create JavaScript function
      const jsFunc = new Function('s', `
        ${jsCode}
        reverseString(s);
      `);

      const result = [...s]; // Create a copy
      jsFunc(result);
      return JSON.stringify(result);

    } catch (error) {
      throw new Error(`C++ execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private executeGenericCpp(code: string, input: string, problemId: number): string {
    try {
      // Generic C++ execution
      const jsCode = this.cppToJS(code);
      
      // Try to extract function name from the code
      const funcMatch = code.match(/vector<[\w<>]+>\s+(\w+)\s*\([^)]*\)/);
      if (!funcMatch) {
        const voidMatch = code.match(/void\s+(\w+)\s*\([^)]*\)/);
        if (!voidMatch) {
          throw new Error('Could not find function definition in C++ code');
        }
        return this.executeGenericCppVoid(code, input, voidMatch[1]);
      }
      
      const funcName = funcMatch[1];
      
      // Parse input
      let parsedInput;
      try {
        parsedInput = JSON.parse(input);
      } catch {
        parsedInput = input;
      }
      
      // Create and execute the JavaScript function
      const jsFunc = new Function('input', `
        ${jsCode}
        return ${funcName}(input);
      `);
      
      const result = jsFunc(parsedInput);
      return JSON.stringify(result);
      
    } catch (error) {
      throw new Error(`Generic C++ execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private executeGenericCppVoid(code: string, input: string, funcName: string): string {
    try {
      const jsCode = this.cppToJS(code);
      
      // Parse input
      let parsedInput;
      try {
        parsedInput = JSON.parse(input);
      } catch {
        parsedInput = input;
      }
      
      // Create and execute the JavaScript function
      const jsFunc = new Function('input', `
        ${jsCode}
        ${funcName}(input);
        return input;
      `);
      
      const result = jsFunc(parsedInput);
      return JSON.stringify(result);
      
    } catch (error) {
      throw new Error(`Generic C++ void execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private cppToJS(cppCode: string): string {
    return cppCode
      // Handle includes and namespace
      .replace(/#include\s*<[^>]+>/g, '')
      .replace(/using\s+namespace\s+std\s*;/g, '')
      // Handle class definitions
      .replace(/class\s+\w+\s*\{/g, '')
      .replace(/public:\s*/g, '')
      .replace(/private:\s*/g, '')
      // Handle function definitions
      .replace(/vector<int>\s+(\w+)\s*\([^)]*\)\s*\{/g, 'function $1(')
      .replace(/void\s+(\w+)\s*\([^)]*\)\s*\{/g, 'function $1(')
      .replace(/int\s+(\w+)\s*\([^)]*\)\s*\{/g, 'function $1(')
      // Handle variable declarations
      .replace(/vector<int>\s+(\w+)/g, 'let $1 = []')
      .replace(/int\s+(\w+)/g, 'let $1')
      .replace(/bool\s+(\w+)/g, 'let $1')
      .replace(/string\s+(\w+)/g, 'let $1')
      .replace(/char\s+(\w+)/g, 'let $1')
      // Handle C++ specific syntax
      .replace(/\.size\(\)/g, '.length')
      .replace(/\.push_back\(([^)]+)\)/g, '.push($1)')
      .replace(/\.pop_back\(\)/g, '.pop()')
      .replace(/cout\s*<<\s*/g, 'console.log(')
      .replace(/endl/g, '')
      .replace(/<<\s*/g, '')
      // Handle loops
      .replace(/for\s*\(\s*int\s+(\w+)\s*=\s*(\d+)\s*;\s*(\w+)\s*<\s*(\w+)\.size\(\)\s*;\s*(\w+)\+\+\s*\)/g, 'for (let $1 = $2; $1 < $4.length; $1++)')
      .replace(/for\s*\(\s*int\s+(\w+)\s*=\s*(\d+)\s*;\s*(\w+)\s*<\s*(\d+)\s*;\s*(\w+)\+\+\s*\)/g, 'for (let $1 = $2; $1 < $4; $1++)')
      // Handle return statements
      .replace(/return\s*\{([^}]+)\}/g, 'return [$1]')
      .replace(/return\s+(\w+)\s*;/g, 'return $1;')
      // Handle comments
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Clean up braces and semicolons
      .replace(/;\s*$/gm, '')
      .replace(/\}\s*$/, '}')
      // Handle closing braces
      .replace(/([^}])\s*$/, '$1\n}');
  }

  private async executeC(code: string, testCases: TestCase[], problemId: number): Promise<ExecutionResult> {
    const testResults: TestResult[] = [];

    // Try to use a proper C execution environment
    try {
      return await this.executeCWithRuntime(code, testCases, problemId);
    } catch (error) {
      console.warn('C runtime execution failed, falling back to transpilation:', error);
      
      // Fallback to transpilation
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        
        try {
          let output: string;
          
          if (problemId === 1) {
            output = this.executeTwoSumC(code, testCase.input);
          } else if (problemId === 2) {
            output = this.executeReverseStringC(code, testCase.input);
          } else {
            output = this.executeGenericC(code, testCase.input, problemId);
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
    }
  }

  private async executeCWithRuntime(code: string, testCases: TestCase[], problemId: number): Promise<ExecutionResult> {
    const testResults: TestResult[] = [];

    try {
      // For C, we'll use a more accurate transpiler
      // In a real implementation, you might use Emscripten to compile C to WebAssembly
      
      const transpiledCode = this.transpileCToJS(code);
      
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        
        try {
          let output: string;
          
          if (problemId === 1) {
            const parts = testCase.input.split('], ');
            const nums = JSON.parse(parts[0] + ']');
            const target = parseInt(parts[1]);
            
            const jsFunc = new Function('nums', 'target', 'returnSize', `
              ${transpiledCode}
              return twoSum(nums, nums.length, target, returnSize);
            `);
            
            const returnSize = { value: 0 };
            const result = jsFunc(nums, target, returnSize);
            output = JSON.stringify(result);
            
          } else if (problemId === 2) {
            const s = JSON.parse(testCase.input);
            
            const jsFunc = new Function('s', 'sSize', `
              ${transpiledCode}
              reverseString(s, s.length);
            `);
            
            const result = [...s];
            jsFunc(result, result.length);
            output = JSON.stringify(result);
            
          } else {
            const parsedInput = JSON.parse(testCase.input);
            
            const funcMatch = code.match(/int\*\s+(\w+)\s*\([^)]*\)/);
            if (!funcMatch) {
              const voidMatch = code.match(/void\s+(\w+)\s*\([^)]*\)/);
              if (!voidMatch) {
                throw new Error('Could not find function definition');
              }
              const jsFunc = new Function('input', 'inputSize', `
                ${transpiledCode}
                ${voidMatch[1]}(input, inputSize);
                return input;
              `);
              
              const result = jsFunc(parsedInput, Array.isArray(parsedInput) ? parsedInput.length : 0);
              output = JSON.stringify(result);
            } else {
              const funcName = funcMatch[1];
              const jsFunc = new Function('input', 'inputSize', 'returnSize', `
                ${transpiledCode}
                return ${funcName}(input, inputSize, returnSize);
              `);
              
              const returnSize = { value: 0 };
              const result = jsFunc(parsedInput, Array.isArray(parsedInput) ? parsedInput.length : 0, returnSize);
              output = JSON.stringify(result);
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
      throw new Error(`C execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private transpileCToJS(cCode: string): string {
    return cCode
      // Handle includes
      .replace(/#include\s*<[^>]+>/g, '')
      .replace(/#include\s*"[^"]+"/g, '')
      // Handle function definitions
      .replace(/int\*\s+(\w+)\s*\([^)]*\)\s*\{/g, 'function $1(')
      .replace(/void\s+(\w+)\s*\([^)]*\)\s*\{/g, 'function $1(')
      .replace(/int\s+(\w+)\s*\([^)]*\)\s*\{/g, 'function $1(')
      // Handle variable declarations
      .replace(/int\s+(\w+)\s*=/g, 'let $1 =')
      .replace(/int\s+(\w+)\s*\[/g, 'let $1 = [')
      .replace(/char\s+(\w+)\s*\[/g, 'let $1 = [')
      .replace(/bool\s+(\w+)/g, 'let $1')
      // Handle C specific syntax
      .replace(/malloc\([^)]+\)/g, '[]')
      .replace(/free\([^)]+\)/g, '')
      .replace(/sizeof\([^)]+\)/g, '0')
      .replace(/printf\s*\([^)]+\)/g, 'console.log()')
      // Handle loops
      .replace(/for\s*\(\s*int\s+(\w+)\s*=\s*(\d+)\s*;\s*(\w+)\s*<\s*(\w+)\s*;\s*(\w+)\+\+\s*\)/g, 'for (let $1 = $2; $1 < $4; $1++)')
      .replace(/for\s*\(\s*int\s+(\w+)\s*=\s*(\d+)\s*;\s*(\w+)\s*<\s*(\d+)\s*;\s*(\w+)\+\+\s*\)/g, 'for (let $1 = $2; $1 < $4; $1++)')
      // Handle return statements
      .replace(/return\s+NULL/g, 'return null')
      .replace(/return\s+(\w+)\s*;/g, 'return $1;')
      // Handle comments
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Clean up braces and semicolons
      .replace(/;\s*$/gm, '')
      .replace(/\}\s*$/, '}')
      // Handle closing braces
      .replace(/([^}])\s*$/, '$1\n}');
  }

  private executeTwoSumC(code: string, input: string): string {
    try {
      // Parse input like "[2,7,11,15], 9"
      const parts = input.split('], ');
      const nums = JSON.parse(parts[0] + ']');
      const target = parseInt(parts[1]);

      // Convert C code to JavaScript
      const jsCode = this.cToJS(code);
      
      // Create JavaScript function
      const jsFunc = new Function('nums', 'target', 'returnSize', `
        ${jsCode}
        return twoSum(nums, nums.length, target, returnSize);
      `);

      const returnSize = { value: 0 };
      const result = jsFunc(nums, target, returnSize);
      return JSON.stringify(result);

    } catch (error) {
      throw new Error(`C execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private executeReverseStringC(code: string, input: string): string {
    try {
      const s = JSON.parse(input);

      // Convert C code to JavaScript
      const jsCode = this.cToJS(code);
      
      // Create JavaScript function
      const jsFunc = new Function('s', 'sSize', `
        ${jsCode}
        reverseString(s, s.length);
      `);

      const result = [...s]; // Create a copy
      jsFunc(result, result.length);
      return JSON.stringify(result);

    } catch (error) {
      throw new Error(`C execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private executeGenericC(code: string, input: string, problemId: number): string {
    try {
      // Generic C execution
      const jsCode = this.cToJS(code);
      
      // Try to extract function name from the code
      const funcMatch = code.match(/int\*\s+(\w+)\s*\([^)]*\)/);
      if (!funcMatch) {
        const voidMatch = code.match(/void\s+(\w+)\s*\([^)]*\)/);
        if (!voidMatch) {
          throw new Error('Could not find function definition in C code');
        }
        return this.executeGenericCVoid(code, input, voidMatch[1]);
      }
      
      const funcName = funcMatch[1];
      
      // Parse input
      let parsedInput;
      try {
        parsedInput = JSON.parse(input);
      } catch {
        parsedInput = input;
      }
      
      // Create and execute the JavaScript function
      const jsFunc = new Function('input', 'inputSize', 'returnSize', `
        ${jsCode}
        return ${funcName}(input, inputSize, returnSize);
      `);
      
      const returnSize = { value: 0 };
      const result = jsFunc(parsedInput, Array.isArray(parsedInput) ? parsedInput.length : 0, returnSize);
      return JSON.stringify(result);
      
    } catch (error) {
      throw new Error(`Generic C execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private executeGenericCVoid(code: string, input: string, funcName: string): string {
    try {
      const jsCode = this.cToJS(code);
      
      // Parse input
      let parsedInput;
      try {
        parsedInput = JSON.parse(input);
      } catch {
        parsedInput = input;
      }
      
      // Create and execute the JavaScript function
      const jsFunc = new Function('input', 'inputSize', `
        ${jsCode}
        ${funcName}(input, inputSize);
        return input;
      `);
      
      const result = jsFunc(parsedInput, Array.isArray(parsedInput) ? parsedInput.length : 0);
      return JSON.stringify(result);
      
    } catch (error) {
      throw new Error(`Generic C void execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private cToJS(cCode: string): string {
    return cCode
      // Handle includes
      .replace(/#include\s*<[^>]+>/g, '')
      .replace(/#include\s*"[^"]+"/g, '')
      // Handle function definitions
      .replace(/int\*\s+(\w+)\s*\([^)]*\)\s*\{/g, 'function $1(')
      .replace(/void\s+(\w+)\s*\([^)]*\)\s*\{/g, 'function $1(')
      .replace(/int\s+(\w+)\s*\([^)]*\)\s*\{/g, 'function $1(')
      // Handle variable declarations
      .replace(/int\s+(\w+)\s*=/g, 'let $1 =')
      .replace(/int\s+(\w+)\s*\[/g, 'let $1 = [')
      .replace(/char\s+(\w+)\s*\[/g, 'let $1 = [')
      .replace(/bool\s+(\w+)/g, 'let $1')
      // Handle C specific syntax
      .replace(/malloc\([^)]+\)/g, '[]')
      .replace(/free\([^)]+\)/g, '')
      .replace(/sizeof\([^)]+\)/g, '0')
      .replace(/printf\s*\([^)]+\)/g, 'console.log()')
      // Handle loops
      .replace(/for\s*\(\s*int\s+(\w+)\s*=\s*(\d+)\s*;\s*(\w+)\s*<\s*(\w+)\s*;\s*(\w+)\+\+\s*\)/g, 'for (let $1 = $2; $1 < $4; $1++)')
      .replace(/for\s*\(\s*int\s+(\w+)\s*=\s*(\d+)\s*;\s*(\w+)\s*<\s*(\d+)\s*;\s*(\w+)\+\+\s*\)/g, 'for (let $1 = $2; $1 < $4; $1++)')
      // Handle return statements
      .replace(/return\s+NULL/g, 'return null')
      .replace(/return\s+(\w+)\s*;/g, 'return $1;')
      // Handle comments
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Clean up braces and semicolons
      .replace(/;\s*$/gm, '')
      .replace(/\}\s*$/, '}')
      // Handle closing braces
      .replace(/([^}])\s*$/, '$1\n}');
  }
}

export const clientCodeExecutionService = new ClientCodeExecutionService();
