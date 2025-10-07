#!/usr/bin/env node

/**
 * Unified launcher script for the Exam Proctoring System
 * This script provides a single entry point to start the application
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkDependencies() {
  log('🔍 Checking dependencies...', 'cyan');
  
  // Check if package.json exists
  if (!fs.existsSync('package.json')) {
    log('❌ package.json not found. Please run this script from the project root.', 'red');
    process.exit(1);
  }

  // Check if node_modules exists
  if (!fs.existsSync('node_modules')) {
    log('⚠️  node_modules not found. Installing dependencies...', 'yellow');
    return false;
  }

  // Check if backend requirements exist
  if (!fs.existsSync('backend/requirements.txt')) {
    log('❌ Backend requirements.txt not found.', 'red');
    process.exit(1);
  }

  return true;
}

function installDependencies() {
  return new Promise((resolve, reject) => {
    log('📦 Installing frontend dependencies...', 'blue');
    
    const npm = spawn('npm', ['install'], { stdio: 'inherit' });
    
    npm.on('close', (code) => {
      if (code === 0) {
        log('✅ Frontend dependencies installed successfully!', 'green');
        resolve();
      } else {
        log('❌ Failed to install frontend dependencies', 'red');
        reject(new Error('npm install failed'));
      }
    });
  });
}

function checkPython() {
  return new Promise((resolve, reject) => {
    log('🐍 Checking Python installation...', 'cyan');
    
    const python = spawn('python', ['--version'], { stdio: 'pipe' });
    
    python.on('close', (code) => {
      if (code === 0) {
        log('✅ Python is available', 'green');
        resolve();
      } else {
        log('❌ Python not found. Please install Python 3.11+', 'red');
        reject(new Error('Python not found'));
      }
    });
  });
}

function installBackendDependencies() {
  return new Promise((resolve, reject) => {
    log('📦 Installing backend dependencies...', 'blue');
    
    const pip = spawn('pip', ['install', '-r', 'backend/requirements.txt'], { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    pip.on('close', (code) => {
      if (code === 0) {
        log('✅ Backend dependencies installed successfully!', 'green');
        resolve();
      } else {
        log('❌ Failed to install backend dependencies', 'red');
        reject(new Error('pip install failed'));
      }
    });
  });
}

function startApplication(mode = 'full') {
  return new Promise((resolve, reject) => {
    log(`🚀 Starting application in ${mode} mode...`, 'magenta');
    
    let command, args;
    
    switch (mode) {
      case 'full':
        command = 'npm';
        args = ['run', 'dev:full'];
        break;
      case 'frontend':
        command = 'npm';
        args = ['run', 'dev'];
        break;
      case 'backend':
        command = 'npm';
        args = ['run', 'backend'];
        break;
      case 'docker':
        command = 'npm';
        args = ['run', 'docker:dev'];
        break;
      default:
        reject(new Error(`Unknown mode: ${mode}`));
        return;
    }
    
    const app = spawn(command, args, { stdio: 'inherit' });
    
    app.on('close', (code) => {
      if (code === 0) {
        log('✅ Application stopped gracefully', 'green');
        resolve();
      } else {
        log(`❌ Application exited with code ${code}`, 'red');
        reject(new Error(`Application exited with code ${code}`));
      }
    });

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      log('\n🛑 Stopping application...', 'yellow');
      app.kill('SIGINT');
    });
  });
}

function showHelp() {
  log('\n📚 Exam Proctoring System Launcher', 'bright');
  log('=====================================', 'bright');
  log('');
  log('Usage: node launch.js [mode]', 'cyan');
  log('');
  log('Modes:', 'yellow');
  log('  full      - Start both frontend and backend (default)', 'green');
  log('  frontend  - Start frontend only (client-side execution)', 'green');
  log('  backend   - Start backend only', 'green');
  log('  docker    - Start with Docker Compose', 'green');
  log('  help      - Show this help message', 'green');
  log('');
  log('Examples:', 'yellow');
  log('  node launch.js', 'cyan');
  log('  node launch.js full', 'cyan');
  log('  node launch.js frontend', 'cyan');
  log('  node launch.js docker', 'cyan');
  log('');
  log('Features:', 'yellow');
  log('  ✅ Multi-language code execution', 'green');
  log('  ✅ AI-powered proctoring', 'green');
  log('  ✅ Real-time monitoring', 'green');
  log('  ✅ Secure authentication', 'green');
  log('  ✅ Docker support', 'green');
  log('');
}

async function main() {
  const mode = process.argv[2] || 'full';
  
  if (mode === 'help') {
    showHelp();
    return;
  }
  
  log('🎯 Exam Proctoring System Launcher', 'bright');
  log('==================================', 'bright');
  log('');
  
  try {
    // Check dependencies
    const depsInstalled = checkDependencies();
    
    if (!depsInstalled) {
      await installDependencies();
    }
    
    // Check Python for backend mode
    if (mode === 'full' || mode === 'backend') {
      try {
        await checkPython();
        
        // Check if backend dependencies are installed
        if (!fs.existsSync('backend/.env')) {
          log('⚠️  Backend .env not found. Creating from template...', 'yellow');
          if (fs.existsSync('backend/.env.example')) {
            fs.copyFileSync('backend/.env.example', 'backend/.env');
            log('✅ Created backend/.env from template', 'green');
          }
        }
        
        // Try to install backend dependencies
        try {
          await installBackendDependencies();
        } catch (error) {
          log('⚠️  Backend dependencies installation failed. Continuing with frontend only...', 'yellow');
        }
      } catch (error) {
        log('⚠️  Python not available. Switching to frontend-only mode...', 'yellow');
        if (mode === 'full') {
          log('🔄 Starting in frontend-only mode...', 'cyan');
          await startApplication('frontend');
          return;
        }
      }
    }
    
    // Start the application
    await startApplication(mode);
    
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`❌ Uncaught Exception: ${error.message}`, 'red');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`❌ Unhandled Rejection at: ${promise}, reason: ${reason}`, 'red');
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  log(`❌ Fatal Error: ${error.message}`, 'red');
  process.exit(1);
});
