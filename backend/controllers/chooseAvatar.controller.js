'use strict';

const mcpBridge = require('../services/mcpBridge');

exports.chooseAvatar = async (req, res) => {
  try {
    const { message, activeAvatars, chatHistory } = req.body;
    if (!activeAvatars || !Array.isArray(activeAvatars) || activeAvatars.length === 0) {
      return res.status(400).json({ error: "No active avatars provided" });
    }

    // With the new team collaboration system, we don't need to pre-decide the order
    // The team collaboration service will handle dynamic coordination
    console.log('🤝 Team collaboration setup for', activeAvatars.length, 'avatars');

    // Get available tools from MCP server
    const availableTools = mcpBridge.listTools();
    
    // Collect enabled tools from all active avatars
    let enabledTools = [];
    for (const avatar of activeAvatars) {
      if (avatar.enabledTools && Array.isArray(avatar.enabledTools)) {
        enabledTools = [...enabledTools, ...avatar.enabledTools];
      }
    }
    
    // Remove duplicates
    enabledTools = [...new Set(enabledTools)];
    
    // If no tools are enabled, use all available tools as default
    if (enabledTools.length === 0) {
      enabledTools = availableTools.map(tool => tool.id);
    }
    
    // Return team collaboration configuration
    res.json({
      success: true,
      collaborationType: activeAvatars.length === 1 ? 'single_avatar' : 'dynamic_team',
      teamSize: activeAvatars.length,
      teamMembers: activeAvatars.map(avatar => ({
        id: avatar.id,
        name: avatar.name,
        category: avatar.modelCategory || avatar.selectedModel || 'General',
        role: avatar.role,
        specialty: determineSpecialty(avatar)
      })),
      enabledTools: enabledTools,
      availableTools: availableTools,
      message: activeAvatars.length > 1 ? 
        'Team will collaborate dynamically based on expertise and context' : 
        'Single avatar will handle the request'
    });
  } catch (error) {
    console.error("Error in chooseAvatar controller:", error);
    return res.status(500).json({ error: "Internal server error in chooseAvatar" });
  }
};

/**
 * Helper function to determine avatar specialty (matches TeamCollaborationService logic)
 */
function determineSpecialty(avatar) {
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