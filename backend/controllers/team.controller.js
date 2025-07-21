const teamService = require('../services/teamService');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const axios = require('axios');
const Team = require('../models/team.model');
const { v4: uuidv4 } = require('uuid');
const mcpService = require('../services/mcpService');
const fileService = require('../services/fileService');

// Path to avatars directory
const avatarsDir = path.join(__dirname, '../../storage/avatars');

// Path to teams directory
const teamsDir = path.join(__dirname, '../../storage/teams');

// Initialize teams directory if it doesn't exist
const initializeTeamsDirectory = async () => {
  if (!fs.existsSync(teamsDir)) {
    await fsPromises.mkdir(teamsDir, { recursive: true });
  }
};

// Initialize teams directory
initializeTeamsDirectory().catch(err => {
  console.error('Error initializing teams directory:', err);
});

// Get all teams
exports.getTeams = async (req, res) => {
  try {
    const teams = await teamService.getTeams();
    res.json(teams);
  } catch (error) {
    console.error('Error getting teams:', error);
    res.status(500).json({ error: 'Failed to get teams' });
  }
};

// Get a single team by ID
exports.getTeamById = async (req, res) => {
  try {
    const teamId = req.params.id;
    const teamPath = path.join(teamsDir, `${teamId}.json`);
    
    if (!fs.existsSync(teamPath)) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    const team = JSON.parse(fs.readFileSync(teamPath, 'utf8'));
    
    res.status(200).json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ message: 'Failed to fetch team', error: error.message });
  }
};

// Create a new team
exports.createTeam = async (req, res) => {
  try {
    const { name, description, imageUrl, imagePrompt, objective, context, files, members, plan } = req.body;
    
    if (!name || !objective) {
      return res.status(400).json({ message: 'Team name and objective are required' });
    }
    
    const teamId = uuidv4();
    const now = new Date().toISOString();
    
    const newTeam = {
      id: teamId,
      name,
      description: description || '',
      imageUrl: imageUrl || null,
      imagePrompt: imagePrompt || '',
      objective,
      context: context || '',
      files: files || [],
      members: members || [],
      plan: plan || [],
      createdAt: now,
      updatedAt: now
    };
    
    // Save the team to a file
    fs.writeFileSync(path.join(teamsDir, `${teamId}.json`), JSON.stringify(newTeam, null, 2));
    
    res.status(201).json(newTeam);
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ message: 'Failed to create team', error: error.message });
  }
};

// Update an existing team
exports.updateTeam = async (req, res) => {
  try {
    const teamId = req.params.id;
    const { name, description, imageUrl, imagePrompt, objective, context, files, members, plan } = req.body;
    
    if (!name || !objective) {
      return res.status(400).json({ message: 'Team name and objective are required' });
    }
    
    const teamPath = path.join(teamsDir, `${teamId}.json`);
    
    if (!fs.existsSync(teamPath)) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    const team = JSON.parse(fs.readFileSync(teamPath, 'utf8'));
    
    // Update team properties
    team.name = name;
    team.description = description || '';
    team.imageUrl = imageUrl;
    team.imagePrompt = imagePrompt || '';
    team.objective = objective;
    team.context = context || '';
    team.files = files || [];
    team.members = members || [];
    team.plan = plan || [];
    team.updatedAt = new Date().toISOString();
    
    // Save the updated team
    fs.writeFileSync(teamPath, JSON.stringify(team, null, 2));
    
    res.status(200).json(team);
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ message: 'Failed to update team', error: error.message });
  }
};

// Delete a team
exports.deleteTeam = async (req, res) => {
  try {
    const teamId = req.params.id;
    const teamPath = path.join(teamsDir, `${teamId}.json`);
    
    if (!fs.existsSync(teamPath)) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Delete the team file
    fs.unlinkSync(teamPath);
    
    res.status(200).json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ message: 'Failed to delete team', error: error.message });
  }
};

// Generate a team image
exports.generateTeamImage = async (req, res) => {
  try {
    const { imagePrompt } = req.body;
    
    if (!imagePrompt) {
      return res.status(400).json({ error: 'Image prompt is required' });
    }
    
    // Create avatars directory if it doesn't exist
    try {
      await fsPromises.mkdir(avatarsDir, { recursive: true });
    } catch (mkdirError) {
      console.error('Error creating avatars directory:', mkdirError);
      throw new Error(`Failed to create avatars directory: ${mkdirError.message}`);
    }
    
    // Call DALL-E API to generate image
    console.log('Generating team image with prompt:', imagePrompt);
    
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        {
          model: "dall-e-3",
          prompt: imagePrompt,
          n: 1,
          size: "1024x1024"
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.data || !response.data.data || !response.data.data[0] || !response.data.data[0].url) {
        throw new Error('Invalid response from DALL-E API');
      }
      
      const imageUrl = response.data.data[0].url;
      
      // Download the image
      console.log('Downloading image from:', imageUrl);
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      
      // Save the image
      const timestamp = Date.now();
      const imagePath = path.join(avatarsDir, `team_${timestamp}.png`);
      await fsPromises.writeFile(imagePath, imageResponse.data);
      
      // Return the relative URL
      const relativeUrl = `/avatars/team_${timestamp}.png`;
      console.log('Successfully saved team image, returning URL:', relativeUrl);
      
      res.json({ imageUrl: relativeUrl });
    } catch (apiError) {
      console.error('Error calling DALL-E API:', apiError.response?.data || apiError.message);
      throw new Error(`Failed to generate image: ${apiError.message}`);
    }
  } catch (error) {
    console.error('Error generating team image:', error);
    res.status(500).json({ error: `Failed to generate team image: ${error.message}` });
  }
};

// Generate a team plan
exports.generateTeamPlan = async (req, res) => {
  try {
    const { objective, context, availableAvatars } = req.body;
    
    if (!objective) {
      return res.status(400).json({ error: 'Team objective is required' });
    }
    
    const planData = await teamService.generateTeamPlan(objective, context, availableAvatars);
    res.json(planData);
  } catch (error) {
    console.error('Error generating team plan:', error);
    res.status(500).json({ error: `Failed to generate team plan: ${error.message}` });
  }
};

// Get all teams
exports.getAllTeams = async (req, res) => {
  try {
    const teams = [];
    
    // Read all team files
    const files = fs.readdirSync(teamsDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const teamData = JSON.parse(fs.readFileSync(path.join(teamsDir, file), 'utf8'));
        teams.push(teamData);
      }
    }
    
    // Sort by updatedAt in descending order
    teams.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    res.status(200).json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ message: 'Failed to fetch teams', error: error.message });
  }
};

// Generate an image for the team
exports.generateImage = async (req, res) => {
  try {
    const { imagePrompt } = req.body;
    
    if (!imagePrompt) {
      return res.status(400).json({ message: 'Image prompt is required' });
    }
    
    // Use DALL-E to generate an image
    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard"
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );
    
    if (!response.data || !response.data.data || !response.data.data[0] || !response.data.data[0].url) {
      throw new Error('Invalid response from image generation API');
    }
    
    const imageUrl = response.data.data[0].url;
    
    // Download the image
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(imageResponse.data, 'binary');
    
    // Save the image to the local filesystem
    const uploadsDir = path.join(__dirname, '../../storage/team-images');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      await fsPromises.mkdir(uploadsDir, { recursive: true });
    }
    
    const filename = `team-${Date.now()}.png`;
    const filepath = path.join(uploadsDir, filename);
    
    await fsPromises.writeFile(filepath, buffer);
    
    // Return the local URL
    const localImageUrl = `/team-images/${filename}`;
    
    res.status(200).json({ imageUrl: localImageUrl });
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ message: 'Failed to generate image', error: error.message });
  }
};

// Generate a plan for the team
exports.generatePlan = async (req, res) => {
  try {
    const { objective, context, availableAvatars } = req.body;
    
    if (!objective) {
      return res.status(400).json({ message: 'Team objective is required' });
    }
    
    if (!availableAvatars || !Array.isArray(availableAvatars)) {
      return res.status(400).json({ message: 'Available avatars are required' });
    }
    
    // Use Claude to generate a plan
    const systemPrompt = `You are a team planning assistant. Your task is to create a detailed plan for a team to achieve their objective.
Based on the team's objective and the available team members, you will:
1. Recommend which team members should be included in the team based on their roles and expertise
2. Create a step-by-step plan for the team to achieve their objective

The plan should include:
- Sequential steps with clear titles and descriptions
- Assignment of team members to each step
- A reviewer for each step
- Expected output for each step

Respond with a JSON object in the following format:
{
  "recommendedMembers": [
    {
      "id": "member-id",
      "name": "Member Name",
      "role": "Member Role",
      "justification": "Why this member is recommended"
    }
  ],
  "plan": [
    {
      "stepNumber": 1,
      "title": "Step Title",
      "description": "Detailed description of the step",
      "assignedMembers": ["Member Name 1", "Member Name 2"],
      "reviewedBy": "Member Name 3",
      "expectedOutput": "Expected output of this step"
    }
  ]
}`;

    const userPrompt = `Team Objective: ${objective}
${context ? `Additional Context: ${context}` : ''}

Available Team Members:
${availableAvatars.map(avatar => `- ${avatar.name} (${avatar.role})`).join('\n')}

Please create a team plan based on this information.`;

    const response = await mcpService.callModel({
      model: 'claude-3-sonnet-20240229',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });
    
    if (!response || !response.content) {
      throw new Error('Invalid response from plan generation API');
    }
    
    // Parse the JSON response
    let planData;
    try {
      // Extract JSON from the response
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/) || 
                        response.content.match(/```\n([\s\S]*?)\n```/) ||
                        response.content.match(/{[\s\S]*?}/);
      
      const jsonString = jsonMatch ? jsonMatch[0] : response.content;
      planData = JSON.parse(jsonString);
    } catch (err) {
      console.error('Error parsing plan JSON:', err);
      throw new Error('Failed to parse plan data');
    }
    
    res.status(200).json(planData);
  } catch (error) {
    console.error('Error generating plan:', error);
    res.status(500).json({ message: 'Failed to generate plan', error: error.message });
  }
};

// Start a team chat
exports.startTeamChat = async (req, res) => {
  try {
    const { teamId } = req.params;
    const teamPath = path.join(teamsDir, `${teamId}.json`);
    
    if (!fs.existsSync(teamPath)) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    const team = JSON.parse(fs.readFileSync(teamPath, 'utf8'));
    
    // Create a new chat session with the team members
    const chatId = uuidv4();
    const sessionName = `Team: ${team.name}`;
    
    // Prepare the system prompt
    const systemPrompt = `You are part of a team with the following objective: ${team.objective}
${team.context ? `Additional context: ${team.context}` : ''}

The team consists of the following members:
${team.members.map(member => `- ${member.name} (${member.role})`).join('\n')}

The team has the following plan:
${team.plan.map(step => `Step ${step.stepNumber}: ${step.title}
Description: ${step.description}
Assigned to: ${step.assignedMembers.join(', ')}
Reviewed by: ${step.reviewedBy}
Expected output: ${step.expectedOutput}`).join('\n\n')}

Your role is to collaborate with the other team members to achieve the team's objective.`;

    // Create the initial messages
    const messages = [
      {
        id: uuidv4(),
        role: 'system',
        content: systemPrompt,
        timestamp: new Date().toISOString()
      }
    ];
    
    // Create the session
    const session = {
      id: chatId,
      name: sessionName,
      messages,
      avatars: team.members.map(member => member.id),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save the session
    const sessionsDir = path.join(__dirname, '../data/sessions');
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true });
    }
    
    const sessionPath = path.join(sessionsDir, `${chatId}.json`);
    fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
    
    res.status(201).json({ chatId });
  } catch (error) {
    console.error('Error starting team chat:', error);
    res.status(500).json({ message: 'Failed to start team chat', error: error.message });
  }
}; 