'use strict';

const aiService = require('./ai/aiService');

class TeamCollaborationService {
  constructor() {
    this.maxContributions = 8; // Safety limit
    this.qualityThreshold = 0.8; // When to consider work "done"
  }

  /**
   * Orchestrate a natural team collaboration
   * @param {string} message - User's request
   * @param {Array} activeAvatars - Available team members
   * @param {Array} chatHistory - Previous conversation context
   * @param {Function} onUpdate - Progress callback
   * @param {Array} selectedFiles - Any attached files
   * @returns {Object} Collaborative response
   */
  async orchestrateCollaboration({ message, activeAvatars, chatHistory = [], onUpdate, selectedFiles = [] }) {
    if (!activeAvatars || activeAvatars.length === 0) {
      throw new Error('No active avatars for collaboration');
    }

    // Single avatar - no collaboration needed
    if (activeAvatars.length === 1) {
      return this.singleAvatarResponse(message, activeAvatars[0], chatHistory, onUpdate, selectedFiles);
    }

    console.log('🤝 Starting team collaboration with', activeAvatars.length, 'avatars');

    const collaboration = {
      contributions: [],
      currentPhase: 'initial_analysis',
      workingDocument: '',
      completionSignals: 0,
      teamMembers: this.categorizeTeamMembers(activeAvatars)
    };

    // Phase 1: Initial analysis and task breakdown
    const initialContributor = this.selectInitialContributor(message, collaboration.teamMembers);
    console.log(`🎯 Selected ${initialContributor.name} (${initialContributor.role}) to start`);

    let currentContributor = initialContributor;
    let contributionCount = 0;

    while (contributionCount < this.maxContributions && collaboration.completionSignals < 2) {
      try {
        contributionCount++;
        
        if (onUpdate) {
          onUpdate({
            phase: collaboration.currentPhase,
            contributor: currentContributor.name,
            progress: Math.min(contributionCount / 4, 1) * 100
          });
        }

        // Get contribution from current avatar
        const contribution = await this.getTeamContribution({
          message,
          contributor: currentContributor,
          collaboration,
          chatHistory,
          selectedFiles,
          contributionNumber: contributionCount
        });

        collaboration.contributions.push(contribution);
        
        // Update working document
        if (contribution.content && contribution.content.trim()) {
          collaboration.workingDocument += `\n\n### ${currentContributor.name}:\n${contribution.content}`;
        }

        // Analyze the contribution for next steps
        const nextAction = await this.analyzeContribution(contribution, collaboration, message);
        
        if (nextAction.isComplete) {
          console.log('✅ Team signals work is complete');
          collaboration.completionSignals = 2; // Force completion
          break;
        }

        if (nextAction.handoff && nextAction.handoff !== currentContributor.id) {
          // Find the requested team member
          const nextContributor = activeAvatars.find(a => a.id === nextAction.handoff) ||
                                 this.findByRole(nextAction.handoffRole, collaboration.teamMembers);
          
          if (nextContributor && nextContributor.id !== currentContributor.id) {
            console.log(`🔄 Handoff: ${currentContributor.name} → ${nextContributor.name}`);
            currentContributor = nextContributor;
          } else {
            // If no specific handoff, pick next best contributor
            currentContributor = this.selectNextContributor(collaboration, activeAvatars, currentContributor);
          }
        } else {
          // Auto-select next contributor
          currentContributor = this.selectNextContributor(collaboration, activeAvatars, currentContributor);
        }

        // Track completion signals
        if (nextAction.qualityScore >= this.qualityThreshold) {
          collaboration.completionSignals++;
        }

        // Update phase if needed
        if (contributionCount >= 2 && collaboration.currentPhase === 'initial_analysis') {
          collaboration.currentPhase = 'collaborative_building';
        }
        if (contributionCount >= 4 && collaboration.currentPhase === 'collaborative_building') {
          collaboration.currentPhase = 'final_polish';
        }

      } catch (error) {
        console.error(`Error in collaboration round ${contributionCount}:`, error);
        break;
      }
    }

    // Synthesize final response
    const finalResponse = this.synthesizeTeamResponse(collaboration);
    
    if (onUpdate) {
      onUpdate({ complete: true });
    }

    return finalResponse;
  }

  /**
   * Categorize team members by their roles and capabilities
   */
  categorizeTeamMembers(activeAvatars) {
    return activeAvatars.map(avatar => ({
      ...avatar,
      category: avatar.modelCategory || avatar.selectedModel || 'General',
      specialty: this.determineSpecialty(avatar),
      communicationStyle: this.determineCommunicationStyle(avatar.modelCategory || 'General')
    }));
  }

  /**
   * Determine avatar's specialty based on their configuration
   */
  determineSpecialty(avatar) {
    const category = avatar.modelCategory || avatar.selectedModel || 'General';
    const role = (avatar.role || '').toLowerCase();
    const skills = Array.isArray(avatar.skills) ? avatar.skills.join(' ').toLowerCase() : (avatar.skills || '').toLowerCase();

    // Map categories to specialties
    const categoryMap = {
      'Strategic': 'high-level planning, complex reasoning, architectural decisions',
      'General': 'balanced analysis, implementation, problem-solving',
      'Rapid': 'quick optimizations, efficient solutions, performance improvements',
      'Tactical': 'specialized expertise, security, edge cases, technical details'
    };

    let specialty = categoryMap[category] || 'general assistance';

    // Enhance based on role and skills
    if (role.includes('security') || skills.includes('security')) {
      specialty = 'security analysis, vulnerability assessment, ' + specialty;
    }
    if (role.includes('design') || skills.includes('design')) {
      specialty = 'system design, architecture, ' + specialty;
    }
    if (role.includes('data') || skills.includes('data')) {
      specialty = 'data analysis, insights, ' + specialty;
    }

    return specialty;
  }

  /**
   * Determine communication style based on model category
   */
  determineCommunicationStyle(category) {
    const styles = {
      'Strategic': 'comprehensive and analytical, focuses on big picture and implications',
      'General': 'balanced and practical, covers all important aspects thoroughly', 
      'Rapid': 'concise and action-oriented, focuses on key points and next steps',
      'Tactical': 'detailed and precise, covers technical specifics and edge cases'
    };
    
    return styles[category] || styles['General'];
  }

  /**
   * Select the best avatar to start the collaboration
   */
  selectInitialContributor(message, teamMembers) {
    // Analyze message to determine best starting point
    const msgLower = message.toLowerCase();
    
    // Strategic questions - start with Strategic
    if (msgLower.includes('strategy') || msgLower.includes('approach') || msgLower.includes('plan') ||
        msgLower.includes('architecture') || msgLower.includes('design') || message.length > 200) {
      const strategic = teamMembers.find(m => m.category === 'Strategic');
      if (strategic) return strategic;
    }
    
    // Technical/specific questions - start with Tactical
    if (msgLower.includes('security') || msgLower.includes('performance') || msgLower.includes('optimize') ||
        msgLower.includes('bug') || msgLower.includes('error') || msgLower.includes('fix')) {
      const tactical = teamMembers.find(m => m.category === 'Tactical');
      if (tactical) return tactical;
    }
    
    // Quick questions - start with Rapid
    if (message.length < 50 || msgLower.includes('quickly') || msgLower.includes('fast')) {
      const rapid = teamMembers.find(m => m.category === 'Rapid');
      if (rapid) return rapid;
    }
    
    // Default to General or first available
    return teamMembers.find(m => m.category === 'General') || teamMembers[0];
  }

  /**
   * Get a team-aware contribution from an avatar
   */
  async getTeamContribution({ message, contributor, collaboration, chatHistory, selectedFiles, contributionNumber }) {
    // Lazy load to avoid circular dependency
    const avatarService = require('./avatarService');
    
    // Build team-aware context
    const teamContext = this.buildTeamContext(collaboration, contributor, message, contributionNumber);
    
    // Get response with team awareness
    const response = await avatarService.getResponse(
      teamContext.prompt,
      contributor,
      teamContext.history,
      null, // onUpdate handled at higher level
      selectedFiles
    );

    // Extract the actual content
    const content = response.responses?.[0]?.response || response.response || '';
    
    // Parse for team signals
    const signals = this.parseTeamSignals(content);
    
    return {
      avatarId: contributor.id,
      avatarName: contributor.name,
      category: contributor.category,
      content: content,
      contributionNumber,
      signals,
      timestamp: Date.now()
    };
  }

  /**
   * Build team-aware context for the avatar
   */
  buildTeamContext(collaboration, contributor, originalMessage, contributionNumber) {
    let prompt = originalMessage;
    
    // Add team awareness
    if (collaboration.contributions.length > 0) {
      prompt = `TEAM COLLABORATION IN PROGRESS

Original Request: ${originalMessage}

Team Progress So Far:
${collaboration.contributions.map((contrib, i) => 
  `${i + 1}. ${contrib.avatarName} (${contrib.category}): ${contrib.content.substring(0, 200)}${contrib.content.length > 200 ? '...' : ''}`
).join('\n')}

Your Role: You are ${contributor.name}, specializing in ${contributor.specialty}. Your communication style should be ${contributor.communicationStyle}.

Current Phase: ${collaboration.currentPhase}

Team Instructions:
- Build on what your teammates have already contributed
- Focus on your area of expertise: ${contributor.specialty}
- Be concise if others have covered the basics well
- If you think the work is complete, end with "TEAM_COMPLETE" 
- If you want a specific teammate to contribute next, end with "HANDOFF_TO: [AvatarName] - [reason]"
- If you need more information or clarification, ask specific questions

Your Contribution (#${contributionNumber}):`;
    }

    return {
      prompt,
      history: collaboration.contributions.map(c => ({
        role: 'assistant',
        content: c.content,
        avatarName: c.avatarName
      }))
    };
  }

  /**
   * Parse team signals from avatar response
   */
  parseTeamSignals(content) {
    const signals = {
      isComplete: false,
      handoff: null,
      handoffRole: null,
      quality: 'continue'
    };

    if (content.includes('TEAM_COMPLETE')) {
      signals.isComplete = true;
    }

    const handoffMatch = content.match(/HANDOFF_TO:\s*([^-\n]+)(?:\s*-\s*(.+))?/i);
    if (handoffMatch) {
      signals.handoff = handoffMatch[1].trim();
      signals.handoffReason = handoffMatch[2]?.trim();
    }

    // Quality indicators
    if (content.includes('needs more work') || content.includes('incomplete')) {
      signals.quality = 'needs_improvement';
    } else if (content.includes('looks good') || content.includes('comprehensive') || content.includes('complete')) {
      signals.quality = 'high';
    }

    return signals;
  }

  /**
   * Analyze contribution and determine next action
   */
  async analyzeContribution(contribution, collaboration, originalMessage) {
    // Simple heuristic-based analysis (could be enhanced with AI)
    const analysis = {
      isComplete: contribution.signals.isComplete,
      handoff: contribution.signals.handoff,
      handoffRole: contribution.signals.handoffRole,
      qualityScore: this.assessQuality(contribution, collaboration)
    };

    // Look for specific handoff requests
    if (contribution.signals.handoff) {
      // Try to match to actual avatar name or find by role
      const targetAvatar = collaboration.teamMembers.find(m => 
        m.name.toLowerCase().includes(contribution.signals.handoff.toLowerCase()) ||
        m.category.toLowerCase() === contribution.signals.handoff.toLowerCase()
      );
      
      if (targetAvatar) {
        analysis.handoff = targetAvatar.id;
      }
    }

    return analysis;
  }

  /**
   * Assess quality of current collaboration
   */
  assessQuality(contribution, collaboration) {
    let score = 0.5; // Base score

    // Length and detail
    if (contribution.content.length > 300) score += 0.1;
    if (contribution.content.length > 600) score += 0.1;

    // Team building on each other
    if (collaboration.contributions.length > 1) {
      const references = ['building on', 'adding to', 'expanding', 'agree with', 'complement'];
      if (references.some(ref => contribution.content.toLowerCase().includes(ref))) {
        score += 0.2;
      }
    }

    // Completion signals
    if (contribution.signals.quality === 'high') score += 0.2;
    if (contribution.signals.isComplete) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Select next contributor intelligently
   */
  selectNextContributor(collaboration, activeAvatars, currentContributor) {
    const contributions = collaboration.contributions;
    const recentContributors = contributions.slice(-2).map(c => c.avatarId);
    
    // Don't immediately repeat the same avatar
    const candidates = activeAvatars.filter(a => 
      a.id !== currentContributor.id && !recentContributors.includes(a.id)
    );
    
    if (candidates.length === 0) {
      // If all have contributed recently, pick anyone except current
      return activeAvatars.find(a => a.id !== currentContributor.id) || activeAvatars[0];
    }
    
    // In final polish phase, prefer Strategic for overview
    if (collaboration.currentPhase === 'final_polish') {
      const strategic = candidates.find(a => a.modelCategory === 'Strategic');
      if (strategic) return strategic;
    }
    
    // Otherwise, pick by role diversity
    const contributorCategories = contributions.map(c => c.category);
    const leastUsed = ['Tactical', 'Rapid', 'General', 'Strategic'].find(category =>
      !contributorCategories.includes(category) && candidates.some(a => a.modelCategory === category)
    );
    
    if (leastUsed) {
      return candidates.find(a => a.modelCategory === leastUsed);
    }
    
    // Default: first available candidate
    return candidates[0];
  }

  /**
   * Find avatar by role/category
   */
  findByRole(role, teamMembers) {
    if (!role) return null;
    
    return teamMembers.find(m => 
      m.category.toLowerCase() === role.toLowerCase() ||
      m.role?.toLowerCase().includes(role.toLowerCase())
    );
  }

  /**
   * Synthesize final team response
   */
  synthesizeTeamResponse(collaboration) {
    const responses = collaboration.contributions.map(contrib => ({
      avatarId: contrib.avatarId,
      avatarName: contrib.avatarName,
      response: contrib.content,
      round: Math.ceil(contrib.contributionNumber / collaboration.teamMembers.length),
      imageUrl: collaboration.teamMembers.find(m => m.id === contrib.avatarId)?.imageUrl || null,
      isThinking: false
    }));

    return {
      responses,
      discussionRounds: Math.ceil(collaboration.contributions.length / collaboration.teamMembers.length),
      collaborationType: 'dynamic_team',
      finalWorkingDocument: collaboration.workingDocument,
      completionReason: collaboration.completionSignals >= 2 ? 'quality_threshold' : 'contribution_limit'
    };
  }

  /**
   * Handle single avatar response (no collaboration needed)
   */
  async singleAvatarResponse(message, avatar, chatHistory, onUpdate, selectedFiles) {
    // Lazy load to avoid circular dependency
    const avatarService = require('./avatarService');
    
    const response = await avatarService.getResponse(message, avatar, chatHistory, onUpdate, selectedFiles);
    
    return {
      responses: response.responses || [{
        avatarId: avatar.id,
        avatarName: avatar.name,
        response: response.response || response,
        round: 1,
        imageUrl: avatar.imageUrl || null,
        isThinking: false
      }],
      discussionRounds: 1,
      collaborationType: 'single_avatar'
    };
  }
}

module.exports = new TeamCollaborationService(); 