import subprocess
import tempfile
import os
import json
import uuid
from typing import Dict, Any, Optional
import docker
import asyncio
from datetime import datetime, timedelta

from core.config import settings


class CodeExecutionService:
    def __init__(self):
        self.docker_client = None
        try:
            self.docker_client = docker.from_env()
        except Exception as e:
            print(f"Docker not available: {e}")
    
    async def execute_code(
        self, 
        code: str, 
        language: str, 
        test_cases: list, 
        problem_id: int,
        timeout: int = 10
    ) -> Dict[str, Any]:
        """Execute code in the specified language with test cases"""
        
        if language == "javascript":
            return await self._execute_javascript(code, test_cases, problem_id, timeout)
        elif language == "python":
            return await self._execute_python(code, test_cases, problem_id, timeout)
        elif language == "java":
            return await self._execute_java(code, test_cases, problem_id, timeout)
        elif language == "cpp":
            return await self._execute_cpp(code, test_cases, problem_id, timeout)
        elif language == "c":
            return await self._execute_c(code, test_cases, problem_id, timeout)
        else:
            return {
                "success": False,
                "error": f"Language {language} not supported",
                "test_results": []
            }
    
    async def _execute_javascript(self, code: str, test_cases: list, problem_id: int, timeout: int) -> Dict[str, Any]:
        """Execute JavaScript code using Node.js"""
        try:
            # Create test runner script
            test_runner = self._create_javascript_test_runner(code, test_cases, problem_id)
            
            if self.docker_client:
                return await self._execute_in_docker("node:18-alpine", test_runner, timeout)
            else:
                return await self._execute_locally("node", test_runner, timeout)
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "test_results": []
            }
    
    async def _execute_python(self, code: str, test_cases: list, problem_id: int, timeout: int) -> Dict[str, Any]:
        """Execute Python code"""
        try:
            test_runner = self._create_python_test_runner(code, test_cases, problem_id)
            
            if self.docker_client:
                return await self._execute_in_docker("python:3.11-alpine", test_runner, timeout)
            else:
                return await self._execute_locally("python3", test_runner, timeout)
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "test_results": []
            }
    
    async def _execute_java(self, code: str, test_cases: list, problem_id: int, timeout: int) -> Dict[str, Any]:
        """Execute Java code"""
        try:
            test_runner = self._create_java_test_runner(code, test_cases, problem_id)
            
            if self.docker_client:
                return await self._execute_in_docker("openjdk:17-alpine", test_runner, timeout)
            else:
                return await self._execute_locally("java", test_runner, timeout)
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "test_results": []
            }
    
    async def _execute_cpp(self, code: str, test_cases: list, problem_id: int, timeout: int) -> Dict[str, Any]:
        """Execute C++ code"""
        try:
            test_runner = self._create_cpp_test_runner(code, test_cases, problem_id)
            
            if self.docker_client:
                return await self._execute_in_docker("gcc:latest", test_runner, timeout)
            else:
                return await self._execute_locally("g++", test_runner, timeout)
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "test_results": []
            }
    
    async def _execute_c(self, code: str, test_cases: list, problem_id: int, timeout: int) -> Dict[str, Any]:
        """Execute C code"""
        try:
            test_runner = self._create_c_test_runner(code, test_cases, problem_id)
            
            if self.docker_client:
                return await self._execute_in_docker("gcc:latest", test_runner, timeout)
            else:
                return await self._execute_locally("gcc", test_runner, timeout)
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "test_results": []
            }
    
    def _create_javascript_test_runner(self, code: str, test_cases: list, problem_id: int) -> str:
        """Create JavaScript test runner script"""
        runner = f"""
{code}

// Test runner
const testCases = {json.dumps(test_cases)};
const results = [];

for (let i = 0; i < testCases.length; i++) {{
    const testCase = testCases[i];
    try {{
        let result;
        
        if ({problem_id} === 1) {{
            // Two Sum problem
            const input = JSON.parse('[' + testCase.input + ']');
            const nums = input[0];
            const target = input[1];
            result = twoSum(nums, target);
        }} else if ({problem_id} === 2) {{
            // Reverse String problem
            const input = JSON.parse(testCase.input);
            const s = [...input];
            reverseString(s);
            result = s;
        }}
        
        const output = JSON.stringify(result);
        const passed = output === testCase.expected;
        
        results.push({{
            testCase: i + 1,
            input: testCase.input,
            expected: testCase.expected,
            output: output,
            passed: passed
        }});
        
    }} catch (error) {{
        results.push({{
            testCase: i + 1,
            input: testCase.input,
            expected: testCase.expected,
            output: null,
            passed: false,
            error: error.message
        }});
    }}
}}

console.log(JSON.stringify({{
    success: true,
    test_results: results
}}));
"""
        return runner
    
    def _create_python_test_runner(self, code: str, test_cases: list, problem_id: int) -> str:
        """Create Python test runner script"""
        runner = f"""
import json
import sys

{code}

# Test runner
test_cases = {json.dumps(test_cases)}
results = []

for i, test_case in enumerate(test_cases):
    try:
        if {problem_id} == 1:
            # Two Sum problem
            input_str = test_case['input']
            # Parse input like "[2,7,11,15], 9"
            parts = input_str.split('], ')
            nums = json.loads(parts[0] + ']')
            target = int(parts[1])
            result = two_sum(nums, target)
        elif {problem_id} == 2:
            # Reverse String problem
            input_str = test_case['input']
            s = json.loads(input_str)
            reverse_string(s)
            result = s
        
        output = json.dumps(result)
        passed = output == test_case['expected']
        
        results.append({{
            'testCase': i + 1,
            'input': test_case['input'],
            'expected': test_case['expected'],
            'output': output,
            'passed': passed
        }})
        
    except Exception as error:
        results.append({{
            'testCase': i + 1,
            'input': test_case['input'],
            'expected': test_case['expected'],
            'output': None,
            'passed': False,
            'error': str(error)
        }})

print(json.dumps({{
    'success': True,
    'test_results': results
}}))
"""
        return runner
    
    def _create_java_test_runner(self, code: str, test_cases: list, problem_id: int) -> str:
        """Create Java test runner script"""
        runner = f"""
import java.util.*;
import java.util.stream.Collectors;

{code}

public class TestRunner {{
    public static void main(String[] args) {{
        // Test cases would be hardcoded or passed as arguments
        // For now, return a simple response
        System.out.println("{{\\"success\\": true, \\"test_results\\": []}}");
    }}
}}
"""
        return runner
    
    def _create_cpp_test_runner(self, code: str, test_cases: list, problem_id: int) -> str:
        """Create C++ test runner script"""
        runner = f"""
#include <iostream>
#include <vector>
#include <string>
#include <sstream>

{code}

int main() {{
    // Test cases would be implemented here
    std::cout << "{{\\"success\\": true, \\"test_results\\": []}}" << std::endl;
    return 0;
}}
"""
        return runner
    
    def _create_c_test_runner(self, code: str, test_cases: list, problem_id: int) -> str:
        """Create C test runner script"""
        runner = f"""
#include <stdio.h>
#include <stdlib.h>

{code}

int main() {{
    // Test cases would be implemented here
    printf("{{\\"success\\": true, \\"test_results\\": []}}");
    return 0;
}}
"""
        return runner
    
    async def _execute_in_docker(self, image: str, script: str, timeout: int) -> Dict[str, Any]:
        """Execute script in Docker container"""
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
                f.write(script)
                temp_file = f.name
            
            # Copy file to container and execute
            container = self.docker_client.containers.run(
                image,
                command=f"node {os.path.basename(temp_file)}",
                volumes={os.path.dirname(temp_file): {'bind': '/tmp', 'mode': 'rw'}},
                working_dir='/tmp',
                remove=True,
                detach=True
            )
            
            # Wait for completion with timeout
            try:
                result = container.wait(timeout=timeout)
                logs = container.logs().decode('utf-8')
                
                # Clean up
                os.unlink(temp_file)
                
                if result['StatusCode'] == 0:
                    return json.loads(logs.strip())
                else:
                    return {
                        "success": False,
                        "error": f"Container exited with code {result['StatusCode']}",
                        "logs": logs,
                        "test_results": []
                    }
                    
            except Exception as e:
                container.remove(force=True)
                os.unlink(temp_file)
                return {
                    "success": False,
                    "error": f"Container execution failed: {str(e)}",
                    "test_results": []
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Docker execution failed: {str(e)}",
                "test_results": []
            }
    
    async def _execute_locally(self, command: str, script: str, timeout: int) -> Dict[str, Any]:
        """Execute script locally using subprocess"""
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(script)
                temp_file = f.name
            
            # Execute with timeout
            process = await asyncio.create_subprocess_exec(
                command, temp_file,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(), 
                    timeout=timeout
                )
                
                # Clean up
                os.unlink(temp_file)
                
                if process.returncode == 0:
                    result = stdout.decode('utf-8').strip()
                    return json.loads(result)
                else:
                    error_msg = stderr.decode('utf-8').strip()
                    return {
                        "success": False,
                        "error": f"Execution failed: {error_msg}",
                        "test_results": []
                    }
                    
            except asyncio.TimeoutError:
                process.kill()
                os.unlink(temp_file)
                return {
                    "success": False,
                    "error": "Execution timed out",
                    "test_results": []
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Local execution failed: {str(e)}",
                "test_results": []
            }


# Global instance
code_execution_service = CodeExecutionService()
