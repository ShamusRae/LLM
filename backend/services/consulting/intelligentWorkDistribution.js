// Intelligent Work Distribution System for Professional Consulting Platform
// Optimally assigns tasks across Partner-Principal-Associate hierarchy

class IntelligentWorkDistribution {
  constructor() {
    // Role capability definitions
    this.roleCapabilities = {
      partner: {
        complexity: { min: 7, max: 10, optimal: 9 },
        domains: ['strategy', 'executive_relations', 'business_development', 'risk_assessment'],
        responsibilities: ['strategic_assessment', 'client_presentation', 'final_recommendations'],
        bandwidth: { max: 3, optimal: 2 }, // Concurrent projects
        hourlyValue: 1000,
        decisionAuthority: 10
      },
      
      principal: {
        complexity: { min: 5, max: 9, optimal: 7 },
        domains: ['financial_analysis', 'market_research', 'project_management', 'technical_analysis'],
        responsibilities: ['detailed_analysis', 'project_coordination', 'quality_assurance'],
        bandwidth: { max: 5, optimal: 3 },
        hourlyValue: 600,
        decisionAuthority: 7
      },
      
      associate: {
        complexity: { min: 1, max: 7, optimal: 4 },
        domains: ['data_analysis', 'research', 'documentation', 'preliminary_analysis'],
        responsibilities: ['data_gathering', 'basic_analysis', 'report_preparation'],
        bandwidth: { max: 8, optimal: 5 },
        hourlyValue: 300,
        decisionAuthority: 3
      }
    };

    // Task classification matrix
    this.taskTypes = {
      'strategic_assessment': {
        baseComplexity: 9,
        requiredRole: 'partner',
        estimatedHours: 4,
        dependencies: [],
        criticalPath: true
      },
      
      'financial_analysis': {
        baseComplexity: 7,
        requiredRole: 'principal',
        estimatedHours: 6,
        dependencies: ['data_gathering'],
        criticalPath: true
      },
      
      'market_research': {
        baseComplexity: 5,
        requiredRole: 'principal',
        estimatedHours: 8,
        dependencies: ['data_gathering'],
        criticalPath: false
      },
      
      'competitive_analysis': {
        baseComplexity: 6,
        requiredRole: 'principal',
        estimatedHours: 5,
        dependencies: ['market_research'],
        criticalPath: false
      },
      
      'data_gathering': {
        baseComplexity: 3,
        requiredRole: 'associate',
        estimatedHours: 4,
        dependencies: [],
        criticalPath: false
      },
      
      'report_preparation': {
        baseComplexity: 4,
        requiredRole: 'associate',
        estimatedHours: 6,
        dependencies: ['financial_analysis', 'market_research'],
        criticalPath: false
      },
      
      'quality_review': {
        baseComplexity: 6,
        requiredRole: 'principal',
        estimatedHours: 2,
        dependencies: ['report_preparation'],
        criticalPath: true
      },
      
      'client_presentation': {
        baseComplexity: 8,
        requiredRole: 'partner',
        estimatedHours: 3,
        dependencies: ['quality_review'],
        criticalPath: true
      }
    };

    // Current workload tracking
    this.currentWorkloads = {
      partner: { activeProjects: 0, totalHours: 0, efficiency: 0.9 },
      principal: { activeProjects: 0, totalHours: 0, efficiency: 0.85 },
      associate: { activeProjects: 0, totalHours: 0, efficiency: 0.8 }
    };

    // Performance history for optimization
    this.performanceHistory = new Map();
    this.workflowPatterns = new Map();
  }

  /**
   * Intelligently distribute work for a consulting project
   * @param {Object} projectContext - Project details and requirements
   * @returns {Object} Optimized work distribution plan
   */
  createWorkDistributionPlan(projectContext) {
    const {
      projectType = 'comprehensive_analysis',
      complexity = 7,
      urgency = 'normal',
      budget = 'medium',
      clientTier = 'enterprise',
      timeline = 'standard',
      specialRequirements = []
    } = projectContext;

    console.log(`🎯 Creating intelligent work distribution plan for ${projectType}`);

    // Step 1: Identify required tasks based on project type
    const requiredTasks = this.identifyRequiredTasks(projectType, complexity, specialRequirements);
    
    // Step 2: Create task dependency graph
    const dependencyGraph = this.buildDependencyGraph(requiredTasks);
    
    // Step 3: Optimize role assignments
    const roleAssignments = this.optimizeRoleAssignments(requiredTasks, projectContext);
    
    // Step 4: Create execution timeline
    const executionTimeline = this.createExecutionTimeline(roleAssignments, dependencyGraph, urgency);
    
    // Step 5: Calculate resource requirements and costs
    const resourcePlan = this.calculateResourceRequirements(roleAssignments, timeline);

    const distributionPlan = {
      projectId: projectContext.projectId || `proj_${Date.now()}`,
      tasks: roleAssignments,
      timeline: executionTimeline,
      resources: resourcePlan,
      criticalPath: this.identifyCriticalPath(dependencyGraph),
      riskFactors: this.assessRiskFactors(roleAssignments, projectContext),
      optimization: this.getOptimizationInsights(roleAssignments)
    };

    console.log(`✅ Work distribution plan created: ${roleAssignments.length} tasks across ${this.getUniqueRoles(roleAssignments).length} roles`);
    
    return distributionPlan;
  }

  /**
   * Identify required tasks based on project characteristics
   */
  identifyRequiredTasks(projectType, complexity, specialRequirements) {
    const baseTasks = [];

    // Standard consulting workflow
    if (projectType.includes('analysis') || projectType === 'comprehensive_analysis') {
      baseTasks.push(
        'strategic_assessment',
        'data_gathering', 
        'financial_analysis',
        'market_research',
        'competitive_analysis',
        'report_preparation',
        'quality_review',
        'client_presentation'
      );
    }

    // Add complexity-based tasks
    if (complexity >= 8) {
      baseTasks.push('risk_assessment', 'scenario_modeling');
    }

    if (complexity >= 9) {
      baseTasks.push('stakeholder_analysis', 'implementation_planning');
    }

    // Add special requirement tasks
    specialRequirements.forEach(req => {
      if (req === 'technical_analysis') baseTasks.push('technical_deep_dive');
      if (req === 'regulatory_compliance') baseTasks.push('compliance_review');
      if (req === 'change_management') baseTasks.push('change_strategy');
    });

    return baseTasks.filter(task => this.taskTypes[task]).map(taskType => ({
      id: `${taskType}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: taskType,
      ...this.taskTypes[taskType],
      status: 'pending'
    }));
  }

  /**
   * Build task dependency graph
   */
  buildDependencyGraph(tasks) {
    const graph = new Map();
    
    tasks.forEach(task => {
      graph.set(task.id, {
        task,
        dependencies: task.dependencies.map(depType => 
          tasks.find(t => t.type === depType)?.id
        ).filter(Boolean),
        dependents: []
      });
    });

    // Build reverse dependencies
    graph.forEach((node, taskId) => {
      node.dependencies.forEach(depId => {
        if (graph.has(depId)) {
          graph.get(depId).dependents.push(taskId);
        }
      });
    });

    return graph;
  }

  /**
   * Optimize role assignments using intelligent algorithms
   */
  optimizeRoleAssignments(tasks, projectContext) {
    const assignments = [];
    const { urgency, budget, clientTier } = projectContext;

    // Sort tasks by priority (critical path first, then complexity)
    const sortedTasks = tasks.sort((a, b) => {
      if (a.criticalPath !== b.criticalPath) return b.criticalPath - a.criticalPath;
      return b.baseComplexity - a.baseComplexity;
    });

    sortedTasks.forEach(task => {
      const optimalRole = this.selectOptimalRole(task, projectContext);
      const adjustedComplexity = this.adjustComplexityForContext(task.baseComplexity, projectContext);
      
      const assignment = {
        taskId: task.id,
        taskType: task.type,
        assignedRole: optimalRole,
        complexity: adjustedComplexity,
        estimatedHours: this.estimateHours(task, optimalRole, projectContext),
        priority: this.calculatePriority(task, projectContext),
        aiModelRecommendation: this.recommendAIModel(task, optimalRole),
        qualityRequirements: this.defineQualityRequirements(task, clientTier)
      };

      assignments.push(assignment);
      
      // Update workload tracking
      this.updateWorkloadProjection(optimalRole, assignment.estimatedHours);
    });

    return assignments;
  }

  /**
   * Select optimal role for a task using intelligent scoring
   */
  selectOptimalRole(task, projectContext) {
    const { urgency, budget, clientTier } = projectContext;
    let scores = {};

    // Score each role
    Object.keys(this.roleCapabilities).forEach(role => {
      const capabilities = this.roleCapabilities[role];
      let score = 0;

      // Complexity match scoring
      if (task.baseComplexity >= capabilities.complexity.min && 
          task.baseComplexity <= capabilities.complexity.max) {
        const complexityFit = 1 - Math.abs(task.baseComplexity - capabilities.complexity.optimal) / 10;
        score += complexityFit * 40;
      }

      // Domain expertise scoring
      const domainMatch = capabilities.domains.some(domain => 
        task.type.includes(domain.replace('_', '')) || 
        capabilities.responsibilities.includes(task.type)
      );
      if (domainMatch) score += 30;

      // Workload scoring (prefer less loaded resources)
      const currentLoad = this.currentWorkloads[role];
      const loadPenalty = (currentLoad.activeProjects / capabilities.bandwidth.max) * 20;
      score -= loadPenalty;

      // Budget considerations
      if (budget === 'low' && capabilities.hourlyValue > 500) score -= 15;
      if (budget === 'high' && role === 'partner') score += 10;

      // Urgency considerations
      if (urgency === 'high' && role === 'associate') score += 10; // Associates are faster to deploy
      if (urgency === 'low' && role === 'partner') score -= 5; // Don't overuse partners for non-urgent work

      // Client tier considerations
      if (clientTier === 'enterprise' && role === 'partner') score += 15;

      scores[role] = Math.max(0, score);
    });

    // Select highest scoring role
    const optimalRole = Object.entries(scores).reduce((a, b) => 
      scores[a[0]] > scores[b[0]] ? a : b
    )[0];

    return optimalRole;
  }

  /**
   * Create execution timeline with parallel processing optimization
   */
  createExecutionTimeline(assignments, dependencyGraph, urgency) {
    const timeline = [];
    const completed = new Set();
    const inProgress = new Set();
    let currentDay = 0;
    
    const urgencyMultiplier = { low: 1.2, normal: 1, high: 0.8, critical: 0.6 };
    const speedFactor = urgencyMultiplier[urgency] || 1;

    while (completed.size < assignments.length) {
      // Find tasks that can start (dependencies met)
      const readyTasks = assignments.filter(assignment => {
        const task = assignment;
        const node = Array.from(dependencyGraph.values()).find(n => n.task.id === task.taskId);
        
        return !completed.has(task.taskId) && 
               !inProgress.has(task.taskId) &&
               node?.dependencies.every(depId => completed.has(depId));
      });

      // Group by role for parallel execution
      const roleGroups = this.groupTasksByRole(readyTasks);
      
      // Schedule tasks for current day
      Object.entries(roleGroups).forEach(([role, tasks]) => {
        const capabilities = this.roleCapabilities[role];
        const dailyCapacity = 8; // 8-hour workday
        let remainingCapacity = dailyCapacity;

        tasks.forEach(task => {
          const adjustedHours = task.estimatedHours * speedFactor;
          if (adjustedHours <= remainingCapacity) {
            timeline.push({
              day: currentDay,
              role,
              taskId: task.taskId,
              taskType: task.taskType,
              duration: adjustedHours,
              startTime: dailyCapacity - remainingCapacity,
              endTime: dailyCapacity - remainingCapacity + adjustedHours
            });
            
            inProgress.add(task.taskId);
            remainingCapacity -= adjustedHours;
          }
        });
      });

      // Mark tasks as completed and move to next day
      inProgress.forEach(taskId => completed.add(taskId));
      inProgress.clear();
      currentDay++;

      // Safety break to prevent infinite loops
      if (currentDay > 30) break;
    }

    return timeline;
  }

  /**
   * Calculate comprehensive resource requirements
   */
  calculateResourceRequirements(assignments, timeline) {
    const resources = {
      totalHours: 0,
      totalCost: 0,
      roleBreakdown: {},
      peakConcurrency: 0,
      estimatedDuration: Math.max(...assignments.map(a => a.estimatedHours))
    };

    // Calculate by role
    Object.keys(this.roleCapabilities).forEach(role => {
      const roleTasks = assignments.filter(a => a.assignedRole === role);
      const roleHours = roleTasks.reduce((sum, task) => sum + task.estimatedHours, 0);
      const roleCost = roleHours * this.roleCapabilities[role].hourlyValue;

      resources.roleBreakdown[role] = {
        tasks: roleTasks.length,
        hours: roleHours,
        cost: roleCost,
        utilization: Math.min(100, (roleHours / (this.roleCapabilities[role].bandwidth.optimal * 8)) * 100)
      };

      resources.totalHours += roleHours;
      resources.totalCost += roleCost;
    });

    return resources;
  }

  // Helper methods
  adjustComplexityForContext(baseComplexity, context) {
    let adjusted = baseComplexity;
    
    if (context.urgency === 'critical') adjusted += 1;
    if (context.clientTier === 'enterprise') adjusted += 0.5;
    if (context.budget === 'low') adjusted -= 0.5;
    
    return Math.max(1, Math.min(10, adjusted));
  }

  estimateHours(task, role, context) {
    const baseHours = task.estimatedHours;
    const roleEfficiency = this.roleCapabilities[role].bandwidth.optimal / this.roleCapabilities[role].bandwidth.max;
    const complexityMultiplier = task.baseComplexity / 5; // Normalize to ~1.0
    
    let estimated = baseHours * complexityMultiplier / roleEfficiency;
    
    // Context adjustments
    if (context.urgency === 'high') estimated *= 0.9; // Rush factor
    if (context.budget === 'high') estimated *= 1.1; // Quality factor
    
    return Math.round(estimated * 10) / 10; // Round to 1 decimal
  }

  calculatePriority(task, context) {
    let priority = task.criticalPath ? 10 : 5;
    priority += task.baseComplexity * 0.5;
    
    if (context.urgency === 'critical') priority += 5;
    if (context.clientTier === 'enterprise') priority += 2;
    
    return Math.min(10, priority);
  }

  recommendAIModel(task, role) {
    const recommendations = {
      partner: {
        strategic_assessment: 'claude-3-opus',
        client_presentation: 'claude-3-opus'
      },
      principal: {
        financial_analysis: 'gpt-4',
        market_research: 'claude-3-sonnet',
        quality_review: 'claude-3-sonnet'
      },
      associate: {
        data_gathering: 'claude-3-haiku',
        report_preparation: 'gpt-3.5-turbo'
      }
    };

    return recommendations[role]?.[task.type] || 'claude-3-sonnet';
  }

  defineQualityRequirements(task, clientTier) {
    const baseRequirements = {
      accuracy: 0.9,
      completeness: 0.8,
      timeliness: 0.9
    };

    if (clientTier === 'enterprise') {
      baseRequirements.accuracy = 0.95;
      baseRequirements.completeness = 0.9;
    }

    if (task.criticalPath) {
      baseRequirements.timeliness = 0.95;
    }

    return baseRequirements;
  }

  updateWorkloadProjection(role, hours) {
    this.currentWorkloads[role].totalHours += hours;
    if (hours > 0) this.currentWorkloads[role].activeProjects += 0.2; // Fractional project load
  }

  groupTasksByRole(tasks) {
    return tasks.reduce((groups, task) => {
      const role = task.assignedRole;
      if (!groups[role]) groups[role] = [];
      groups[role].push(task);
      return groups;
    }, {});
  }

  getUniqueRoles(assignments) {
    return [...new Set(assignments.map(a => a.assignedRole))];
  }

  identifyCriticalPath(dependencyGraph) {
    // Simplified critical path identification
    const criticalTasks = [];
    dependencyGraph.forEach((node, taskId) => {
      if (node.task.criticalPath) {
        criticalTasks.push(taskId);
      }
    });
    return criticalTasks;
  }

  assessRiskFactors(assignments, context) {
    const risks = [];
    
    // Resource overallocation risk
    Object.entries(this.currentWorkloads).forEach(([role, load]) => {
      const capacity = this.roleCapabilities[role].bandwidth.max;
      if (load.activeProjects > capacity * 0.8) {
        risks.push({
          type: 'resource_constraint',
          role,
          severity: 'medium',
          description: `${role} approaching capacity limits`
        });
      }
    });

    // Complexity risk
    const highComplexityTasks = assignments.filter(a => a.complexity > 8).length;
    if (highComplexityTasks > 3) {
      risks.push({
        type: 'complexity_risk',
        severity: 'high',
        description: `${highComplexityTasks} high-complexity tasks may impact delivery`
      });
    }

    return risks;
  }

  getOptimizationInsights(assignments) {
    return {
      roleBallance: this.analyzeRoleBalance(assignments),
      efficiencyScore: this.calculateEfficiencyScore(assignments),
      recommendations: this.generateOptimizationRecommendations(assignments)
    };
  }

  analyzeRoleBalance(assignments) {
    const roleDistribution = this.groupTasksByRole(assignments);
    const balance = {};
    
    Object.keys(this.roleCapabilities).forEach(role => {
      const tasks = roleDistribution[role] || [];
      balance[role] = {
        taskCount: tasks.length,
        totalHours: tasks.reduce((sum, t) => sum + t.estimatedHours, 0),
        avgComplexity: tasks.length > 0 ? 
          tasks.reduce((sum, t) => sum + t.complexity, 0) / tasks.length : 0
      };
    });

    return balance;
  }

  calculateEfficiencyScore(assignments) {
    // Simplified efficiency calculation
    let score = 100;
    
    // Penalize for role mismatches
    assignments.forEach(assignment => {
      const roleCapabilities = this.roleCapabilities[assignment.assignedRole];
      if (assignment.complexity < roleCapabilities.complexity.min) score -= 5;
      if (assignment.complexity > roleCapabilities.complexity.max) score -= 10;
    });

    return Math.max(0, score);
  }

  generateOptimizationRecommendations(assignments) {
    const recommendations = [];
    
    // Check for obvious inefficiencies
    const partnerTasks = assignments.filter(a => a.assignedRole === 'partner');
    const lowComplexityPartnerTasks = partnerTasks.filter(t => t.complexity < 7);
    
    if (lowComplexityPartnerTasks.length > 0) {
      recommendations.push('Consider delegating some partner tasks to principals to optimize costs');
    }

    const associateTasks = assignments.filter(a => a.assignedRole === 'associate');
    if (associateTasks.length === 0) {
      recommendations.push('Consider utilizing associates for data gathering and initial research');
    }

    return recommendations;
  }
}

module.exports = IntelligentWorkDistribution; 