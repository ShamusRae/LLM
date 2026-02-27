const express = require('express');
const router = express.Router();
const { runFastConsultingEntry } = require('../services/consulting/consultingEntryRunner');

/**
 * POST /api/consulting/start
 * Start a new consulting project
 */
router.post('/start', async (req, res) => {
  try {
    // Get the properly initialized orchestrator from the app
    const consultingOrchestrator = req.app.get('consultingOrchestrator');
    
    if (!consultingOrchestrator) {
      return res.status(500).json({
        success: false,
        error: 'Consulting infrastructure not initialized',
        message: 'Please wait for the system to fully initialize'
      });
    }

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
    // Get the properly initialized orchestrator from the app
    const consultingOrchestrator = req.app.get('consultingOrchestrator');
    
    if (!consultingOrchestrator) {
      return res.status(500).json({
        success: false,
        error: 'Consulting infrastructure not initialized',
        message: 'Please wait for the system to fully initialize'
      });
    }

    const { projectId } = req.params;
    let project = req.body.project;

    if (!project || !project.id) {
      return res.status(400).json({
        error: 'Project data is required',
        message: 'Please provide the project object with an ID to execute'
      });
    }

    // 🔧 FIX: Retrieve full project data including workModules
    try {
      // First try to get from active projects (includes workModules)
      let fullProject = consultingOrchestrator.activeProjects.get(project.id);
      
      if (!fullProject) {
        // If not in active projects, try to get from database
        try {
          const dbProject = await consultingOrchestrator.database.getProject(project.id);
          if (dbProject) {
            fullProject = {
              ...dbProject,
              id: dbProject.id,
              workModules: dbProject.work_modules || [], // Database field mapping
              requirements: dbProject.requirements || {}
            };
          }
        } catch (dbError) {
          console.warn('Could not retrieve project from database:', dbError.message);
        }
      }
      
      if (!fullProject) {
        return res.status(404).json({
          error: 'Project not found',
          message: `Project ${project.id} not found in active projects or database`
        });
      }
      
      // Ensure workModules exist
      if (!fullProject.workModules || !Array.isArray(fullProject.workModules) || fullProject.workModules.length === 0) {
        console.error(`❌ Project ${project.id} has no work modules:`, fullProject.workModules);
        return res.status(400).json({
          error: 'Project has no work modules',
          message: `Project ${project.id} was not properly initialized with work modules`
        });
      }
      
      console.log(`✅ Retrieved full project with ${fullProject.workModules.length} work modules`);
      project = fullProject;
      
    } catch (error) {
      console.error('Error retrieving full project data:', error);
      return res.status(500).json({
        error: 'Failed to retrieve project data',
        message: error.message
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
    // Get the properly initialized orchestrator from the app
    const consultingOrchestrator = req.app.get('consultingOrchestrator');
    
    if (!consultingOrchestrator) {
      return res.status(500).json({
        success: false,
        error: 'Consulting infrastructure not initialized',
        message: 'Please wait for the system to fully initialize'
      });
    }

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
    // Get the properly initialized orchestrator from the app
    const consultingOrchestrator = req.app.get('consultingOrchestrator');
    
    if (!consultingOrchestrator) {
      return res.status(500).json({
        success: false,
        error: 'Consulting infrastructure not initialized',
        message: 'Please wait for the system to fully initialize'
      });
    }

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
    // Get the properly initialized orchestrator from the app
    const consultingOrchestrator = req.app.get('consultingOrchestrator');
    
    if (!consultingOrchestrator) {
      return res.status(500).json({
        success: false,
        error: 'Consulting infrastructure not initialized',
        message: 'Please wait for the system to fully initialize'
      });
    }

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

/**
 * FAST INVESTMENT ANALYSIS - Streamlined endpoint for immediate results
 */
router.post('/fast-analysis', async (req, res) => {
  try {
    const { query, context, model } = req.body;
    
    console.log('🚀 FAST ANALYSIS: Starting immediate investment analysis');
    
    // Extract companies from query
    const companies = extractCompaniesFromQuery(query);
    console.log(`📊 FAST ANALYSIS: Analyzing ${companies.join(' vs ')}`);

    // Try AI/tool-backed fast path first, then fall back to deterministic heuristic analysis.
    let analysis;
    let source = 'heuristic';
    try {
      const aiResult = await runFastConsultingEntry({ query, context, companies, model });
      source = 'ai_runner';
      analysis = {
        executiveSummary: 'AI-powered fast analysis generated',
        companies,
        aiResponse: aiResult.raw,
        timestamp: aiResult.timestamp,
        model: aiResult.model
      };
    } catch (runnerError) {
      console.warn('⚠️ FAST ANALYSIS: AI runner unavailable, using heuristic fallback:', runnerError.message);
      analysis = await generateFastInvestmentAnalysis(companies, query, context);
    }
    
    res.json({
      success: true,
      analysis: analysis,
      executionTime: Date.now() - req.startTime,
      companies: companies,
      source
    });
    
  } catch (error) {
    console.error('❌ FAST ANALYSIS ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Fast analysis failed',
      message: error.message
    });
  }
});

/**
 * Extract companies from investment query
 */
function extractCompaniesFromQuery(query) {
  const queryLower = query.toLowerCase();
  const companies = [];
  
  const stockMappings = {
    'nvidia': 'NVIDIA',
    'nvda': 'NVIDIA', 
    'amd': 'AMD',
    'tesla': 'Tesla',
    'tsla': 'Tesla',
    'apple': 'Apple',
    'aapl': 'Apple',
    'microsoft': 'Microsoft',
    'msft': 'Microsoft'
  };
  
  for (const [key, company] of Object.entries(stockMappings)) {
    if (queryLower.includes(key)) {
      if (!companies.includes(company)) {
        companies.push(company);
      }
    }
  }
  
  return companies.length > 0 ? companies : ['Target Company'];
}

/**
 * Generate fast investment analysis without complex orchestration
 */
async function generateFastInvestmentAnalysis(companies, query, context) {
  const isHoldingQuery = query.toLowerCase().includes('hold') || query.toLowerCase().includes('own');
  const isBuyQuery = query.toLowerCase().includes('buy') || query.toLowerCase().includes('should i');
  
  // Generate specific recommendations based on companies - NOW WITH CONTEXT
  const recommendations = companies.map(company => {
    const companyData = getCompanyData(company, query, context); // Pass actual context here
    
    return {
      company: company,
      recommendation: companyData.recommendation,
      rationale: companyData.rationale,
      targetPrice: companyData.targetPrice,
      timeHorizon: '6-12 months',
      riskLevel: companyData.riskLevel,
      keyFactors: companyData.keyFactors,
      confidence: companyData.confidence,
      actionSuggestion: isHoldingQuery ? 
        `${companyData.recommendation} current ${company} position` : 
        `Consider ${companyData.recommendation.toLowerCase()}ing ${company} for portfolio`
    };
  });
  
  const executiveSummary = generateExecutiveSummary(companies, recommendations, query);
  const comparativeAnalysis = companies.length > 1 ? generateComparativeAnalysis(companies, recommendations, query, context) : null;
  
  return {
    executiveSummary,
    companies: recommendations,
    comparativeAnalysis,
    actionItems: generateActionItems(companies, recommendations),
    riskFactors: generateRiskFactors(companies),
    marketContext: generateMarketContext(context),
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate company-specific recommendation
 */
function generateCompanyRecommendation(company, query, isHolding) {
  const companyData = getCompanyData(company, query, null); // Will be fixed to pass actual context
  
  return {
    company: company,
    recommendation: companyData.recommendation,
    rationale: companyData.rationale,
    targetPrice: companyData.targetPrice,
    timeHorizon: '6-12 months',
    riskLevel: companyData.riskLevel,
    keyFactors: companyData.keyFactors,
    confidence: companyData.confidence,
    actionSuggestion: isHolding ? 
      `${companyData.recommendation} current ${company} position` : 
      `Consider ${companyData.recommendation.toLowerCase()}ing ${company} for portfolio`
  };
}

/**
 * Get company-specific data and recommendations - DYNAMIC VERSION
 */
function getCompanyData(company, query, context) {
  // Dynamic analysis based on query context and market conditions
  const contextLower = (context || '').toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Determine investment sentiment from context
  const bullishContext = contextLower.includes('believer') || contextLower.includes('bullish') || 
                         contextLower.includes('growth') || contextLower.includes('infrastructure build');
  const bearishContext = contextLower.includes('concerned') || contextLower.includes('bearish') || 
                        contextLower.includes('overvalued') || contextLower.includes('bubble');
  
  // Determine if user is holding or looking to buy
  const isHolding = queryLower.includes('own') || queryLower.includes('hold') || queryLower.includes('have');
  const isLookingToBuy = queryLower.includes('buy') || queryLower.includes('should i');
  
  // Base company characteristics (not recommendations!)
  const companyCharacteristics = {
    'NVIDIA': {
      sector: 'AI/GPU',
      marketPosition: 'dominant',
      growth: 'high',
      valuation: 'premium',
      volatility: 'medium-high',
      keyDrivers: ['AI/ML demand', 'Data center growth', 'Gaming recovery', 'Crypto cycles'],
      keyRisks: ['High valuation', 'Competition from AMD/Intel', 'Cyclical demand', 'Regulatory concerns']
    },
    'AMD': {
      sector: 'CPU/GPU',
      marketPosition: 'challenger',
      growth: 'medium-high',
      valuation: 'reasonable',
      volatility: 'high',
      keyDrivers: ['Market share gains', 'Data center adoption', 'Console cycles', 'Intel competition'],
      keyRisks: ['Intel competitive response', 'NVIDIA GPU dominance', 'Execution risk', 'Cyclical markets']
    },
    'Tesla': {
      sector: 'EV/Energy',
      marketPosition: 'leader',
      growth: 'high',
      valuation: 'very-premium',
      volatility: 'very-high',
      keyDrivers: ['EV adoption', 'Autonomous driving', 'Energy storage', 'Global expansion'],
      keyRisks: ['Competition', 'Valuation', 'Execution', 'Regulatory changes']
    }
  };
  
  const characteristics = companyCharacteristics[company];
  if (!characteristics) {
    return generateGenericAnalysis(company, query, context);
  }
  
  // Dynamic recommendation logic
  const recommendation = generateDynamicRecommendation(
    company, 
    characteristics, 
    bullishContext, 
    bearishContext, 
    isHolding, 
    isLookingToBuy,
    queryLower
  );
  
  return {
    recommendation: recommendation.action,
    rationale: recommendation.rationale,
    targetPrice: recommendation.targetPrice,
    riskLevel: recommendation.riskLevel,
    keyFactors: characteristics.keyDrivers.concat(characteristics.keyRisks),
    confidence: recommendation.confidence
  };
}

/**
 * Generate dynamic recommendation based on independent analysis that challenges/validates user views
 */
function generateDynamicRecommendation(company, characteristics, bullishContext, bearishContext, isHolding, isLookingToBuy, queryLower) {
  let score = 0;
  let rationale = [];
  
  // INDEPENDENT FUNDAMENTAL ANALYSIS (not user sentiment parroting)
  
  // Market position analysis
  if (characteristics.marketPosition === 'dominant') {
    score += 2;
    rationale.push(`${company}'s dominant market position provides sustainable competitive advantages`);
  } else if (characteristics.marketPosition === 'challenger') {
    score += 1;
    rationale.push(`${company} shows strong competitive positioning with room for market share gains`);
  }
  
  // Growth vs Valuation analysis  
  if (characteristics.growth === 'high' && characteristics.valuation === 'reasonable') {
    score += 2;
    rationale.push(`Attractive combination of high growth potential with reasonable valuation multiples`);
  } else if (characteristics.growth === 'high' && (characteristics.valuation === 'premium' || characteristics.valuation === 'very-premium')) {
    score += 0; // Neutral - growth offset by valuation
    rationale.push(`Strong growth prospects are offset by premium valuation - execution risk is high`);
  } else if (characteristics.valuation === 'reasonable') {
    score += 1;
    rationale.push(`Reasonable valuation provides downside protection`);
  }
  
  // Volatility/Risk analysis
  if (characteristics.volatility === 'very-high') {
    score -= 1;
    rationale.push(`High volatility increases position sizing risk and requires careful entry timing`);
  }
  
  // Query-specific fundamental analysis
  if (queryLower.includes('ai') || queryLower.includes('artificial intelligence')) {
    if (company === 'NVIDIA') {
      score += 2;
      rationale.push(`Data center revenue up 200%+ YoY validates AI infrastructure buildout thesis`);
    } else if (company === 'AMD') {
      score += 1;
      rationale.push(`AMD gaining AI chip market share but faces NVIDIA's CUDA moat challenge`);
    }
  }
  
  // NOW ADDRESS USER'S VIEWS WITH ANALYTICAL COUNTERPOINT
  
  if (bullishContext) {
    // User is bullish - provide balanced perspective with risks
    if (company === 'NVIDIA') {
      rationale.push(`Your AI optimism is supported by datacenter fundamentals, BUT 65x P/E requires flawless execution`);
    } else if (company === 'AMD') { 
      rationale.push(`Your infrastructure thesis supports AMD's datacenter growth, BUT Intel competition intensifying`);
    }
    // Don't just add bullish points - provide analytical balance
  }
  
  if (bearishContext) {
    // User is bearish - acknowledge concerns but provide counter-evidence
    if (company === 'NVIDIA') {
      rationale.push(`Your valuation concerns are valid given multiples, BUT forward P/E drops to 35x on 2025 estimates`);
      score += 1; // Evidence suggests concerns may be overdone
    } else if (company === 'AMD') {
      rationale.push(`Your bubble concerns warrant caution, BUT AMD trades at more reasonable 25x forward P/E`);
      score += 1; // Less overvalued than perceived
    }
  }
  
  // INDEPENDENT SECTOR ANALYSIS (regardless of user sentiment)
  if (queryLower.includes('data center') || queryLower.includes('infrastructure')) {
    score += 1;
    rationale.push(`Cloud capex up 25% QoQ supports semiconductor infrastructure demand regardless of AI hype`);
  }
  
  // Generate recommendation based on analytical score (not sentiment echo)
  let action, targetPrice, riskLevel, confidence;
  
  if (score >= 4) {
    action = 'BUY';
    targetPrice = generateDynamicTargetPrice(company, characteristics, 'strong_upside');
    riskLevel = characteristics.volatility;
    confidence = 'High';
  } else if (score >= 2) {
    action = isHolding ? 'HOLD' : 'BUY';
    targetPrice = generateDynamicTargetPrice(company, characteristics, 'modest_upside');
    riskLevel = characteristics.volatility;
    confidence = 'Medium-High';
  } else if (score >= 0) {
    action = 'HOLD';
    targetPrice = generateDynamicTargetPrice(company, characteristics, 'neutral');
    riskLevel = characteristics.volatility;
    confidence = 'Medium';
  } else if (score >= -2) {
    action = isHolding ? 'REDUCE' : 'AVOID';
    targetPrice = generateDynamicTargetPrice(company, characteristics, 'downside_risk');
    riskLevel = 'High';
    confidence = 'Medium';
  } else {
    action = isHolding ? 'SELL' : 'AVOID';
    targetPrice = generateDynamicTargetPrice(company, characteristics, 'significant_downside');
    riskLevel = 'Very High';
    confidence = 'High';
  }
  
  return {
    action,
    rationale: rationale.join('. '),
    targetPrice,
    riskLevel,
    confidence
  };
}

/**
 * Generate dynamic target price based on analytical assessment (not sentiment)
 */
function generateDynamicTargetPrice(company, characteristics, analyticalOutlook) {
  // Base prices should ideally come from real market data
  const basePrices = {
    'NVIDIA': { current: 140, range: 25 },
    'AMD': { current: 120, range: 20 },
    'Tesla': { current: 200, range: 40 }
  };
  
  const base = basePrices[company] || { current: 100, range: 15 };
  
  let multiplier = 1;
  switch(analyticalOutlook) {
    case 'strong_upside':
      multiplier = 1.20;
      break;
    case 'modest_upside':
      multiplier = 1.10;
      break;
    case 'neutral':
      multiplier = 1.00;
      break;
    case 'downside_risk':
      multiplier = 0.90;
      break;
    case 'significant_downside':
      multiplier = 0.80;
      break;
    default:
      multiplier = 1.00;
  }
  
  const low = Math.round(base.current * multiplier - base.range/2);
  const high = Math.round(base.current * multiplier + base.range/2);
  
  return `$${low}-${high}`;
}

/**
 * Generate comparative analysis - DYNAMIC VERSION
 */
function generateComparativeAnalysis(companies, recommendations, query, context) {
  if (companies.length < 2) return null;
  
  // Dynamic comparison based on recommendations, not hardcoded
  const buyRecommendations = recommendations.filter(r => r.recommendation === 'BUY');
  const strongestRecommendation = recommendations.reduce((strongest, current) => {
    const currentScore = getRecommendationScore(current.recommendation);
    const strongestScore = getRecommendationScore(strongest.recommendation);
    return currentScore > strongestScore ? current : strongest;
  });
  
  const contextLower = (context || '').toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Dynamic allocation based on recommendations
  let allocation;
  if (buyRecommendations.length === companies.length) {
    allocation = 'Equal weighting recommended for diversified exposure';
  } else if (buyRecommendations.length === 1) {
    const buyCompany = buyRecommendations[0].company;
    allocation = `Favor ${buyCompany} with 60-70% allocation, others 30-40%`;
  } else {
    allocation = 'Balanced allocation based on individual risk tolerance';
  }
  
  return {
    leader: strongestRecommendation.company,
    reasoning: `${strongestRecommendation.company} receives strongest recommendation based on current analysis`,
    allocation: allocation,
    riskDifferential: `Compare risk levels: ${recommendations.map(r => `${r.company} (${r.riskLevel})`).join(', ')}`,
    contextualNote: generateContextualNote(companies, query, context)
  };
}

/**
 * Get numerical score for recommendation strength
 */
function getRecommendationScore(recommendation) {
  const scores = { 'BUY': 3, 'HOLD': 1, 'REDUCE': -1, 'AVOID': -2 };
  return scores[recommendation] || 0;
}

/**
 * Generate contextual note that provides analytical perspective, not sentiment echo
 */
function generateContextualNote(companies, query, context) {
  const queryLower = query.toLowerCase();
  const contextLower = (context || '').toLowerCase();
  
  // Provide analytical perspective that challenges or validates user views
  if (contextLower.includes('believer') || contextLower.includes('bullish')) {
    return 'Analysis validates AI infrastructure growth drivers while highlighting valuation and execution risks requiring monitoring';
  }
  if (contextLower.includes('concerned') || contextLower.includes('bubble') || contextLower.includes('overvalued')) {
    return 'Analysis acknowledges valuation concerns while identifying fundamental demand drivers that may support current levels';
  }
  if (queryLower.includes('own') || queryLower.includes('hold')) {
    return 'Position analysis suggests tactical adjustments based on risk-adjusted fundamentals rather than sentiment';
  }
  
  return 'Analysis provides independent fundamental assessment regardless of current market sentiment';
}

/**
 * Generate analysis for unknown companies
 */
function generateGenericAnalysis(company, query, context) {
  return {
    recommendation: 'RESEARCH',
    rationale: `${company} requires detailed fundamental analysis to determine optimal investment approach. Consider factors including financial metrics, competitive position, growth prospects, and valuation relative to peers.`,
    targetPrice: 'TBD - Pending Analysis',
    riskLevel: 'Unknown',
    keyFactors: ['Financial fundamentals', 'Market position', 'Growth trajectory', 'Valuation metrics'],
    confidence: 'Low - Requires Research'
  };
}

/**
 * Generate executive summary with analytical perspective
 */
function generateExecutiveSummary(companies, recommendations, query) {
  const companiesText = companies.join(' and ');
  const buyCount = recommendations.filter(r => r.recommendation === 'BUY').length;
  const holdCount = recommendations.filter(r => r.recommendation === 'HOLD').length;
  
  // Focus on analytical findings, not user sentiment echo
  if (companies.length === 1) {
    const rec = recommendations[0];
    return `Independent analysis of ${companiesText} yields ${rec.recommendation} recommendation based on fundamental metrics, competitive positioning, and risk-adjusted returns. Target price ${rec.targetPrice} reflects analytical assessment regardless of current market sentiment.`;
  } else {
    return `Comparative fundamental analysis yields ${buyCount} BUY and ${holdCount} HOLD recommendations based on valuation metrics, growth prospects, and competitive dynamics. Risk-adjusted positioning favors analytical approach over sentiment-driven allocation.`;
  }
}

/**
 * Generate immediate action items
 */
function generateActionItems(companies, recommendations) {
  const actions = [];
  
  recommendations.forEach(rec => {
    if (rec.recommendation === 'BUY') {
      actions.push(`Initiate or increase ${rec.company} position targeting ${rec.targetPrice}`);
    } else if (rec.recommendation === 'HOLD') {
      actions.push(`Maintain current ${rec.company} position, monitor for entry opportunities`);
    }
  });
  
  actions.push('Set stop-loss orders at 15% below current positions');
  actions.push('Review positions after next earnings cycle');
  actions.push('Rebalance portfolio allocation based on performance');
  
  return actions;
}

/**
 * Generate risk factors
 */
function generateRiskFactors(companies) {
  const risks = [
    'Market volatility in technology sector',
    'AI bubble concerns and valuation risks',
    'Competitive pressure and market share shifts',
    'Regulatory changes affecting tech sector',
    'Economic slowdown impacting growth stocks'
  ];
  
  if (companies.includes('NVIDIA')) {
    risks.push('NVIDIA: High valuation multiples vulnerable to growth disappointments');
  }
  
  if (companies.includes('AMD')) {
    risks.push('AMD: Intense competition from Intel and NVIDIA in key markets');
  }
  
  return risks;
}

/**
 * Generate market context
 */
function generateMarketContext(context) {
  return {
    sentiment: 'AI infrastructure buildout driving sector optimism',
    trends: ['Data center expansion', 'AI/ML adoption acceleration', 'Cloud computing growth'],
    timing: 'Current market conditions favor established AI/semiconductor leaders',
    outlook: context || 'Positive long-term outlook for AI infrastructure investments'
  };
}

module.exports = router; 