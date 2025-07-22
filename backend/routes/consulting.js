const express = require('express');
const router = express.Router();
const ConsultingOrchestrator = require('../services/consulting/consultingOrchestrator');

// Initialize the consulting orchestrator
const consultingOrchestrator = new ConsultingOrchestrator();

/**
 * POST /api/consulting/start
 * Start a new consulting project
 */
router.post('/start', async (req, res) => {
  try {
    const { query, context, expectedDeliverables, timeframe, budget, stakeholders, urgency } = req.body;

    if (!query) {
      return res.status(400).json({ 
        error: 'Query is required',
        message: 'Please provide a description of what you need help with'
      });
    }

    const clientRequest = {
      query,
      context: context || '',
      expectedDeliverables: expectedDeliverables || [],
      timeframe: timeframe || '',
      budget: budget || '',
      stakeholders: stakeholders || [],
      urgency: urgency || 'normal'
    };

    // Set up progress callback
    const progressUpdates = [];
    const onUpdate = (update) => {
      progressUpdates.push({
        ...update,
        timestamp: new Date()
      });
      console.log('Consulting progress:', update);
    };

    console.log('Starting consulting project:', clientRequest);
    
    const result = await consultingOrchestrator.startConsultingProject(clientRequest, onUpdate);
    
    res.json({
      success: true,
      project: result,
      progressUpdates
    });

  } catch (error) {
    console.error('Error starting consulting project:', error);
    res.status(500).json({
      error: 'Failed to start consulting project',
      message: error.message
    });
  }
});

/**
 * POST /api/consulting/execute/:projectId
 * Execute a consulting project
 */
router.post('/execute/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = req.body.project;

    if (!project) {
      return res.status(400).json({
        error: 'Project data is required',
        message: 'Please provide the project object to execute'
      });
    }

    // Set up progress callback
    const progressUpdates = [];
    const onUpdate = (update) => {
      progressUpdates.push({
        ...update,
        timestamp: new Date()
      });
      console.log('Execution progress:', update);
    };

    console.log('Executing consulting project:', projectId);
    
    const result = await consultingOrchestrator.executeProject(project, onUpdate);
    
    console.log('✅ EXECUTION RESULT DEBUG:');
    console.log('Status:', result.status);
    console.log('Final Report Keys:', Object.keys(result.finalReport || {}));
    console.log('Executive Summary Length:', result.finalReport?.executiveSummary?.length || 0);
    console.log('Key Findings Count:', result.finalReport?.keyFindings?.length || 0);
    console.log('Recommendations Count:', result.finalReport?.recommendations?.length || 0);
    console.log('Deliverables Count:', result.finalReport?.deliverables?.length || 0);
    
    res.json({
      success: true,
      execution: result,
      progressUpdates
    });

  } catch (error) {
    console.error('Error executing consulting project:', error);
    res.status(500).json({
      error: 'Failed to execute consulting project',
      message: error.message
    });
  }
});

/**
 * GET /api/consulting/status/:projectId
 * Get project status
 */
router.get('/status/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const status = consultingOrchestrator.getProjectStatus(projectId);
    
    if (!status) {
      return res.status(404).json({
        error: 'Project not found',
        message: `Project ${projectId} does not exist`
      });
    }

    res.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('Error getting project status:', error);
    res.status(500).json({
      error: 'Failed to get project status',
      message: error.message
    });
  }
});

/**
 * POST /api/consulting/cancel/:projectId
 * Cancel a consulting project
 */
router.post('/cancel/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { reason } = req.body;
    
    const result = await consultingOrchestrator.cancelProject(
      projectId, 
      reason || 'User requested cancellation'
    );
    
    res.json({
      success: true,
      cancellation: result
    });

  } catch (error) {
    console.error('Error cancelling consulting project:', error);
    res.status(500).json({
      error: 'Failed to cancel consulting project', 
      message: error.message
    });
  }
});

/**
 * POST /api/consulting/quick-test
 * Quick test endpoint for development
 */
router.post('/quick-test', async (req, res) => {
  try {
    const testRequest = {
      query: req.body.query || 'I need a market analysis for my AI startup targeting enterprise clients',
      context: req.body.context || 'B2B SaaS, 50 employees, $5M ARR, looking to expand',
      timeframe: req.body.timeframe || '4 weeks',
      budget: req.body.budget || '$25,000',
      urgency: req.body.urgency || 'normal'
    };

    console.log('Quick test request:', testRequest);

    const progressUpdates = [];
    const onUpdate = (update) => {
      progressUpdates.push(update);
      console.log('Test progress:', update);
    };

    // Start the project
    const project = await consultingOrchestrator.startConsultingProject(testRequest, onUpdate);
    
    // If feasible, execute it
    let execution = null;
    if (project.status === 'initiated') {
      execution = await consultingOrchestrator.executeProject(project, onUpdate);
    }

    res.json({
      success: true,
      testRequest,
      project,
      execution,
      progressUpdates,
      message: 'Consulting system test completed successfully!'
    });

  } catch (error) {
    console.error('Error in quick test:', error);
    res.status(500).json({
      error: 'Quick test failed',
      message: error.message,
      stack: error.stack
    });
  }
});

module.exports = router; 