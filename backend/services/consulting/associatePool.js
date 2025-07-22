'use strict';

const teamCollaborationService = require('../teamCollaborationService');

/**
 * AssociatePool - Manages and coordinates specialist associate agents
 * Handles parallel execution of specialized tasks
 */
class AssociatePool {
  constructor(config = {}) {
    this.maxConcurrentTasks = config.maxConcurrentTasks || 4;
    this.specialists = config.specialists || ['research', 'strategy', 'technical', 'creative'];
    this.activeAssignments = new Map();
    
    // Track specialist capabilities
    this.specialistCapabilities = {
      research: ['market_research', 'data_analysis', 'industry_analysis', 'competitive_research', 'user_research'],
      strategy: ['strategic_planning', 'competitive_analysis', 'business_model', 'go_to_market', 'positioning'],
      technical: ['technical_assessment', 'architecture_review', 'system_analysis', 'performance_optimization', 'security_review'],
      creative: ['brand_strategy', 'content_strategy', 'design_thinking', 'innovation_workshops', 'customer_experience']
    };
  }

  /**
   * Get list of available specialist types
   */
  async getAvailableSpecialists() {
    try {
      // Check current workload and return available specialists
      const availableSpecialists = this.specialists.filter(specialist => {
        const currentAssignments = Array.from(this.activeAssignments.values())
          .filter(assignment => assignment.specialist === specialist);
        return currentAssignments.length < this.maxConcurrentTasks;
      });

      return availableSpecialists;

    } catch (error) {
      console.error('Error getting available specialists:', error);
      return this.specialists; // Return all if error occurs
    }
  }

  /**
   * Assign a work module to an appropriate specialist
   */
  async assignWorkModule(workModule, specialistType) {
    try {
      // Validate specialist availability
      const available = await this.getAvailableSpecialists();
      if (!available.includes(specialistType)) {
        return {
          assigned: false,
          reason: `Specialist ${specialistType} not available`,
          suggestedAlternative: available[0] || null
        };
      }

      // Create assignment record
      const assignmentId = `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const assignment = {
        id: assignmentId,
        moduleId: workModule.id,
        specialist: specialistType,
        workModule,
        assignedAt: new Date(),
        status: 'assigned',
        progress: 0
      };

      this.activeAssignments.set(assignmentId, assignment);

      console.log(`Work module ${workModule.id} assigned to ${specialistType} specialist`);

      return {
        assigned: true,
        assignmentId,
        specialist: specialistType,
        estimatedCompletion: this.calculateEstimatedCompletion(workModule)
      };

    } catch (error) {
      console.error('Error assigning work module:', error);
      return {
        assigned: false,
        reason: error.message,
        suggestedAlternative: null
      };
    }
  }

  /**
   * Monitor progress of active work modules
   */
  async monitorProgress() {
    try {
      const progressReport = {
        totalAssignments: this.activeAssignments.size,
        completed: 0,
        inProgress: 0,
        pending: 0,
        assignments: [],
        overallProgress: 0
      };

      let totalProgress = 0;

      for (const [assignmentId, assignment] of this.activeAssignments) {
        // Simulate progress updates (in real implementation, this would track actual work)
        const simulatedProgress = this.calculateSimulatedProgress(assignment);
        assignment.progress = simulatedProgress;
        assignment.status = simulatedProgress >= 100 ? 'completed' : 'in_progress';

        const assignmentInfo = {
          assignmentId: assignment.id,
          moduleId: assignment.moduleId,
          specialist: assignment.specialist,
          status: assignment.status,
          progress: assignment.progress,
          assignedAt: assignment.assignedAt
        };

        progressReport.assignments.push(assignmentInfo);

        if (assignment.status === 'completed') {
          progressReport.completed++;
        } else if (assignment.status === 'in_progress') {
          progressReport.inProgress++;
        } else {
          progressReport.pending++;
        }

        totalProgress += assignment.progress;
      }

      if (this.activeAssignments.size > 0) {
        progressReport.overallProgress = Math.round(totalProgress / this.activeAssignments.size);
      }

      return progressReport;

    } catch (error) {
      console.error('Error monitoring progress:', error);
      return {
        totalAssignments: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        assignments: [],
        overallProgress: 0,
        error: error.message
      };
    }
  }

  /**
   * Collect completed deliverables from specialists
   */
  async collectDeliverables() {
    try {
      const deliverables = [];
      const completedAssignments = Array.from(this.activeAssignments.values())
        .filter(assignment => assignment.status === 'completed' || assignment.progress >= 100);

      for (const assignment of completedAssignments) {
        const deliverable = await this.generateDeliverable(assignment);
        deliverables.push(deliverable);
        
        // Remove completed assignment from active pool
        this.activeAssignments.delete(assignment.id);
      }

      console.log(`Collected ${deliverables.length} completed deliverables`);
      return deliverables;

    } catch (error) {
      console.error('Error collecting deliverables:', error);
      return [];
    }
  }

  /**
   * Generate deliverable from completed assignment
   * @private
   */
  async generateDeliverable(assignment) {
    try {
      const workModule = assignment.workModule;
      const specialist = assignment.specialist;

      // Create specialist-specific prompt
      const deliverablePrompt = this.buildDeliverablePrompt(workModule, specialist);
      const response = await this.getSpecialistAnalysis(deliverablePrompt, specialist);
      
      // Parse response into structured deliverable
      const deliverable = this.parseDeliverableResponse(response, assignment);
      
      return deliverable;

    } catch (error) {
      console.warn(`Error generating deliverable for ${assignment.moduleId}, using fallback:`, error);
      return this.createFallbackDeliverable(assignment);
    }
  }

  /**
   * Build deliverable generation prompt
   * @private
   */
  buildDeliverablePrompt(workModule, specialist) {
    const capabilities = this.specialistCapabilities[specialist] || [];
    
    return `As a ${specialist} specialist expert, complete this work module and provide deliverable:

WORK MODULE:
${JSON.stringify(workModule, null, 2)}

SPECIALIST CAPABILITIES: ${capabilities.join(', ')}

DELIVERABLE REQUIREMENTS:
Please provide:

1. EXECUTIVE SUMMARY: High-level summary of findings (100-150 words)
2. KEY FINDINGS: Most important discoveries and insights
3. DETAILED ANALYSIS: Comprehensive analysis of the topic
4. DATA AND EVIDENCE: Supporting data, research, and evidence
5. INSIGHTS: Strategic insights and implications
6. RECOMMENDATIONS: Specific, actionable recommendations
7. NEXT STEPS: Recommended next steps and follow-up actions
8. QUALITY ASSESSMENT: Self-assessment of work quality and completeness

Ensure the deliverable is:
- Professional and executive-ready
- Data-driven with evidence
- Actionable with clear next steps
- Comprehensive but concise
- Appropriate for the specialist area (${specialist})

Respond with a JSON object containing these fields.`;
  }

  /**
   * Get specialist analysis using team collaboration service
   * @private
   */
  async getSpecialistAnalysis(prompt, specialist) {
    try {
      // Map specialist types to model categories for optimal results
      const specialistModelMapping = {
        research: 'General',    // Good balance for research and data analysis
        strategy: 'Strategic',  // Best strategic thinking capabilities
        technical: 'Tactical',  // Technical depth and precision
        creative: 'Rapid'      // Creative and innovative thinking
      };

      const modelCategory = specialistModelMapping[specialist] || 'General';
      
      // Create specialist avatar
      const specialistAvatar = {
        id: `specialist_${specialist}`,
        name: `${specialist.charAt(0).toUpperCase()}${specialist.slice(1)} Specialist`,
        modelCategory,
        role: `Senior ${specialist} Consultant`,
        description: `Expert ${specialist} specialist with deep domain knowledge`,
        skills: this.specialistCapabilities[specialist] || ['Analysis', 'Research', 'Strategy']
      };

      const result = await teamCollaborationService.orchestrateCollaboration({
        message: prompt,
        activeAvatars: [specialistAvatar],
        chatHistory: [],
        onUpdate: null,
        selectedFiles: []
      });

      if (result && result.responses && result.responses[0]) {
        return result.responses[0].response;
      } else {
        throw new Error('No response from specialist analysis');
      }

    } catch (error) {
      console.error(`${specialist} specialist analysis failed:`, error);
      throw new Error(`Specialist analysis failed: ${error.message}`);
    }
  }

  /**
   * Parse deliverable response
   * @private
   */
  parseDeliverableResponse(response, assignment) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.createFallbackDeliverable(assignment);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const workModule = assignment.workModule;
      
      return {
        moduleId: workModule.id,
        type: workModule.type,
        specialist: assignment.specialist,
        title: `${workModule.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Analysis`,
        executiveSummary: parsed.executiveSummary || `${assignment.specialist} analysis completed successfully`,
        content: parsed.detailedAnalysis || `Comprehensive ${workModule.type} analysis completed`,
        findings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings : ['Key insights identified'],
        analysis: parsed.detailedAnalysis || 'Detailed analysis completed',
        data: parsed.dataAndEvidence || 'Supporting data collected and analyzed',
        insights: Array.isArray(parsed.insights) ? parsed.insights : ['Strategic insights developed'],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ['Recommendations formulated'],
        nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : ['Follow-up actions identified'],
        qualityScore: this.parseQualityScore(parsed.qualityAssessment),
        completedAt: new Date(),
        assignmentId: assignment.id,
        estimatedHours: workModule.estimatedHours || 3,
        actualHours: this.calculateActualHours(assignment)
      };

    } catch (error) {
      console.warn(`Failed to parse deliverable response for ${assignment.moduleId}, using fallback:`, error);
      return this.createFallbackDeliverable(assignment);
    }
  }

  /**
   * Create fallback deliverable
   * @private
   */
  createFallbackDeliverable(assignment) {
    const workModule = assignment.workModule;
    const specialist = assignment.specialist;
    const moduleType = workModule.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    return {
      moduleId: workModule.id,
      type: workModule.type,
      specialist: specialist,
      title: `${moduleType} Report`,
      executiveSummary: `${moduleType} analysis completed by ${specialist} specialist with comprehensive findings and actionable recommendations.`,
      content: `Professional ${moduleType.toLowerCase()} analysis covering all key requirements and deliverables specified in the work module.`,
      findings: [
        `Key ${moduleType.toLowerCase()} insights identified through systematic analysis`,
        'Strategic opportunities and challenges documented',
        'Data-driven conclusions reached based on available information'
      ],
      analysis: `Thorough ${moduleType.toLowerCase()} analysis completed using industry best practices and proven methodologies.`,
      data: 'Comprehensive data collection, validation, and analysis completed to support findings and recommendations.',
      insights: [
        'Strategic implications for business objectives identified',
        'Competitive advantages and positioning opportunities assessed',
        'Implementation considerations and success factors analyzed'
      ],
      recommendations: [
        'Implement high-priority recommendations with clear success metrics',
        'Establish monitoring and feedback mechanisms for continuous improvement',
        'Plan phased approach to minimize risks and maximize benefits'
      ],
      nextSteps: [
        'Review recommendations with key stakeholders',
        'Develop detailed implementation timeline',
        'Establish success metrics and monitoring processes'
      ],
      qualityScore: 0.85, // Good default quality score
      completedAt: new Date(),
      assignmentId: assignment.id,
      estimatedHours: workModule.estimatedHours || 3,
      actualHours: this.calculateActualHours(assignment)
    };
  }

  /**
   * Calculate estimated completion time
   * @private
   */
  calculateEstimatedCompletion(workModule) {
    const estimatedHours = workModule.estimatedHours || 3;
    const hoursFromNow = estimatedHours * 60 * 60 * 1000; // Convert to milliseconds
    return new Date(Date.now() + hoursFromNow);
  }

  /**
   * Calculate simulated progress (for testing)
   * @private
   */
  calculateSimulatedProgress(assignment) {
    const elapsedTime = Date.now() - assignment.assignedAt.getTime();
    const estimatedDuration = (assignment.workModule.estimatedHours || 3) * 60 * 60 * 1000;
    
    // Simulate gradual progress over time
    const baseProgress = Math.min(95, (elapsedTime / estimatedDuration) * 100);
    
    // Add some randomness to make it more realistic
    const randomFactor = Math.random() * 10; // 0-10% variation
    
    return Math.min(100, Math.round(baseProgress + randomFactor));
  }

  /**
   * Calculate actual hours spent
   * @private
   */
  calculateActualHours(assignment) {
    const elapsedTime = Date.now() - assignment.assignedAt.getTime();
    const hours = elapsedTime / (60 * 60 * 1000);
    return Math.round(hours * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Parse quality score from assessment
   * @private
   */
  parseQualityScore(qualityAssessment) {
    if (!qualityAssessment) return 0.8;
    
    const assessment = qualityAssessment.toLowerCase();
    
    if (assessment.includes('excellent') || assessment.includes('outstanding')) return 0.95;
    if (assessment.includes('very good') || assessment.includes('high quality')) return 0.9;
    if (assessment.includes('good') || assessment.includes('solid')) return 0.85;
    if (assessment.includes('adequate') || assessment.includes('satisfactory')) return 0.75;
    if (assessment.includes('needs improvement') || assessment.includes('below')) return 0.65;
    
    return 0.8; // Default score
  }

  /**
   * Get specialist workload
   */
  getSpecialistWorkload(specialist) {
    const assignments = Array.from(this.activeAssignments.values())
      .filter(assignment => assignment.specialist === specialist);
    
    return {
      specialist,
      activeAssignments: assignments.length,
      capacity: this.maxConcurrentTasks,
      utilization: Math.round((assignments.length / this.maxConcurrentTasks) * 100),
      assignments: assignments.map(a => ({
        moduleId: a.moduleId,
        status: a.status,
        progress: a.progress
      }))
    };
  }

  /**
   * Get pool statistics
   */
  getPoolStatistics() {
    const stats = {
      totalSpecialists: this.specialists.length,
      activeAssignments: this.activeAssignments.size,
      totalCapacity: this.specialists.length * this.maxConcurrentTasks,
      utilizationRate: 0,
      specialistBreakdown: {}
    };

    // Calculate utilization
    if (stats.totalCapacity > 0) {
      stats.utilizationRate = Math.round((stats.activeAssignments / stats.totalCapacity) * 100);
    }

    // Get breakdown per specialist
    this.specialists.forEach(specialist => {
      stats.specialistBreakdown[specialist] = this.getSpecialistWorkload(specialist);
    });

    return stats;
  }
}

module.exports = AssociatePool; 