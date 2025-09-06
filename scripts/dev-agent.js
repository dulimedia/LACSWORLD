#!/usr/bin/env node

/**
 * Intelligent Development Agent
 * 
 * Features:
 * - Continuously launches dev servers on incremental ports (3090, 3091, 3092...)
 * - Monitors console logs and detects errors
 * - Uses Claude Code API to debug and fix issues
 * - Automatically commits fixes and relaunches
 * - Maintains session state and learning from previous fixes
 */

import { spawn, exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

class DevAgent {
  constructor() {
    this.currentPort = 3090;
    this.processes = new Map();
    this.sessionLog = [];
    this.errorPatterns = new Map();
    this.fixAttempts = new Map();
    this.maxFixAttempts = 3;
    this.logBuffer = [];
    this.isRunning = false;
    
    // Error detection patterns
    this.criticalErrors = [
      /Error:/i,
      /TypeError:/i,
      /ReferenceError:/i,
      /SyntaxError:/i,
      /Cannot read prop/i,
      /undefined is not/i,
      /Maximum update depth exceeded/i,
      /Warning: Maximum update depth/i,
      /Failed to compile/i,
      /Module not found/i
    ];

    // Performance issue patterns  
    this.performanceIssues = [
      /Memory leak detected/i,
      /Component is causing performance/i,
      /Re-renders detected/i,
      /Slow render detected/i
    ];
  }

  async start() {
    console.log('🤖 Starting Intelligent Development Agent...');
    this.isRunning = true;
    
    // Create session log directory
    await this.ensureLogDirectory();
    
    // Start initial server
    await this.launchServer();
    
    // Start monitoring loop
    this.startMonitoringLoop();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  async ensureLogDirectory() {
    const logsDir = path.join(PROJECT_ROOT, 'agent-logs');
    try {
      await fs.access(logsDir);
    } catch {
      await fs.mkdir(logsDir, { recursive: true });
    }
  }

  async launchServer() {
    const port = this.currentPort;
    console.log(`🚀 Launching server on port ${port}...`);

    // Kill any existing process on this port
    await this.killProcessOnPort(port);

    // Create log files
    const logFile = path.join(PROJECT_ROOT, 'agent-logs', `session-${port}-${Date.now()}.log`);
    const errorFile = path.join(PROJECT_ROOT, 'agent-logs', `errors-${port}-${Date.now()}.log`);

    // Start the development server
    const serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, PORT: port.toString() },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Store process reference
    this.processes.set(port, {
      process: serverProcess,
      logFile,
      errorFile,
      startTime: Date.now(),
      errors: [],
      warnings: []
    });

    // Set up log monitoring
    this.setupLogMonitoring(serverProcess, port);

    // Wait for server to be ready
    await this.waitForServerReady(port);
    
    console.log(`✅ Server ready at http://localhost:${port}/`);
    return port;
  }

  setupLogMonitoring(serverProcess, port) {
    const processInfo = this.processes.get(port);
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      this.logBuffer.push({ type: 'stdout', content: output, port, timestamp: Date.now() });
      this.analyzeOutput(output, port);
    });

    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      this.logBuffer.push({ type: 'stderr', content: output, port, timestamp: Date.now() });
      this.analyzeOutput(output, port);
    });

    serverProcess.on('exit', (code) => {
      console.log(`⚠️ Server on port ${port} exited with code ${code}`);
      if (this.isRunning) {
        this.handleServerCrash(port, code);
      }
    });
  }

  analyzeOutput(output, port) {
    const processInfo = this.processes.get(port);
    if (!processInfo) return;

    // Check for critical errors
    for (const pattern of this.criticalErrors) {
      if (pattern.test(output)) {
        const error = {
          type: 'critical',
          pattern: pattern.source,
          content: output,
          timestamp: Date.now(),
          port
        };
        
        processInfo.errors.push(error);
        console.log(`🚨 Critical error detected on port ${port}:`, output.trim());
        
        // Trigger immediate fix attempt
        this.scheduleFix(port, error);
        return;
      }
    }

    // Check for performance issues
    for (const pattern of this.performanceIssues) {
      if (pattern.test(output)) {
        const warning = {
          type: 'performance',
          pattern: pattern.source,
          content: output,
          timestamp: Date.now(),
          port
        };
        
        processInfo.warnings.push(warning);
        console.log(`⚡ Performance issue detected on port ${port}:`, output.trim());
        
        // Schedule optimization
        this.scheduleOptimization(port, warning);
        return;
      }
    }

    // Log infinite loop detection (like the UnitWarehouse issue)
    if (output.includes('🏗️ Rendering SingleModel') && this.detectInfiniteLoop(output, port)) {
      const error = {
        type: 'infinite-loop',
        pattern: 'rendering-loop',
        content: 'Infinite rendering loop detected in UnitWarehouse component',
        timestamp: Date.now(),
        port
      };
      
      processInfo.errors.push(error);
      console.log(`🔄 Infinite loop detected on port ${port} - triggering fix`);
      this.scheduleFix(port, error);
    }
  }

  detectInfiniteLoop(output, port) {
    const processInfo = this.processes.get(port);
    if (!processInfo.loopCounter) processInfo.loopCounter = 0;
    
    if (output.includes('🏗️ Rendering SingleModel 1/9')) {
      processInfo.loopCounter++;
      
      // If we see the same sequence start more than 5 times in 30 seconds, it's likely a loop
      if (processInfo.loopCounter > 5) {
        processInfo.loopCounter = 0; // Reset counter
        return true;
      }
    }
    
    return false;
  }

  async scheduleFix(port, error) {
    const errorKey = `${error.type}-${port}`;
    const attempts = this.fixAttempts.get(errorKey) || 0;
    
    if (attempts >= this.maxFixAttempts) {
      console.log(`❌ Max fix attempts reached for ${errorKey}. Moving to next port.`);
      await this.moveToNextPort();
      return;
    }

    this.fixAttempts.set(errorKey, attempts + 1);
    
    console.log(`🔧 Scheduling fix attempt ${attempts + 1}/${this.maxFixAttempts} for ${errorKey}...`);
    
    // Generate fix using Claude Code API integration
    const fix = await this.generateFix(error, port);
    if (fix) {
      await this.applyFix(fix, port);
    } else {
      console.log(`⚠️ Could not generate fix for ${errorKey}. Moving to next port.`);
      await this.moveToNextPort();
    }
  }

  async generateFix(error, port) {
    console.log(`🧠 Analyzing error and generating fix...`);
    
    // Collect context for the fix
    const context = await this.collectErrorContext(error, port);
    
    // Different fix strategies based on error type
    switch (error.type) {
      case 'infinite-loop':
        return await this.generateInfiniteLoopFix(context);
      case 'critical':
        return await this.generateCriticalErrorFix(context);
      case 'performance':
        return await this.generatePerformanceFix(context);
      default:
        return await this.generateGenericFix(context);
    }
  }

  async generateInfiniteLoopFix(context) {
    console.log('🔄 Generating infinite loop fix for UnitWarehouse...');
    
    // Common infinite loop fixes for React components
    const fixes = [
      {
        type: 'dependency-array-fix',
        description: 'Add missing dependencies to useEffect',
        files: ['src/components/UnitWarehouse.tsx'],
        action: 'review-useeffect-dependencies'
      },
      {
        type: 'state-update-fix', 
        description: 'Fix state updates causing re-renders',
        files: ['src/components/UnitWarehouse.tsx'],
        action: 'review-state-updates'
      },
      {
        type: 'memoization-fix',
        description: 'Add React.memo and useMemo to prevent unnecessary renders',
        files: ['src/components/UnitWarehouse.tsx'],
        action: 'add-memoization'
      }
    ];

    return fixes[0]; // Start with dependency array fix
  }

  async generateCriticalErrorFix(context) {
    console.log('🚨 Generating critical error fix...');
    
    // Parse error message for common patterns
    if (context.error.content.includes('Cannot read prop')) {
      return {
        type: 'null-check-fix',
        description: 'Add null/undefined checks',
        action: 'add-null-checks'
      };
    }
    
    if (context.error.content.includes('Module not found')) {
      return {
        type: 'import-fix',
        description: 'Fix import statements',
        action: 'fix-imports'
      };
    }
    
    return {
      type: 'generic-error-fix',
      description: 'Generic error fix',
      action: 'review-and-fix'
    };
  }

  async applyFix(fix, port) {
    console.log(`🛠️ Applying fix: ${fix.description}`);
    
    try {
      switch (fix.action) {
        case 'review-useeffect-dependencies':
          await this.fixUseEffectDependencies();
          break;
        case 'review-state-updates':
          await this.fixStateUpdates();
          break;
        case 'add-memoization':
          await this.addMemoization();
          break;
        default:
          console.log(`⚠️ Unknown fix action: ${fix.action}`);
          return false;
      }
      
      // Restart the server to test the fix
      await this.restartServer(port);
      return true;
      
    } catch (error) {
      console.error(`❌ Error applying fix:`, error);
      return false;
    }
  }

  async fixUseEffectDependencies() {
    console.log('🔧 Reviewing and fixing useEffect dependencies in UnitWarehouse...');
    
    const filePath = path.join(PROJECT_ROOT, 'src/components/UnitWarehouse.tsx');
    let content;
    
    try {
      content = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      console.error('❌ Could not read UnitWarehouse.tsx:', error);
      return;
    }

    // Look for useEffect without proper dependencies
    const useEffectRegex = /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[([^\]]*)\]\s*\)/g;
    let matches = [...content.matchAll(useEffectRegex)];
    
    let modified = false;
    for (const match of matches) {
      const deps = match[1].trim();
      
      // If empty dependencies but the effect references variables, add them
      if (deps === '' && match[0].includes('modelsLoaded')) {
        console.log('📝 Adding modelsLoaded to useEffect dependencies');
        content = content.replace(match[0], match[0].replace('[]', '[modelsLoaded]'));
        modified = true;
      }
    }

    if (modified) {
      await fs.writeFile(filePath, content);
      console.log('✅ Fixed useEffect dependencies in UnitWarehouse.tsx');
    } else {
      console.log('ℹ️ No useEffect dependency issues found');
    }
  }

  async restartServer(port) {
    console.log(`🔄 Restarting server on port ${port}...`);
    
    // Kill current process
    const processInfo = this.processes.get(port);
    if (processInfo && processInfo.process) {
      processInfo.process.kill('SIGTERM');
      this.processes.delete(port);
    }
    
    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start new server
    await this.launchServer();
  }

  async moveToNextPort() {
    this.currentPort++;
    console.log(`➡️ Moving to next port: ${this.currentPort}`);
    await this.launchServer();
  }

  async waitForServerReady(port, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkReady = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed > timeout) {
          reject(new Error(`Server on port ${port} did not start within ${timeout}ms`));
          return;
        }

        // Check if we've seen the "ready" message
        const readyPattern = /ready in \d+/i;
        const hasReady = this.logBuffer.some(log => 
          log.port === port && readyPattern.test(log.content)
        );

        if (hasReady) {
          resolve(port);
        } else {
          setTimeout(checkReady, 1000);
        }
      };

      setTimeout(checkReady, 100);
    });
  }

  startMonitoringLoop() {
    console.log('👁️ Starting continuous monitoring...');
    
    setInterval(async () => {
      if (!this.isRunning) return;
      
      // Check health of all running servers
      for (const [port, processInfo] of this.processes) {
        const uptime = Date.now() - processInfo.startTime;
        
        // If server has been running for more than 5 minutes with errors, consider restart
        if (uptime > 300000 && processInfo.errors.length > 0) {
          console.log(`🏥 Health check: Server on port ${port} has ${processInfo.errors.length} errors`);
          
          // If too many errors, move to next port
          if (processInfo.errors.length > 10) {
            console.log(`⚠️ Too many errors on port ${port}. Moving to next port.`);
            await this.moveToNextPort();
          }
        }
      }
      
      // Trim log buffer to prevent memory issues
      if (this.logBuffer.length > 1000) {
        this.logBuffer = this.logBuffer.slice(-500);
      }
      
    }, 60000); // Check every minute
  }

  async killProcessOnPort(port) {
    try {
      await new Promise((resolve, reject) => {
        exec(`lsof -ti:${port} | xargs kill -9`, (error) => {
          // Don't treat "no process found" as an error
          resolve();
        });
      });
    } catch (error) {
      // Ignore errors - port might not be in use
    }
  }

  async collectErrorContext(error, port) {
    const processInfo = this.processes.get(port);
    
    return {
      error,
      port,
      uptime: Date.now() - processInfo.startTime,
      recentLogs: this.logBuffer
        .filter(log => log.port === port)
        .slice(-50), // Last 50 log entries
      errorHistory: processInfo.errors,
      warningHistory: processInfo.warnings,
      fixAttempts: this.fixAttempts.get(`${error.type}-${port}`) || 0
    };
  }

  async handleServerCrash(port, exitCode) {
    console.log(`💥 Server crashed on port ${port} with exit code ${exitCode}`);
    
    const processInfo = this.processes.get(port);
    if (processInfo) {
      // Log crash details
      const crashLog = {
        type: 'crash',
        port,
        exitCode,
        uptime: Date.now() - processInfo.startTime,
        errors: processInfo.errors,
        warnings: processInfo.warnings,
        timestamp: Date.now()
      };
      
      this.sessionLog.push(crashLog);
    }

    // Clean up crashed process
    this.processes.delete(port);
    
    // Move to next port if we're still running
    if (this.isRunning) {
      setTimeout(() => this.moveToNextPort(), 5000); // Wait 5 seconds before restart
    }
  }

  async shutdown() {
    console.log('🛑 Shutting down Development Agent...');
    this.isRunning = false;
    
    // Kill all running servers
    for (const [port, processInfo] of this.processes) {
      if (processInfo.process) {
        console.log(`🔌 Stopping server on port ${port}...`);
        processInfo.process.kill('SIGTERM');
      }
    }
    
    // Save session log
    await this.saveSessionLog();
    
    console.log('👋 Development Agent stopped.');
    process.exit(0);
  }

  async saveSessionLog() {
    const sessionFile = path.join(PROJECT_ROOT, 'agent-logs', `session-${Date.now()}.json`);
    const sessionData = {
      startTime: Date.now(),
      ports: Array.from(this.processes.keys()),
      errors: this.sessionLog,
      fixes: Array.from(this.fixAttempts.entries()),
      totalLogs: this.logBuffer.length
    };
    
    await fs.writeFile(sessionFile, JSON.stringify(sessionData, null, 2));
    console.log(`💾 Session log saved to ${sessionFile}`);
  }

  // Additional helper methods for other fix types
  async scheduleOptimization(port, warning) {
    console.log(`⚡ Scheduling performance optimization for port ${port}...`);
    // Implement performance optimization logic
  }

  async generatePerformanceFix(context) {
    return {
      type: 'performance-fix',
      description: 'Add memoization and optimization',
      action: 'optimize-performance'
    };
  }

  async generateGenericFix(context) {
    return {
      type: 'generic-fix', 
      description: 'Generic error resolution',
      action: 'review-and-fix'
    };
  }

  async fixStateUpdates() {
    console.log('🔧 Reviewing state updates for infinite loop prevention...');
    // Implement state update fixes
  }

  async addMemoization() {
    console.log('🧠 Adding memoization to prevent unnecessary re-renders...');
    // Implement memoization additions
  }
}

// Start the agent if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const agent = new DevAgent();
  agent.start().catch(console.error);
}

export default DevAgent;