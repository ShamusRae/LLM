const aiService = require('./ai/aiService');

async function decideAvatarOrder(chatHistory, avatars, message) {
  if (!Array.isArray(avatars) || avatars.length === 0) {
    return { order: [], discussionRounds: 0 };
  }

  const lowerMsg = message.toLowerCase();
  const isComplex = ['compare', 'analyze', 'explain', 'brainstorm'].some(kw => lowerMsg.includes(kw)) || message.length > 100;

  try {
    let prompt = "You are an expert in organizing chat avatar responses.\n";
    prompt += "Chat History:\n" + (chatHistory.length > 0 ? chatHistory.join("\n") : "<no history>") + "\n\n";
    prompt += "Active Avatars:\n";
    avatars.forEach(avatar => {
      prompt += `ID: ${avatar.id}, Name: ${avatar.name}, Role: ${avatar.role}, Skills: ${Array.isArray(avatar.skills) ? avatar.skills.join(", ") : avatar.skills}\n`;
    });
    prompt += "\nUser Query: " + message + "\n\n";
    prompt += isComplex
      ? "The query is complex. Include all active avatar IDs in the 'order' and set 'discussionRounds' to at least 2.\n"
      : "The query is simple. Choose one or two relevant avatars and set 'discussionRounds' to 1.\n";
    prompt += "Respond with a JSON object: { \"order\": [\"id1\", \"id2\"], \"discussionRounds\": 1 }";

    const provider = aiService.getProvider('openai', process.env.OPENAI_API_KEY);
    const response = await provider.generateResponse(prompt, { model: 'gpt-4-turbo-preview' });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsedContent = JSON.parse(content.replace(/```[a-z]*\n?([\s\S]*?)\n?```/, '$1').trim());
      if (parsedContent && Array.isArray(parsedContent.order)) {
        const validAvatarIds = new Set(avatars.map(a => String(a.id)));
        parsedContent.order = parsedContent.order.map(String).filter(id => validAvatarIds.has(id));
        if (parsedContent.order.length === 0) {
          parsedContent.order = [String(avatars[0].id)];
        }
        return parsedContent;
      }
    }
  } catch (error) {
    console.error("Error in avatar decision service:", error.message);
  }

  // Fallback decision
  return {
    order: isComplex ? avatars.map(a => String(a.id)) : [String(avatars[0].id)],
    discussionRounds: isComplex ? 2 : 1
  };
}

module.exports = { decideAvatarOrder }; 