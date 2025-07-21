/**
 * Avatar Predictive Wrapper REST API Server
 * 
 * This Express server exposes REST API endpoints for the Avatar Agent Wrapper.
 * It provides endpoints to:
 * 1. Trigger new RD-Agent modeling jobs
 * 2. Poll and retrieve results from running or completed jobs
 * 3. Query job status
 */

require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const net = require('net');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Add a port discovery function
const findAvailablePort = async (startPort) => {
  const isPortAvailable = (port) => {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          // Other errors might indicate the port is not usable for other reasons
          resolve(false);
        }
      });
      
      server.once('listening', () => {
        // Close the server immediately once we verify we can listen
        server.close();
        resolve(true);
      });
      
      server.listen(port, '127.0.0.1');
    });
  };
  
  let port = startPort;
  const MAX_PORT = startPort + 100; // Limit our search to 100 ports
  
  while (port < MAX_PORT) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
    port++;
  }
  
  throw new Error(`Could not find an available port between ${startPort} and ${MAX_PORT}`);
};

// Path constants
const CONFIG_DIR = path.join(__dirname, 'tmp/configs');
const OUTPUT_DIR = path.join(__dirname, 'tmp/outputs');
const LOG_DIR = path.join(__dirname, 'logs');

// Track active RD-Agent processes
const activeProcesses = new Map();

// Active polling operations to prevent duplicate polling
const activePolling = new Set();

// Middleware
app.use(express.json({ limit: '50mb' })); // Support for large JSON payloads (datasets)
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // HTTP request logging
app.use(cors()); // Enable CORS for all routes

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

/**
 * Ensures that all required directories exist
 */
async function ensureDirectoriesExist() {
  const dirs = [CONFIG_DIR, OUTPUT_DIR, LOG_DIR];
  
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error(`Failed to create directory ${dir}: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

/**
 * API Routes
 */

/**
 * POST /api/run-flow
 * 
 * Starts a new RD-Agent modeling job
 * 
 * Request body: RD-Agent configuration object
 * Response: JobId and status message
 */
app.post('/api/run-flow', async (req, res) => {
  try {
    // Extract configuration from request body
    const { task, message, filePaths, avatarId } = req.body;
    
    if (!task) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing task in request body'
      });
    }
    
    console.log(`Starting new RD-Agent job for task: ${task}`);
    
    // Generate a unique job ID
    const jobId = uuidv4();
    
    // Create a configuration based on the task and file paths
    let config = {
      task: task,
      message: message || '',
      avatarId: avatarId || 'ada-lovelace'
    };
    
    // Add file paths if provided
    if (filePaths && Array.isArray(filePaths) && filePaths.length > 0) {
      config.filePaths = filePaths;
      console.log(`Processing ${filePaths.length} files for analysis: ${filePaths.join(', ')}`);
      
      // Validate that the files exist
      for (const filePath of filePaths) {
        try {
          await fs.access(filePath);
          console.log(`File exists: ${filePath}`);
        } catch (error) {
          console.error(`File not found: ${filePath}`);
          return res.status(400).json({
            status: 'error',
            message: `File not found: ${filePath}`
          });
        }
      }
    }
    
    // Write configuration to a JSON file
    const configFilePath = path.join(CONFIG_DIR, `rd_config_${jobId}.json`);
    await fs.writeFile(configFilePath, JSON.stringify(config, null, 2));
    
    // Prepare output paths
    const outputFilePath = path.join(OUTPUT_DIR, `rd_output_${jobId}.json`);
    const logFilePath = path.join(LOG_DIR, `rd_log_${jobId}.txt`);
    
    // Set up logging
    const logStream = await fs.open(logFilePath, 'w').then(fileHandle => fileHandle.createWriteStream());
    
    // Prepare the command and arguments for RD Agent
    const pythonPath = process.env.PYTHON_PATH || 'python3';
    const rdAgentPath = process.env.RD_AGENT_PATH || path.join(__dirname, 'python/rd-agent-setup');
    const scriptPath = path.join(rdAgentPath, 'run_analysis.py');
    
    // Build the arguments for the Python script
    const args = [
      scriptPath,
      '--config', configFilePath,
      '--output', outputFilePath,
      '--job-id', jobId
    ];
    
    // Add task-specific arguments
    if (config.task) {
      args.push('--task', config.task);
    }
    
    // Add file paths if available
    if (config.filePaths && config.filePaths.length > 0) {
      args.push('--files', config.filePaths.join(','));
    }
    
    console.log(`Executing RD-Agent: ${pythonPath} ${args.join(' ')}`);
    
    // Since we may not have the actual Python script ready, provide a delay to simulate processing
    // In a real implementation, we would spawn the Python process here
    
    // Add the job to activeProcesses map
    activeProcesses.set(jobId, {
      startTime: new Date(),
      status: 'running',
      config: config
    });
    
    // Simulate the RD Agent processing for now
    setTimeout(async () => {
      try {
        // Generate mock analysis results
        const mockResults = {
          status: 'completed',
          timestamp: new Date().toISOString(),
          task: task,
          jobId: jobId,
          summary: 'Dataset analysis completed successfully',
          results: {
            observations: [
              'Dataset contains numeric and categorical features',
              'No significant missing values detected',
              'Several strong correlations identified between features',
              filePaths ? `Analyzed ${filePaths.length} files: ${filePaths.map(p => path.basename(p)).join(', ')}` : 'No files provided'
            ],
            recommendations: [
              'Consider using a Random Forest model for prediction',
              'Feature engineering could improve model performance',
              'Cross-validation is recommended to ensure model robustness'
            ],
            fileSummaries: filePaths ? filePaths.map(filePath => ({
              file: path.basename(filePath),
              rowCount: 1000,
              columnCount: 15,
              fileSize: '2.3MB',
              dataTypes: {
                numeric: 8,
                categorical: 5,
                datetime: 2
              }
            })) : []
          }
        };
        
        // Write results to output file
        await fs.writeFile(outputFilePath, JSON.stringify(mockResults, null, 2));
        logStream.write(`[COMPLETED] Job completed at ${new Date().toISOString()}\n`);
        
        // Update job status in activeProcesses map
        if (activeProcesses.has(jobId)) {
          const processInfo = activeProcesses.get(jobId);
          processInfo.status = 'completed';
          processInfo.endTime = new Date();
          processInfo.results = mockResults;
        }
        
        console.log(`Job ${jobId} completed successfully`);
      } catch (error) {
        console.error(`Error processing job ${jobId}:`, error);
        logStream.write(`[ERROR] ${error.message}\n`);
        
        if (activeProcesses.has(jobId)) {
          const processInfo = activeProcesses.get(jobId);
          processInfo.status = 'failed';
          processInfo.error = error.message;
          processInfo.endTime = new Date();
        }
      } finally {
        logStream.end();
      }
    }, 5000);
    
    res.status(200).json({
      status: 'success',
      message: 'Job started successfully',
      jobId: jobId
    });
  } catch (error) {
    console.error('Error starting RD-Agent job:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to start job: ${error.message}`
    });
  }
});

/**
 * GET /api/flow-results/:jobId
 * 
 * Polls for and retrieves results of an RD-Agent job
 * 
 * URL Params: jobId
 * Query Params:
 *   - wait (boolean): Whether to wait for job completion (default: true)
 *   - timeout (number): Maximum time to wait in milliseconds (default: 30000)
 * Response: Job results or current status
 */
app.get('/api/flow-results/:jobId', async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const wait = req.query.wait !== 'false'; // Default to true
    const timeout = parseInt(req.query.timeout) || 30000; // Default 30 seconds
    
    if (!jobId) {
      return res.status(400).json({
        status: 'error',
        message: 'Job ID is required'
      });
    }
    
    console.log(`Retrieving results for job ${jobId}, wait=${wait}, timeout=${timeout}ms`);
    
    // First check current status
    let status = { status: 'unknown' };
    if (activeProcesses.has(jobId)) {
      const processInfo = activeProcesses.get(jobId);
      status = {
        jobId,
        status: processInfo.status,
        startTime: processInfo.startTime
      };
      
      if (processInfo.endTime) {
        status.endTime = processInfo.endTime;
        status.duration = processInfo.endTime - processInfo.startTime;
      }
      
      if (processInfo.exitCode !== undefined) {
        status.exitCode = processInfo.exitCode;
      }
      
      if (processInfo.error) {
        status.error = processInfo.error;
      }
    }
    
    // If job is already being polled by another request and client wants to wait
    if (activePolling.has(jobId) && wait) {
      console.log(`Job ${jobId} is already being polled by another request`);
      return res.status(202).json({
        status: 'polling',
        message: 'This job is already being polled by another request',
        jobId,
        currentStatus: status.status
      });
    }
    
    // If job is completed and results are available, return them immediately
    if (status.status === 'completed') {
      try {
        const outputFilePath = path.join(OUTPUT_DIR, `rd_output_${jobId}.json`);
        const outputData = await fs.readFile(outputFilePath, 'utf8');
        const results = JSON.parse(outputData);
        
        return res.status(200).json({
          status: 'success',
          jobId,
          results
        });
      } catch (resultError) {
        console.log(`Job ${jobId} is marked as completed but results are not ready yet: ${resultError.message}`);
        // Fall through to polling if results aren't ready yet
      }
    }
    
    // If job failed, return error
    if (status.status === 'failed') {
      return res.status(500).json({
        status: 'error',
        message: `Job ${jobId} failed: ${status.error || `Exit code ${status.exitCode}`}`,
        jobId,
        jobStatus: status
      });
    }
    
    // If client doesn't want to wait, return current status
    if (!wait) {
      return res.status(202).json({
        status: 'pending',
        message: `Job ${jobId} is ${status.status}`,
        jobId,
        jobStatus: status
      });
    }
    
    // If we get here, we need to poll for results
    console.log(`Polling for results of job ${jobId} with timeout ${timeout}ms`);
    
    // Mark this job as being polled
    activePolling.add(jobId);
    
    // Set up the polling timeout
    const pollingTimeout = setTimeout(() => {
      activePolling.delete(jobId);
      res.status(202).json({
        status: 'timeout',
        message: `Polling timeout exceeded (${timeout}ms) for job ${jobId}`,
        jobId
      });
    }, timeout);
    
    // Start polling for completion
    const pollInterval = setInterval(async () => {
      try {
        // Check if the job is still running
        let currentStatus = { status: 'unknown' };
        if (activeProcesses.has(jobId)) {
          const processInfo = activeProcesses.get(jobId);
          currentStatus = processInfo.status;
        } else {
          // Check if output file exists
          const outputFilePath = path.join(OUTPUT_DIR, `rd_output_${jobId}.json`);
          try {
            await fs.access(outputFilePath);
            currentStatus = 'completed';
          } catch (err) {
            // File doesn't exist
          }
        }
        
        console.log(`Polling job ${jobId}, current status: ${currentStatus}`);
        
        // If the job is completed, return the results
        if (currentStatus === 'completed') {
          clearInterval(pollInterval);
          clearTimeout(pollingTimeout);
          activePolling.delete(jobId);
          
          try {
            const outputFilePath = path.join(OUTPUT_DIR, `rd_output_${jobId}.json`);
            const outputData = await fs.readFile(outputFilePath, 'utf8');
            const results = JSON.parse(outputData);
            
            res.status(200).json({
              status: 'success',
              jobId,
              results
            });
          } catch (resultError) {
            console.error(`Error reading results file for job ${jobId}: ${resultError.message}`);
            res.status(500).json({
              status: 'error',
              message: `Error reading results: ${resultError.message}`,
              jobId
            });
          }
          
          return;
        }
        
        // If the job failed, return error
        if (currentStatus === 'failed') {
          clearInterval(pollInterval);
          clearTimeout(pollingTimeout);
          activePolling.delete(jobId);
          
          const processInfo = activeProcesses.get(jobId);
          res.status(500).json({
            status: 'error',
            message: `Job ${jobId} failed: ${processInfo.error || `Exit code ${processInfo.exitCode}`}`,
            jobId
          });
          
          return;
        }
        
        // Otherwise, continue polling
      } catch (error) {
        console.error(`Error during polling for job ${jobId}: ${error.message}`);
        // Continue polling - don't terminate on error
      }
    }, 1000); // Poll every second
    
  } catch (error) {
    console.error(`Error in /api/flow-results/:jobId: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: `Server error: ${error.message}`
    });
  }
});

/**
 * GET /api/flow-status/:jobId
 * 
 * Retrieves the current status of an RD-Agent job
 * 
 * URL Params: jobId
 * Response: Current job status
 */
app.get('/api/flow-status/:jobId', (req, res) => {
  try {
    const jobId = req.params.jobId;
    
    if (!jobId) {
      return res.status(400).json({
        status: 'error',
        message: 'Job ID is required'
      });
    }
    
    let status = { 
      jobId, 
      status: 'unknown',
      message: 'Job not found or already expired from memory' 
    };
    
    if (activeProcesses.has(jobId)) {
      const processInfo = activeProcesses.get(jobId);
      status = {
        jobId,
        status: processInfo.status,
        startTime: processInfo.startTime
      };
      
      if (processInfo.endTime) {
        status.endTime = processInfo.endTime;
        status.duration = processInfo.endTime - processInfo.startTime;
      }
      
      if (processInfo.exitCode !== undefined) {
        status.exitCode = processInfo.exitCode;
      }
      
      if (processInfo.error) {
        status.error = processInfo.error;
      }
    } else {
      // Check if output file exists
      const outputFilePath = path.join(OUTPUT_DIR, `rd_output_${jobId}.json`);
      try {
        if (fs.existsSync(outputFilePath)) {
          status.status = 'completed';
          status.message = 'Job completed with results available';
        }
      } catch (err) {
        // Ignore errors checking file
      }
    }
    
    return res.status(200).json({
      status: 'success',
      jobId,
      jobStatus: status,
      isPolling: activePolling.has(jobId)
    });
  } catch (error) {
    console.error(`Error getting job status: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: `Failed to get job status: ${error.message}`
    });
  }
});

/**
 * DELETE /api/flow/:jobId
 * 
 * Terminates a running RD-Agent job
 * 
 * URL Params: jobId
 * Response: Success or error message
 */
app.delete('/api/flow/:jobId', (req, res) => {
  try {
    const jobId = req.params.jobId;
    
    if (!jobId) {
      return res.status(400).json({
        status: 'error',
        message: 'Job ID is required'
      });
    }
    
    if (!activeProcesses.has(jobId)) {
      return res.status(404).json({
        status: 'error',
        message: `Job ${jobId} not found or not running`
      });
    }
    
    const processInfo = activeProcesses.get(jobId);
    if (processInfo.status !== 'running') {
      return res.status(400).json({
        status: 'error',
        message: `Job ${jobId} is not running (status: ${processInfo.status})`
      });
    }
    
    // Kill the process
    try {
      processInfo.process.kill();
      processInfo.status = 'terminated';
      processInfo.endTime = new Date();
      activePolling.delete(jobId);
      
      return res.status(200).json({
        status: 'success',
        message: `Job ${jobId} terminated successfully`
      });
    } catch (error) {
      console.error(`Failed to terminate process ${jobId}: ${error.message}`);
      return res.status(500).json({
        status: 'error',
        message: `Failed to terminate job: ${error.message}`
      });
    }
  } catch (error) {
    console.error(`Error terminating job: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: `Failed to terminate job: ${error.message}`
    });
  }
});

/**
 * GET /api/job-status/:jobId
 * 
 * Retrieves the status of a job
 * 
 * Response: Job status and results if available
 */
app.get('/api/job-status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      return res.status(400).json({
        status: 'error',
        message: 'Job ID is required'
      });
    }
    
    // Check if job exists in activeProcesses map
    if (!activeProcesses.has(jobId)) {
      // Try to read from output file if not in memory
      const outputFilePath = path.join(OUTPUT_DIR, `rd_output_${jobId}.json`);
      
      try {
        const outputContent = await fs.readFile(outputFilePath, 'utf8');
        const jobData = JSON.parse(outputContent);
        
        return res.status(200).json({
          status: jobData.status || 'unknown',
          results: jobData.summary || 'No summary available',
          data: jobData
        });
      } catch (readError) {
        // If file doesn't exist, job doesn't exist
        if (readError.code === 'ENOENT') {
          return res.status(404).json({
            status: 'error',
            message: 'Job not found'
          });
        }
        
        // Other error reading file
        throw readError;
      }
    }
    
    // Get job from activeProcesses map
    const job = activeProcesses.get(jobId);
    
    res.status(200).json({
      status: job.status,
      startTime: job.startTime,
      endTime: job.endTime,
      results: job.status === 'completed' ? (job.results?.summary || 'Job completed successfully') : null
    });
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to get job status: ${error.message}`
    });
  }
});

/**
 * POST /api/analyze-local-file
 * 
 * Analyzes a file already on the local filesystem
 * This avoids upload issues with very large files
 * 
 * Request body: filePath, task, message
 * Response: JobId and status message
 */
app.post('/api/analyze-local-file', async (req, res) => {
  try {
    // Extract configuration from request body
    const { filePath, task = 'data_analysis', message = '' } = req.body;
    
    if (!filePath) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing filePath in request body'
      });
    }
    
    console.log(`Processing local file: ${filePath} for task: ${task}`);
    
    // Verify file exists and is readable
    try {
      await fs.access(filePath, fs.constants.R_OK);
      console.log(`File exists and is readable: ${filePath}`);
      
      // Get file stats
      const stats = await fs.stat(filePath);
      console.log(`File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    } catch (error) {
      console.error(`Cannot access file: ${filePath}`, error);
      return res.status(400).json({
        status: 'error',
        message: `Cannot access file: ${filePath}. Error: ${error.message}`
      });
    }
    
    // Generate a unique job ID
    const jobId = uuidv4();
    
    // Create a configuration
    const config = {
      task,
      message,
      filePaths: [filePath],
      avatarId: 'ada-lovelace'
    };
    
    // Write configuration to a JSON file
    const configFilePath = path.join(CONFIG_DIR, `rd_config_${jobId}.json`);
    await fs.writeFile(configFilePath, JSON.stringify(config, null, 2));
    
    // Prepare output paths
    const outputFilePath = path.join(OUTPUT_DIR, `rd_output_${jobId}.json`);
    const logFilePath = path.join(LOG_DIR, `rd_log_${jobId}.txt`);
    
    // Set up logging
    const logStream = await fs.open(logFilePath, 'w').then(fileHandle => fileHandle.createWriteStream());
    
    // Add the job to activeProcesses map
    activeProcesses.set(jobId, {
      startTime: new Date(),
      status: 'running',
      config: config,
      filePath: filePath
    });
    
    // Simulate the RD Agent processing (in a real implementation, this would call Python code)
    setTimeout(async () => {
      try {
        // Extract file information
        const fileExtension = path.extname(filePath).toLowerCase();
        const fileName = path.basename(filePath);
        const fileStats = await fs.stat(filePath);
        const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
        
        // Generate mock analysis results
        const mockResults = {
          status: 'completed',
          timestamp: new Date().toISOString(),
          task,
          jobId,
          summary: `Analysis of ${fileName} (${fileSizeMB} MB) completed successfully`,
          results: {
            fileName,
            fileSize: `${fileSizeMB} MB`,
            fileType: fileExtension,
            observations: [
              `Successfully analyzed file: ${fileName} (${fileSizeMB} MB)`,
              `File appears to be a ${fileExtension.replace('.', '')} dataset`,
              `Large file processing completed - more detailed analysis would follow in the actual implementation`
            ],
            recommendations: [
              'Consider sampling data for faster model development',
              'Large datasets benefit from incremental training approaches',
              'Feature selection will be critical for optimal performance'
            ]
          }
        };
        
        // Write results to output file
        await fs.writeFile(outputFilePath, JSON.stringify(mockResults, null, 2));
        logStream.write(`[COMPLETED] Job completed at ${new Date().toISOString()}\n`);
        
        // Update job status in activeProcesses map
        if (activeProcesses.has(jobId)) {
          const processInfo = activeProcesses.get(jobId);
          processInfo.status = 'completed';
          processInfo.endTime = new Date();
          processInfo.results = mockResults;
        }
        
        console.log(`Job ${jobId} completed successfully`);
      } catch (error) {
        console.error(`Error processing job ${jobId}:`, error);
        logStream.write(`[ERROR] ${error.message}\n`);
        
        if (activeProcesses.has(jobId)) {
          const processInfo = activeProcesses.get(jobId);
          processInfo.status = 'failed';
          processInfo.error = error.message;
          processInfo.endTime = new Date();
        }
      } finally {
        logStream.end();
      }
    }, 5000);
    
    res.status(200).json({
      status: 'success',
      message: 'File analysis job started successfully',
      jobId: jobId
    });
  } catch (error) {
    console.error('Error starting file analysis job:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to start job: ${error.message}`
    });
  }
});

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
  console.error(`Unhandled error in request: ${err.message}`);
  console.error(err.stack);
  
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
});

// Start the server with dynamic port discovery
(async () => {
  try {
    // Ensure directories exist at startup
    await ensureDirectoriesExist();
    
    // Find an available port
    const availablePort = await findAvailablePort(PORT);
    
    app.listen(availablePort, () => {
      console.log(`Avatar Predictive Wrapper API server running on port ${availablePort}`);
      console.log(`Health check available at http://localhost:${availablePort}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();

module.exports = app; 