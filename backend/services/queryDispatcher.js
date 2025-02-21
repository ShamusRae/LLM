const { decideAvatarOrder } = require('./avatarDecisionService');
const avatarService = require('./avatarService');

exports.dispatch = async ({ message, avatarId, chatHistory = [], activeAvatars = [], offlineMode = false, selectedFiles = [], onUpdate }) => {
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
        response = await avatarService.getResponse(message, avatar, chatHistory, onUpdate, selectedFiles);
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

    // For group responses, get the avatar order decision
    const decision = await decideAvatarOrder(chatHistory, activeAvatars, message, offlineMode);
    console.log('Avatar decision received:', JSON.stringify({
      order: decision.order,
      discussionRounds: decision.discussionRounds,
      activeAvatars: activeAvatars.map(a => ({ id: a.id, name: a.name }))
    }, null, 2));

    const allResponses = [];
    const rounds = decision.discussionRounds || 1;

    // Process each round sequentially
    for (let round = 1; round <= rounds; round++) {
      // Process each avatar in sequence
      for (const id of decision.order) {
        const avatar = activeAvatars.find(a => String(a.id) === String(id));
        if (!avatar) continue;

        try {
          const previousResponses = allResponses.map(r => ({
            avatar: r.avatarName,
            message: r.response
          }));
          const response = await avatarService.getResponse(message, avatar, previousResponses, onUpdate, selectedFiles);
          
          if (response && response.responses && response.responses[0]) {
            const singleResp = {
              ...response.responses[0],
              round,
              imageUrl: avatar.imageUrl || null
            };

            // Ensure we have a valid response text
            if (!singleResp.response || singleResp.response.trim() === '') {
              singleResp.response = "I apologize, but I encountered an issue generating a response. Please try again.";
            }

            allResponses.push(singleResp);
          }
        } catch (err) {
          console.error(`Error getting response from avatar ${avatar.name}:`, err);
          const errorResp = {
            avatarId: avatar.id,
            avatarName: avatar.name,
            imageUrl: avatar.imageUrl || null,
            response: `I apologize, but I encountered an error: ${err.message}. Please try again.`,
            round,
            isThinking: false,
            error: true
          };
          allResponses.push(errorResp);
        }
        
        // Add a short delay before processing the next avatar
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('All responses collected:', {
      totalResponses: allResponses.length,
      rounds,
      respondingAvatars: allResponses.map(r => ({
        name: r.avatarName,
        round: r.round,
        responseLength: r.response?.length || 0
      }))
    });

    return { responses: allResponses, discussionRounds: rounds };
  } catch (error) {
    console.error('Error in query dispatch:', error);
    throw error;
  }
}; 