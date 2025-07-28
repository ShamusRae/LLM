'use strict';

/**
 * ConsultingErrorHandler - Comprehensive error handling and recovery for consulting platform
 * Provides graceful error handling, logging, and recovery mechanisms
 */
class ConsultingErrorHandler {
  constructor(options = {}) {
    this.logLevel = options.logLevel || process.env.LOG_LEVEL || 'info';
    this.enableRecovery = options.enableRecovery !== false;
    this.notificationEndpoint = options.notificationEndpoint || null;
    
    // Error statistics
    this.errorStats = {
      database: 0,
      websocket: 0,
      project_execution: 0,
      ai_processing: 0,
      validation: 0,
      timeout: 0,
      unknown: 0
    };
    
    // Recovery strategies
    this.recoveryStrategies = new Map();
    this.setupDefaultRecoveryStrategies();
  }

  /**
   * Setup default recovery strategies
   */
  setupDefaultRecoveryStrategies() {
    // Database connection recovery
    this.recoveryStrategies.set('DATABASE_CONNECTION_FAILED', async (error, context) => {
      console.log('🔄 Attempting database reconnection...');
      
      try {
        if (context.database) {
          await context.database.initialize();
          return { recovered: true, message: 'Database reconnected successfully' };
        }
      } catch (retryError) {
        return { recovered: false, message: `Database recovery failed: ${retryError.message}` };
      }
      
      return { recovered: false, message: 'No database context for recovery' };
    });

    // WebSocket connection recovery
    this.recoveryStrategies.set('WEBSOCKET_CONNECTION_FAILED', async (error, context) => {
      console.log('🔄 Attempting WebSocket recovery...');
      
      // WebSocket connections are typically handled by client reconnection
      return { recovered: true, message: 'WebSocket recovery handled by client reconnection' };
    });

    // Project execution timeout recovery
    this.recoveryStrategies.set('EXECUTION_TIMEOUT', async (error, context) => {
      console.log('🔄 Handling project execution timeout...');
      
      try {
        if (context.projectId && context.database) {
          await context.database.updateProject(context.projectId, { 
            status: 'failed',
            error: 'Execution timeout - project exceeded maximum duration'
          });
          
          return { recovered: true, message: 'Project marked as failed due to timeout' };
        }
      } catch (updateError) {
        return { recovered: false, message: `Failed to update project status: ${updateError.message}` };
      }
      
      return { recovered: false, message: 'No project context for timeout recovery' };
    });

    // AI processing error recovery
    this.recoveryStrategies.set('AI_PROCESSING_FAILED', async (error, context) => {
      console.log('🔄 Attempting AI processing recovery...');
      
      // For AI failures, we can often retry with fallback content
      if (context.usesFallback) {
        return { recovered: true, message: 'Using fallback content generation' };
      }
      
      return { recovered: false, message: 'AI processing failed without fallback available' };
    });
  }

  /**
   * Handle and categorize errors
   */
  async handleError(error, context = {}) {
    const errorInfo = this.categorizeError(error);
    
    // Log the error
    this.logError(errorInfo, context);
    
    // Update statistics
    this.errorStats[errorInfo.category]++;
    
    // Attempt recovery if enabled
    let recoveryResult = null;
    if (this.enableRecovery && this.recoveryStrategies.has(errorInfo.type)) {
      try {
        recoveryResult = await this.recoveryStrategies.get(errorInfo.type)(error, context);
        
        if (recoveryResult.recovered) {
          console.log(`✅ Error recovery successful: ${recoveryResult.message}`);
        } else {
          console.log(`❌ Error recovery failed: ${recoveryResult.message}`);
        }
      } catch (recoveryError) {
        console.error('❌ Error during recovery attempt:', recoveryError);
        recoveryResult = { recovered: false, message: `Recovery attempt failed: ${recoveryError.message}` };
      }
    }
    
    // Send notifications for critical errors
    if (errorInfo.severity === 'critical') {
      await this.sendErrorNotification(errorInfo, context, recoveryResult);
    }
    
    return {
      error: errorInfo,
      recovery: recoveryResult,
      handled: true
    };
  }

  /**
   * Categorize error by type and severity
   */
  categorizeError(error) {
    const message = error.message || error.toString();
    const code = error.code;
    const stack = error.stack;
    
    let category = 'unknown';
    let type = 'UNKNOWN_ERROR';
    let severity = 'medium';
    
    // Database errors
    if (code === 'ECONNREFUSED' || code === '28P01' || message.includes('database') || message.includes('PostgreSQL')) {
      category = 'database';
      type = 'DATABASE_CONNECTION_FAILED';
      severity = 'critical';
    }
    
    // WebSocket errors
    else if (message.includes('WebSocket') || message.includes('ws://')) {
      category = 'websocket';
      type = 'WEBSOCKET_CONNECTION_FAILED';
      severity = 'medium';
    }
    
    // Project execution errors
    else if (message.includes('EXECUTION_TIMEOUT')) {
      category = 'project_execution';
      type = 'EXECUTION_TIMEOUT';
      severity = 'high';
    }
    
    // AI processing errors
    else if (message.includes('AI') || message.includes('model') || message.includes('OpenAI') || message.includes('Claude')) {
      category = 'ai_processing';
      type = 'AI_PROCESSING_FAILED';
      severity = 'high';
    }
    
    // Validation errors
    else if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      category = 'validation';
      type = 'VALIDATION_FAILED';
      severity = 'low';
    }
    
    return {
      category,
      type,
      severity,
      message,
      code,
      stack,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log error with appropriate level
   */
  logError(errorInfo, context = {}) {
    const logEntry = {
      ...errorInfo,
      context: {
        projectId: context.projectId,
        userId: context.userId,
        operation: context.operation,
        requestId: context.requestId
      }
    };
    
    switch (errorInfo.severity) {
      case 'critical':
        console.error('🚨 CRITICAL ERROR:', JSON.stringify(logEntry, null, 2));
        break;
      case 'high':
        console.error('🔴 HIGH SEVERITY ERROR:', JSON.stringify(logEntry, null, 2));
        break;
      case 'medium':
        console.warn('🟡 MEDIUM SEVERITY ERROR:', JSON.stringify(logEntry, null, 2));
        break;
      case 'low':
        if (this.logLevel === 'debug') {
          console.log('🟢 LOW SEVERITY ERROR:', JSON.stringify(logEntry, null, 2));
        }
        break;
    }
  }

  /**
   * Send error notification (placeholder for integration with alerting systems)
   */
  async sendErrorNotification(errorInfo, context, recoveryResult) {
    if (!this.notificationEndpoint) {
      return;
    }
    
    const notification = {
      timestamp: new Date().toISOString(),
      error: errorInfo,
      context,
      recovery: recoveryResult,
      platform: 'Professional Consulting Platform'
    };
    
    try {
      // This would integrate with services like Slack, PagerDuty, etc.
      // For now, just log it
      console.log('📧 Error notification would be sent:', JSON.stringify(notification, null, 2));
    } catch (notificationError) {
      console.error('Failed to send error notification:', notificationError);
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const total = Object.values(this.errorStats).reduce((sum, count) => sum + count, 0);
    
    return {
      ...this.errorStats,
      total,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset error statistics
   */
  resetErrorStats() {
    Object.keys(this.errorStats).forEach(key => {
      this.errorStats[key] = 0;
    });
    
    console.log('📊 Error statistics reset');
  }

  /**
   * Add custom recovery strategy
   */
  addRecoveryStrategy(errorType, strategy) {
    this.recoveryStrategies.set(errorType, strategy);
    console.log(`✅ Added recovery strategy for: ${errorType}`);
  }

  /**
   * Express error middleware
   */
  expressErrorHandler() {
    return async (err, req, res, next) => {
      const context = {
        requestId: req.id || Math.random().toString(36),
        operation: `${req.method} ${req.path}`,
        userId: req.user?.id,
        projectId: req.params?.projectId || req.body?.projectId
      };
      
      const handledError = await this.handleError(err, context);
      
      // Determine appropriate HTTP status
      let statusCode = 500;
      if (handledError.error.category === 'validation') {
        statusCode = 400;
      } else if (handledError.error.type === 'DATABASE_CONNECTION_FAILED') {
        statusCode = 503;
      }
      
      res.status(statusCode).json({
        success: false,
        error: {
          message: handledError.error.message,
          type: handledError.error.type,
          category: handledError.error.category,
          timestamp: handledError.error.timestamp
        },
        recovery: handledError.recovery ? {
          attempted: true,
          successful: handledError.recovery.recovered,
          message: handledError.recovery.message
        } : { attempted: false }
      });
    };
  }

  /**
   * Promise-based error wrapper
   */
  wrapAsync(asyncFunction) {
    return async (...args) => {
      try {
        return await asyncFunction(...args);
      } catch (error) {
        const context = {
          operation: asyncFunction.name,
          arguments: args.length
        };
        
        await this.handleError(error, context);
        throw error; // Re-throw after handling
      }
    };
  }
}

module.exports = ConsultingErrorHandler; 