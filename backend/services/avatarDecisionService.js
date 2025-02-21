const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function decideAvatarOrder(chatHistory, avatars, message) {
  // Validate inputs
  if (!Array.isArray(avatars) || avatars.length === 0) {
    console.log('No avatars provided, returning empty decision');
    return { order: [], discussionRounds: 0 };
  }

  console.log('Deciding avatar order for:', {
    message,
    availableAvatars: avatars.map(a => ({ id: a.id, name: a.name }))
  });

  // Determine query complexity based on keywords and message length
  const lowerMsg = message.toLowerCase();
  const complexityKeywords = [
    'accounting', 'ai agents', 'audit', 'compare', 'analyze', 'explain', 'why', 'how',
    'brainstorm', 'discuss', 'debate', 'think', 'evaluate', 'suggest', 'recommend'
  ];
  const isComplex = complexityKeywords.some(keyword => lowerMsg.includes(keyword)) || 
                   message.length > 100 ||
                   avatars.length > 1; // If multiple avatars are selected, treat as complex

  console.log('Query complexity check:', { 
    message: lowerMsg, 
    isComplex, 
    avatarCount: avatars.length,
    useAllAvatars: isComplex || avatars.length > 1
  });

  try {
    // Construct the prompt for the LLM
    let prompt = "You are an expert in organizing chat avatar responses based on context.\n";
    prompt += "Chat History:\n" + (chatHistory.length > 0 ? chatHistory.join("\n") : "<no history>") + "\n\n";
    prompt += "Active Avatars:\n";
    avatars.forEach(avatar => {
      prompt += `ID: ${avatar.id}, Name: ${avatar.name}, Role: ${avatar.role}, Description: ${avatar.description}, Skills: ${Array.isArray(avatar.skills) ? avatar.skills.join(", ") : avatar.skills}\n`;
    });
    prompt += "\nUser Query: " + message + "\n\n";

    const instruction = isComplex 
      ? "Since the query is complex (involving multiple aspects or requiring detailed analysis), include all active avatar IDs in the 'order' array and set discussionRounds to at least 2." 
      : "For simple or factual queries, choose one or two most relevant avatars and set discussionRounds to 1.";
    prompt += instruction + "\n\nRespond with a JSON object containing 'order' (array of avatar IDs) and 'discussionRounds' (number).";

    console.log('Sending request to OpenAI for avatar decision');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: "system", content: "You are a helpful assistant that responds only with valid JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      try {
        let parsedContent = content.trim();
        // If content starts with code fence, remove it
        if (parsedContent.startsWith('```')) {
          parsedContent = parsedContent.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
          parsedContent = parsedContent.trim();
        }
        const decision = JSON.parse(parsedContent);
        if (decision && Array.isArray(decision.order) && typeof decision.discussionRounds === 'number') {
          // Convert all IDs to strings for comparison
          const validAvatarIds = new Set(avatars.map(a => String(a.id)));
          decision.order = decision.order
            .map(id => String(id))
            .filter(id => validAvatarIds.has(id));

          if (decision.order.length === 0) {
            console.log('No valid avatar IDs in decision, using first avatar');
            decision.order = [String(avatars[0].id)];
          }

          console.log("Final avatar decision:", {
            order: decision.order,
            discussionRounds: decision.discussionRounds,
            validAvatarIds: Array.from(validAvatarIds)
          });
          return decision;
        } else {
          console.log("Invalid decision format from OpenAI:", decision);
        }
      } catch (parseError) {
        console.error("Error parsing OpenAI response:", parseError, "\nResponse content:", content);
      }
    } else {
      console.log("Unexpected response format from OpenAI:", completion);
    }

    // If we reach here, something went wrong with the OpenAI call
    // Return a decision based on complexity
    const decision = {
      order: isComplex ? avatars.map(a => String(a.id)) : [String(avatars[0].id)],
      discussionRounds: isComplex ? 2 : 1
    };
    console.log("Using complexity-based decision:", decision);
    return decision;

  } catch (error) {
    console.error("Error in avatar decision service:", error.message);
    const decision = {
      order: [String(avatars[0].id)],
      discussionRounds: 1
    };
    console.log("Using fallback decision due to error:", decision);
    return decision;
  }
}

module.exports = { decideAvatarOrder }; 