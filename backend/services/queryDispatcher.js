const teamCollaborationService = require('./teamCollaborationService');
const avatarService = require('./avatarService');

exports.dispatch = async ({ message, avatarId, chatHistory = [], activeAvatars = [], offlineMode = false, selectedFiles = [], selectedDataFeeds = [], onUpdate }) => {
  console.log('Query dispatch started:', { message, avatarId, activeAvatarsCount: activeAvatars.length });

  try {
    // If specific avatarId is provided, just get response from that avatar
    if (avatarId) {
      console.log('Single avatar response requested:', { avatarId });
      const avatar = activeAvatars.find(a => String(a.id) === String(avatarId));
      if (!avatar) {
        throw new Error(`Avatar ${avatarId} not found`);
      }
      
      let response;
      try {
        response = await avatarService.getResponse(message, avatar, chatHistory, onUpdate, selectedFiles, [], selectedDataFeeds);
      } catch (error) {
        console.error('Error getting single avatar response:', error);
        response = {
          responses: [{
            avatarId: avatar.id,
            avatarName: avatar.name,
            imageUrl: avatar.imageUrl || null,
            response: "I'm sorry, I'm currently experiencing technical difficulties generating a response.",
            round: 1,
            isThinking: false
          }],
          discussionRounds: 1
        };
      }
      
      return response;
    }

    // For exactly one active avatar, skip collaboration loop to avoid duplicate rounds.
    if (activeAvatars.length === 1) {
      const singleAvatar = activeAvatars[0];
      return await teamCollaborationService.singleAvatarResponse(
        message,
        singleAvatar,
        chatHistory,
        onUpdate,
        selectedFiles,
        selectedDataFeeds
      );
    }

    // For group responses, use the team collaboration service
    console.log('🤝 Using team collaboration for', activeAvatars.length, 'avatars');
    
    const response = await teamCollaborationService.orchestrateCollaboration({
      message,
      activeAvatars,
      chatHistory,
      onUpdate,
      selectedFiles,
      selectedDataFeeds
    });

    console.log('✅ Team collaboration completed:', {
      responsesCount: response.responses?.length,
      collaborationType: response.collaborationType,
      completionReason: response.completionReason
    });

    return response;

  } catch (error) {
    console.error('Error in query dispatcher:', error);
    
    // Fallback to simple single avatar response
    if (activeAvatars.length > 0) {
      try {
        const fallbackAvatar = activeAvatars[0];
        const fallbackResponse = await avatarService.getResponse(message, fallbackAvatar, chatHistory, onUpdate, selectedFiles, [], selectedDataFeeds);
        
        return {
          responses: fallbackResponse.responses || [{
            avatarId: fallbackAvatar.id,
            avatarName: fallbackAvatar.name,
            imageUrl: fallbackAvatar.imageUrl || null,
            response: fallbackResponse.response || fallbackResponse,
            round: 1,
            isThinking: false
          }],
          discussionRounds: 1,
          collaborationType: 'fallback',
          error: error.message
        };
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
    
    throw error;
  }
}; 