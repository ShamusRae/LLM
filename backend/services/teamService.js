const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const aiService = require('./ai/aiService');

// Path to teams file
const teamsPath = path.join(__dirname, '../../storage/teams.json');
const settingsPath = path.join(__dirname, '../../storage/settings.json');

// Initialize teams file if it doesn't exist
const initializeTeams = async () => {
  try {
    // Check if teams file exists
    await fs.access(teamsPath);
  } catch (error) {
    // File doesn't exist, create it with empty teams array
    await fs.writeFile(teamsPath, JSON.stringify([], null, 2));
    return [];
  }
};

// Get all teams
const getTeams = async () => {
  await initializeTeams();
  const teamsData = await fs.readFile(teamsPath, 'utf8');
  return JSON.parse(teamsData);
};

// Get a single team by ID
const getTeamById = async (teamId) => {
  const teams = await getTeams();
  return teams.find(team => team.id === teamId);
};

// Create a new team
const createTeam = async (teamData) => {
  const teams = await getTeams();
  
  const newTeam = {
    id: uuidv4(),
    name: teamData.name,
    description: teamData.description,
    imageUrl: teamData.imageUrl || null,
    objective: teamData.objective,
    context: teamData.context || '',
    files: teamData.files || [],
    members: teamData.members || [],
    plan: teamData.plan || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  teams.push(newTeam);
  await fs.writeFile(teamsPath, JSON.stringify(teams, null, 2));
  return newTeam;
};

// Update an existing team
const updateTeam = async (teamId, teamData) => {
  const teams = await getTeams();
  const teamIndex = teams.findIndex(team => team.id === teamId);
  
  if (teamIndex === -1) {
    throw new Error('Team not found');
  }
  
  const updatedTeam = {
    ...teams[teamIndex],
    ...teamData,
    updatedAt: new Date().toISOString()
  };
  
  teams[teamIndex] = updatedTeam;
  await fs.writeFile(teamsPath, JSON.stringify(teams, null, 2));
  return updatedTeam;
};

// Delete a team
const deleteTeam = async (teamId) => {
  const teams = await getTeams();
  const filteredTeams = teams.filter(team => team.id !== teamId);
  
  if (filteredTeams.length === teams.length) {
    throw new Error('Team not found');
  }
  
  await fs.writeFile(teamsPath, JSON.stringify(filteredTeams, null, 2));
  return { success: true };
};

// Generate a team plan using LLM
const generateTeamPlan = async (objective, context, availableAvatars) => {
  try {
    // Get available avatars if not provided
    if (!availableAvatars || availableAvatars.length === 0) {
      const settingsData = await fs.readFile(settingsPath, 'utf8');
      const settings = JSON.parse(settingsData);
      availableAvatars = settings.avatars || [];
    }
    
    // Format avatars for the prompt
    const avatarsInfo = availableAvatars.map(avatar => {
      return `- ${avatar.name} (${avatar.role}): ${avatar.description}. Skills: ${Array.isArray(avatar.skills) ? avatar.skills.join(', ') : avatar.skills}`;
    }).join('\n');
    
    // Create prompt for the LLM
    const prompt = `
You are a project manager AI tasked with creating a team and developing a detailed plan to achieve the following objective:

OBJECTIVE: ${objective}

ADDITIONAL CONTEXT: ${context || 'No additional context provided.'}

Available team members:
${avatarsInfo}

Please create:
1. A list of recommended team members from the available avatars that would be best suited for this objective
2. A detailed step-by-step plan with the following information for each step:
   - Step number and title
   - Description of the task
   - Team members assigned to work on this step
   - Team member responsible for reviewing/signing off on this step
   - Expected output of this step

Format your response as a JSON object with the following structure:
{
  "recommendedMembers": [
    {
      "id": "avatar_id",
      "name": "Avatar Name",
      "role": "Avatar Role",
      "justification": "Why this avatar is recommended for the team"
    }
  ],
  "plan": [
    {
      "stepNumber": 1,
      "title": "Step Title",
      "description": "Detailed description of what needs to be done",
      "assignedMembers": ["Avatar Name 1", "Avatar Name 2"],
      "reviewedBy": "Avatar Name 3",
      "expectedOutput": "Description of the expected output"
    }
  ]
}

Ensure your plan is comprehensive, logical, and leverages the unique skills of each team member.
`;

    // Call AI service
    const provider = aiService.getProvider('openai', process.env.OPENAI_API_KEY);
    const response = await provider.generateResponse(prompt, {
      model: 'gpt-4-turbo-preview',
      systemMessage: 'You are a helpful project management assistant.',
      temperature: 0.7,
      max_tokens: 2000
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    
    // Extract JSON from the response
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to generate a valid team plan');
    }
    
    const planData = JSON.parse(jsonMatch[0]);
    
    // Map avatar IDs to the recommended members
    if (planData.recommendedMembers) {
      planData.recommendedMembers = planData.recommendedMembers.map(member => {
        const matchedAvatar = availableAvatars.find(
          avatar => avatar.name.toLowerCase() === member.name.toLowerCase() || 
                   (member.id && avatar.id.toString() === member.id.toString())
        );
        
        return {
          ...member,
          id: matchedAvatar ? matchedAvatar.id : null
        };
      });
    }
    
    return planData;
  } catch (error) {
    console.error('Error generating team plan:', error);
    throw new Error(`Failed to generate team plan: ${error.message}`);
  }
};

module.exports = {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  generateTeamPlan
}; 