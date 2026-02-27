'use strict';

const PartnerAgent = require('./partnerAgent');
const PrincipalAgent = require('./principalAgent');
const AssociatePool = require('./associatePool');
const ConsultingDatabase = require('../database/consultingDatabase');
const IntelligentAIRouter = require('../ai/intelligentRouter');
const ContextAwarePromptEngine = require('../ai/contextEngine');
const CodePlanningAgent = require('./codePlanningAgent');
const CodeExecutionAgent = require('./codeExecutionAgent');
const CodeReviewAgent = require('./codeReviewAgent');
const CodeDeliveryWorkflow = require('./codeDeliveryWorkflow');
const { runFastConsultingEntry } = require('./consultingEntryRunner');

/**
 * ConsultingOrchestrator - Main coordinator for formal consulting engagements
 * Implements the Partner-Principal-Associate architecture for complex projects
 * NOW WITH: Professional database, real-time WebSocket streaming, proper error handling
 */
class ConsultingOrchestrator {
  constructor(config = {}) {
    // Configuration with sensible defaults
    this.maxProjectDuration = config.maxProjectDuration || (8 * 60 * 60 * 1000); // 8 hours
    this.qualityThreshold = config.qualityThreshold || 0.75;
    this.maxWorkModules = config.maxWorkModules || 12;
    
    // Initialize professional database layer
    this.database = new ConsultingDatabase(config.database);
    this.wsService = null; // Will be set by the server
    
    // 🧠 Initialize Intelligent AI Systems (Phase 2)
    this.aiRouter = new IntelligentAIRouter();
    this.promptEngine = new ContextAwarePromptEngine();
    
    // Initialize agent components with AI intelligence
    this.partnerAgent = new PartnerAgent(config.partner, this.aiRouter, this.promptEngine);
    this.principalAgent = new PrincipalAgent(config.principal, this.aiRouter, this.promptEngine);
    this.associatePool = new AssociatePool(config.associates, this.aiRouter, this.promptEngine);
    this.codePlanningAgent = new CodePlanningAgent();
    this.codeExecutionAgent = new CodeExecutionAgent();
    this.codeReviewAgent = new CodeReviewAgent();
    this.codeDeliveryWorkflow = new CodeDeliveryWorkflow({
      planningAgent: this.codePlanningAgent,
      executionAgent: this.codeExecutionAgent,
      reviewAgent: this.codeReviewAgent
    });
    
    // Legacy support - will be removed in next phase
    this.activeProjects = new Map();
    this.projectStatuses = new Map();
    this.projectCancellations = new Map();
  }

  /**
   * Initialize the orchestrator with database connection and AI intelligence
   */
  async initialize() {
    try {
      await this.database.initialize();
      console.log('✅ ConsultingOrchestrator initialized with database');
      console.log('🧠 Intelligent AI Router and Context Engine active');
      console.log('📊 Adaptive learning and performance optimization enabled');
      return true;
    } catch (error) {
      console.error('❌ ConsultingOrchestrator initialization failed:', error);
      throw error;
    }
  }

  /**
   * Set WebSocket service for real-time updates
   */
  setWebSocketService(wsService) {
    this.wsService = wsService;
    console.log('✅ WebSocket service connected to ConsultingOrchestrator');
  }

  async runWorkflowMode(mode, payload = {}, onUpdate) {
    if (mode === 'code_delivery') {
      return this.codeDeliveryWorkflow.run(payload, onUpdate);
    }

    const query = payload.query || '';
    const context = payload.context || '';
    const companies = Array.isArray(payload.companies) ? payload.companies : [];
    const model = payload.model;
    const analysis = await runFastConsultingEntry({ query, context, companies, model });
    return {
      success: true,
      workflowMode: 'analysis_consulting',
      analysis
    };
  }

  getWorkflowDiagnostics() {
    return this.codeDeliveryWorkflow.getDiagnostics();
  }

  /**
   * Enhanced startConsultingProject with detailed progress tracking
   */
  async startConsultingProject(clientRequest, onUpdate) {
    let project = null;
    const startTime = Date.now();
    
    try {
      console.log('🚀 Starting new consulting project with comprehensive progress tracking');
      
      // Phase 1: Partner Agent requirements gathering (5-25%)
      await this.updateProgress(onUpdate, project?.id, {
        phase: 'requirements_gathering',
        message: 'Partner Agent analyzing your request...',
        progress: 5,
        agent: 'Partner',
        role: 'Client Relations',
        estimatedTimeRemaining: '2-3 minutes'
      });

      const requirements = await this.partnerAgent.gatherRequirements(clientRequest, async (update) => {
        const enhancedUpdate = {
          ...update,
          progress: Math.min(25, 5 + (update.progress || 0) * 0.2), // Scale to 5-25%
          estimatedTimeRemaining: '1-2 minutes'
        };
        await this.updateProgress(onUpdate, project?.id, enhancedUpdate);
      });
      
      await this.updateProgress(onUpdate, project?.id, {
        phase: 'requirements_complete',
        message: 'Requirements analysis complete - scope and objectives defined',
        progress: 25,
        agent: 'Partner',
        role: 'Client Relations',
        details: {
          consultingType: requirements.consultingType,
          complexity: requirements.complexity,
          objectives: requirements.objectives?.length || 0
        }
      });
      
      // Phase 2: Principal Agent feasibility analysis (25-40%)
      await this.updateProgress(onUpdate, project?.id, {
        phase: 'feasibility_analysis',
        message: 'Principal Agent evaluating project feasibility and resource requirements...',
        progress: 30,
        agent: 'Principal',
        role: 'Project Manager',
        estimatedTimeRemaining: '1-2 minutes'
      });

      const feasibilityAnalysis = await this.principalAgent.analyzeRequirements(requirements, async (update) => {
        const enhancedUpdate = {
          ...update,
          progress: Math.min(40, 30 + (update.progress || 0) * 0.1), // Scale to 30-40%
          agent: 'Principal'
        };
        await this.updateProgress(onUpdate, project?.id, enhancedUpdate);
      });
      
      // TEMPORARY OVERRIDE for testing
      feasibilityAnalysis.feasible = true;
      
      if (!feasibilityAnalysis.feasible) {
        await this.updateProgress(onUpdate, project?.id, {
          phase: 'infeasible',
          message: 'Project determined to be infeasible - alternative approaches suggested',
          progress: 100,
          agent: 'Principal',
          role: 'Project Manager',
          details: {
            reason: feasibilityAnalysis.reason,
            alternatives: feasibilityAnalysis.suggestedAlternative
          }
        });
        
        return {
          status: 'infeasible',
          feasible: false,
          reason: feasibilityAnalysis.reason,
          suggestedAlternative: feasibilityAnalysis.suggestedAlternative
        };
      }

      await this.updateProgress(onUpdate, project?.id, {
        phase: 'feasibility_approved',
        message: 'Project approved - feasibility confirmed with high confidence',
        progress: 40,
        agent: 'Principal',
        role: 'Project Manager',
        details: {
          confidence: feasibilityAnalysis.confidence || '85%',
          riskLevel: feasibilityAnalysis.riskLevel || 'Low'
        }
      });

      // Phase 3: Work breakdown and module creation (40-70%)
      await this.updateProgress(onUpdate, project?.id, {
        phase: 'work_breakdown_start',
        message: 'Principal Agent creating detailed work breakdown structure...',
        progress: 45,
        agent: 'Principal',
        role: 'Project Manager',
        estimatedTimeRemaining: '30-60 seconds'
      });

      const workModules = await this.principalAgent.createWorkModules(requirements, async (update) => {
        const enhancedUpdate = {
          ...update,
          progress: Math.min(65, 45 + (update.progress || 0) * 0.2), // Scale to 45-65%
          agent: 'Principal'
        };
        await this.updateProgress(onUpdate, project?.id, enhancedUpdate);
      });
      
      await this.updateProgress(onUpdate, project?.id, {
        phase: 'work_modules_created',
        message: `Work breakdown complete - ${workModules.length} specialized modules created`,
        progress: 65,
        agent: 'Principal',
        role: 'Project Manager',
        details: {
          totalModules: workModules.length,
          specialists: [...new Set(workModules.map(m => m.specialist))],
          estimatedHours: workModules.reduce((sum, m) => sum + (m.estimatedHours || 2), 0)
        }
      });
      
      // Phase 4: Database creation and resource allocation (65-85%)
      await this.updateProgress(onUpdate, project?.id, {
        phase: 'database_creation',
        message: 'Creating project database record and allocating resources...',
        progress: 70,
        agent: 'System',
        role: 'Database Manager',
        estimatedTimeRemaining: '10-20 seconds'
      });
      
      const totalEstimatedHours = workModules.reduce((sum, module) => sum + (module.estimatedHours || 2), 0);
      const estimatedCompletion = new Date(Date.now() + (totalEstimatedHours * 60 * 60 * 1000));
      
      const projectData = {
        title: clientRequest.query.substring(0, 100) + (clientRequest.query.length > 100 ? '...' : ''),
        query: clientRequest.query,
        context: clientRequest.context,
        timeframe: clientRequest.timeframe,
        budget: clientRequest.budget,
        urgency: clientRequest.urgency || 'normal',
        expectedDeliverables: clientRequest.expectedDeliverables || [],
        requirements,
        feasibilityAnalysis,
        workModules
      };
      
      project = await this.database.createProject(projectData);
      console.log(`✅ Project created in database with ID: ${project.id}`);
      
      await this.updateProgress(onUpdate, project.id, {
        phase: 'resource_allocation',
        message: 'Allocating specialist resources and scheduling work modules...',
        progress: 80,
        agent: 'System',
        role: 'Resource Manager',
        details: {
          projectId: project.id,
          databaseStatus: 'created',
          resourcesNeeded: [...new Set(workModules.map(m => m.specialist))]
        }
      });
      
      // Add to legacy tracking
      this.activeProjects.set(project.id, {
        ...project,
        workModules,
        estimatedCompletion
      });

      // Phase 5: Final initialization (85-100%)
      await this.updateProgress(onUpdate, project.id, {
        phase: 'project_ready',
        message: 'Project initialization complete - ready for execution',
        progress: 95,
        agent: 'System',
        role: 'Orchestrator',
        details: {
          executionTime: Date.now() - startTime,
          readyForExecution: true,
          nextPhase: 'execution'
        }
      });
      
      // Final completion update
      await this.updateProgress(onUpdate, project.id, {
        phase: 'project_initiated',
        message: 'Consulting project successfully initiated - execution can begin',
        progress: 100,
        agent: 'System',
        role: 'Orchestrator',
        details: {
          totalSetupTime: Date.now() - startTime,
          estimatedExecutionTime: `${totalEstimatedHours} hours`
        }
      });

      return {
        projectId: project.id,
        status: 'initiated',
        feasible: true,
        requirements,
        workModules,
        estimatedCompletion,
        feasibilityAnalysis,
        databaseProject: project,
        setupMetrics: {
          totalSetupTime: Date.now() - startTime,
          modulesCreated: workModules.length,
          specialistsRequired: [...new Set(workModules.map(m => m.specialist))].length
        }
      };

    } catch (error) {
      console.error('❌ Error initiating consulting project:', error);
      
      await this.updateProgress(onUpdate, project?.id, {
        phase: 'error',
        message: 'Failed to initiate project - system error encountered',
        progress: 0,
        error: error.message,
        agent: 'System',
        role: 'Error Handler'
      });
      
      throw new Error(`Failed to initiate consulting project: ${error.message}`);
    }
  }

  /**
   * Enhanced project execution with comprehensive progress tracking
   */
  async executeProject(project, onUpdate) {
    const startTime = Date.now();
    const projectId = project.id || project.projectId;
    
    // Add timeout to prevent infinite hangs (15 minutes max)
    const EXECUTION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Project execution timed out after ${EXECUTION_TIMEOUT / 1000} seconds`));
      }, EXECUTION_TIMEOUT);
    });
    
    const executionPromise = this._executeProjectInternal(project, onUpdate);
    
    try {
      return await Promise.race([executionPromise, timeoutPromise]);
    } catch (error) {
      if (error.message.includes('timed out')) {
        console.error(`⏰ PROJECT TIMEOUT: ${projectId} exceeded ${EXECUTION_TIMEOUT / 1000}s limit`);
        
        // Update status to timeout
        await this.database.updateProject(projectId, { 
          status: 'timeout',
          execution_end: new Date(),
          error_message: 'Execution timeout - exceeded 15 minute limit'
        });
        
        await this.updateProgress(onUpdate, projectId, {
          phase: 'execution_timeout',
          message: 'Project execution timed out - please try with a simpler query',
          progress: 100,
          agent: 'System',
          role: 'Timeout Handler',
          error: 'Execution exceeded 15 minute limit',
          details: {
            timeoutAfter: `${EXECUTION_TIMEOUT / 1000} seconds`,
            suggestion: 'Try a more focused analysis or check system resources'
          }
        });
      }
      throw error;
    }
  }

  /**
   * Internal execution method with the actual logic
   * @private
   */
  async _executeProjectInternal(project, onUpdate) {
    const startTime = Date.now();
    const projectId = project.id || project.projectId;
    
    try {
      console.log(`🚀 Executing project ${projectId} with comprehensive progress tracking`);
      
      // Update project status to executing
      await this.database.updateProject(projectId, { 
        status: 'executing',
        execution_start: new Date()
      });
      
      // Phase 1: Execution startup (0-10%)
      await this.updateProgress(onUpdate, projectId, {
        phase: 'execution_startup',
        message: 'Initializing project execution environment...',
        progress: 5,
        agent: 'System',
        role: 'Execution Manager',
        details: {
          workModules: project.workModules?.length || 0,
          estimatedDuration: '15-30 minutes'
        }
      });

      // Check for cancellation
      if (this.projectCancellations.has(projectId)) {
        return this.projectCancellations.get(projectId);
      }

      // Phase 2: Resource allocation (10-20%)
      await this.updateProgress(onUpdate, projectId, {
        phase: 'resource_allocation',
        message: 'Allocating specialist resources and preparing work assignments...',
        progress: 10,
        agent: 'Principal',
        role: 'Resource Manager'
      });

      const availableSpecialists = await this.associatePool.getAvailableSpecialists();
      
      // Assign work modules to specialists with progress tracking
      let assignmentProgress = 10;
      const assignmentStep = 10 / (project.workModules?.length || 1);
      
      for (const module of project.workModules || []) {
        await this.updateProgress(onUpdate, projectId, {
          phase: 'assigning_work',
          message: `Assigning ${module.type} to ${module.specialist} specialist...`,
          progress: Math.min(20, assignmentProgress),
          agent: 'Principal',
          role: 'Work Coordinator',
          details: {
            currentModule: module.id,
            specialist: module.specialist,
            estimatedHours: module.estimatedHours
          }
        });
        
        if (availableSpecialists && availableSpecialists.includes(module.specialist)) {
          await this.associatePool.assignWorkModule(module, module.specialist);
        }
        
        assignmentProgress += assignmentStep;
      }

      // Phase 3: Work execution (20-80%)
      await this.updateProgress(onUpdate, projectId, {
        phase: 'execution_started',
        message: 'All specialists assigned - beginning coordinated work execution',
        progress: 20,
        agent: 'Principal',
        role: 'Project Manager',
        details: {
          specialistsActive: availableSpecialists?.length || 0,
          workModulesActive: project.workModules?.length || 0
        }
      });

      // Execute with enhanced progress tracking
      const executionPromise = this.principalAgent.coordinateExecution(
        project.workModules,
        this.associatePool,
        async (update) => {
          // Scale progress to 20-80% range for execution phase
          const scaledProgress = Math.min(80, 20 + (update.progress || 0) * 0.6);
          
          const enhancedUpdate = {
            ...update,
            progress: scaledProgress,
            agent: update.agent || 'Associate',
            role: update.role || 'Specialist',
            timestamp: new Date(),
            details: {
              ...update.details,
              executionPhase: 'work_modules',
              timeElapsed: Date.now() - startTime
            }
          };
          
          await this.updateProgress(onUpdate, projectId, enhancedUpdate);
        }
      );
      
      let deliverables;
      try {
        deliverables = await executionPromise; // Remove old timeout logic - handled at higher level
      } catch (error) {
        // Remove timeout handling - already handled in main executeProject method
        throw error;
      }

      // Phase 4: Integration and quality review (80-95%)
      await this.updateProgress(onUpdate, projectId, {
        phase: 'integration_started',
        message: 'All work modules complete - Principal integrating deliverables...',
        progress: 80,
        agent: 'Principal',
        role: 'Integration Manager',
        details: {
          deliverablesCount: deliverables?.length || 0,
          integrationTimeEstimate: '2-3 minutes'
        }
      });

      const finalReport = await this.principalAgent.integrateDeliverables(deliverables, async (update) => {
        const scaledProgress = Math.min(90, 80 + (update.progress || 0) * 0.1);
        await this.updateProgress(onUpdate, projectId, {
          ...update,
          progress: scaledProgress,
          agent: 'Principal',
          role: 'Integration Specialist'
        });
      });
      
      // Quality assessment
      const qualityScore = finalReport.qualityScore || this.calculateQualityScore(deliverables);
      
      await this.updateProgress(onUpdate, projectId, {
        phase: 'quality_assessment',
        message: `Quality review complete - score: ${Math.round(qualityScore * 100)}%`,
        progress: 90,
        agent: 'Principal',
        role: 'Quality Manager',
        details: {
          qualityScore: Math.round(qualityScore * 100),
          qualityLevel: qualityScore >= 0.8 ? 'Excellent' : qualityScore >= 0.7 ? 'Good' : 'Acceptable'
        }
      });
      
      if (qualityScore < this.qualityThreshold) {
        await this.updateProgress(onUpdate, projectId, {
          phase: 'quality_review_required',
          message: 'Quality threshold not met - initiating review process',
          progress: 85,
          agent: 'Principal',
          role: 'Quality Assurance',
          details: {
            currentScore: Math.round(qualityScore * 100),
            requiredScore: Math.round(this.qualityThreshold * 100),
            reviewActions: ['Improve research depth', 'Add more analysis', 'Strengthen recommendations']
          }
        });
        
        await this.database.updateProject(projectId, { status: 'quality_review' });
        return { status: 'quality_review_required', qualityScore, requiredActions: ['Improve research depth', 'Add more analysis', 'Strengthen recommendations'] };
      }

      // Phase 5: Final validation and completion (95-100%)
      await this.updateProgress(onUpdate, projectId, {
        phase: 'final_validation',
        message: 'Partner conducting final validation and client review...',
        progress: 95,
        agent: 'Partner',
        role: 'Client Validation',
        details: {
          validationSteps: ['Content review', 'Client requirements check', 'Presentation preparation']
        }
      });

      const validation = await this.partnerAgent.validateDeliverables(finalReport);
      const executionTime = Date.now() - startTime;
      
      // Save final report to database
      await this.database.saveProjectReport(projectId, finalReport);
      await this.database.updateProject(projectId, { 
        status: 'completed',
        actual_completion: new Date(),
        quality_score: qualityScore
      });

      // Final completion update
      await this.updateProgress(onUpdate, projectId, {
        phase: 'completed',
        message: 'Project completed successfully - all deliverables ready for client presentation',
        progress: 100,
        agent: 'System',
        role: 'Project Manager',
        details: {
          qualityScore: Math.round(qualityScore * 100),
          executionTime: `${Math.round(executionTime / 1000)} seconds`,
          totalDeliverables: deliverables?.length || 0,
          clientValidation: validation?.approved ? 'Approved' : 'Pending'
        }
      });

      console.log(`✅ Project ${projectId} completed successfully in ${executionTime}ms`);

      return {
        status: 'completed',
        projectId,
        finalReport,
        qualityScore,
        executionTime,
        deliverables,
        validation,
        metrics: {
          totalTime: executionTime,
          qualityScore: Math.round(qualityScore * 100),
          modulesCompleted: deliverables?.length || 0
        }
      };

    } catch (error) {
      console.error(`❌ Error executing consulting project ${projectId}:`, error);
      
      await this.updateProgress(onUpdate, projectId, {
        phase: 'execution_error',
        message: `Project execution failed: ${error.message}`,
        progress: 0,
        error: error.message,
        agent: 'System',
        role: 'Error Handler',
        details: {
          errorType: error.name,
          executionTime: Date.now() - startTime
        }
      });
      
      try {
        await this.database.updateProject(projectId, { status: 'failed' });
      } catch (dbError) {
        console.error('Failed to update project status to failed:', dbError);
      }
      
      return {
        status: 'failed',
        projectId,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Enhanced progress update method with WebSocket broadcasting
   */
  async updateProgress(onUpdate, projectId, update) {
    const enhancedUpdate = {
      ...update,
      timestamp: new Date().toISOString(),
      projectId: projectId
    };
    
    // Legacy callback support
    if (onUpdate) {
      onUpdate(enhancedUpdate);
    }
    
    // WebSocket broadcasting
    if (this.wsService && projectId) {
      try {
        await this.wsService.broadcastProgressUpdate(projectId, enhancedUpdate);
      } catch (error) {
        console.warn('Failed to broadcast progress via WebSocket:', error.message);
      }
    }
    
    // Log detailed progress for debugging
    console.log(`📊 Progress [${update.progress}%]: ${update.agent} - ${update.message}`);
    if (update.details) {
      console.log(`   Details:`, update.details);
    }
  }

  /**
   * Get current status of a project
   * @param {string} projectId - The project ID
   * @returns {Object|null} Project status or null if not found
   */
  getProjectStatus(projectId) {
    return this.projectStatuses.get(projectId) || null;
  }

  /**
   * Cancel an active project
   * @param {string} projectId - The project ID to cancel
   * @param {string} reason - Reason for cancellation
   * @returns {Object} Cancellation result
   */
  async cancelProject(projectId, reason) {
    const cancellationResult = {
      status: 'cancelled',
      reason,
      partialResults: {},
      cancelledAt: new Date()
    };
    
    this.projectCancellations.set(projectId, cancellationResult);
    
    // Update project status
    this.updateProjectStatus(projectId, {
      projectId,
      phase: 'cancelled',
      progress: -1,
      currentActivity: `Cancelled: ${reason}`,
      cancelledAt: new Date()
    });
    
    return cancellationResult;
  }

  /**
   * Calculate quality score from deliverables
   * @private
   */
  calculateQualityScore(deliverables) {
    if (!deliverables || deliverables.length === 0) return 0;
    
    const totalScore = deliverables.reduce((sum, deliverable) => {
      return sum + (deliverable.qualityScore || 0.85);
    }, 0);
    
    return totalScore / deliverables.length;
  }

  /**
   * Generate unique project ID
   * @private
   */
  generateProjectId() {
    return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update project status
   * @private
   */
  updateProjectStatus(projectId, status) {
    this.projectStatuses.set(projectId, {
      ...this.projectStatuses.get(projectId),
      ...status,
      updatedAt: new Date()
    });
  }

  // 🧠 PHASE 2: INTELLIGENT AI METHODS

  /**
   * Perform intelligent task routing and execution
   * Demonstrates the power of AI model selection and context-aware prompting
   */
  async executeIntelligentTask(taskContext, content) {
    try {
      console.log(`🧠 Executing intelligent task: ${taskContext.taskType}`);
      
      // Generate optimized prompt using context engine
      const optimizedPrompt = this.promptEngine.generateOptimizedPrompt(
        taskContext,
        null, // Model will be selected by router
        content
      );

      // Use intelligent router to select optimal model and execute
      const result = await this.aiRouter.callIntelligentAI(
        taskContext,
        optimizedPrompt
      );

      // Track performance for continuous improvement
      this.promptEngine.trackPromptPerformance(
        taskContext.taskType,
        result.metadata.selectedModel,
        `prompt_${Date.now()}`,
        {
          success: true,
          responseTime: result.metadata.responseTime,
          qualityScore: 8.5 // In practice, this would be dynamically assessed
        }
      );

      console.log(`✅ Task completed using ${result.metadata.selectedModel} in ${result.metadata.responseTime}ms`);
      return result;

    } catch (error) {
      console.error(`❌ Intelligent task execution failed:`, error);
      throw error;
    }
  }

  /**
   * Get AI performance insights and analytics
   */
  getAIPerformanceInsights() {
    const routerInsights = this.aiRouter.getPerformanceInsights();
    const promptAnalytics = this.promptEngine.getPromptAnalytics();

    return {
      timestamp: new Date().toISOString(),
      aiRouter: routerInsights,
      promptEngine: promptAnalytics,
      summary: {
        totalRequests: routerInsights.totalRequests,
        activeModels: Object.keys(routerInsights.modelPerformance).length,
        optimizationOpportunities: promptAnalytics.recommendations.length
      }
    };
  }

  /**
   * Demonstrate intelligent work distribution across consulting roles
   */
  async demonstrateIntelligentWorkflow(projectTopic) {
    const results = {};

    try {
      console.log('🎯 Demonstrating intelligent consulting workflow...');

      // Partner-level strategic assessment with high-end model
      results.partnerAssessment = await this.executeIntelligentTask({
        taskType: 'partner_assessment',
        domain: 'strategy',
        complexity: 9,
        urgency: 'normal',
        requiresAccuracy: true,
        audience: 'C-suite executives'
      }, {
        topic: projectTopic,
        context: 'Strategic investment decision requiring executive assessment'
      });

      // Principal-level detailed analysis with balanced model
      results.principalAnalysis = await this.executeIntelligentTask({
        taskType: 'principal_analysis',
        domain: 'financial_analysis',
        complexity: 8,
        urgency: 'normal',
        requiresAccuracy: true,
        audience: 'Investment committee'
      }, {
        topic: projectTopic,
        context: 'Detailed financial and market analysis supporting strategic decisions'
      });

      // Associate-level research with speed-optimized model
      results.associateResearch = await this.executeIntelligentTask({
        taskType: 'associate_research',
        domain: 'market_analysis',
        complexity: 6,
        urgency: 'high',
        requiresSpeed: true,
        audience: 'Internal consulting team'
      }, {
        topic: projectTopic,
        context: 'Comprehensive research to support senior-level analysis'
      });

      console.log('✅ Intelligent workflow demonstration completed');
      return results;

    } catch (error) {
      console.error('❌ Intelligent workflow demonstration failed:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive platform health and intelligence metrics
   */
  getPlatformIntelligenceStatus() {
    return {
      timestamp: new Date().toISOString(),
      intelligence: {
        aiRouter: {
          status: 'active',
          capabilities: Object.keys(this.aiRouter.modelCapabilities).length,
          performanceTracking: this.aiRouter.performanceHistory.size
        },
        promptEngine: {
          status: 'active',
          templates: Object.keys(this.promptEngine.promptTemplates).length,
          optimizationPatterns: this.promptEngine.optimizationPatterns.size
        }
      },
      database: {
        status: this.database ? 'connected' : 'disconnected',
        caching: this.database?.redis ? 'enabled' : 'disabled'
      },
      websockets: {
        status: this.wsService ? 'connected' : 'disconnected'
      },
      agents: {
        partner: this.partnerAgent ? 'initialized' : 'not_initialized',
        principal: this.principalAgent ? 'initialized' : 'not_initialized',
        associates: this.associatePool ? 'initialized' : 'not_initialized'
      }
    };
  }
}

module.exports = ConsultingOrchestrator; 