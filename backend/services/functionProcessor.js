exports.processResponse = (responseText) => {
  // Process special markers in LLM responses
  let processed = responseText;
  if (responseText.includes('[GRAPH]')) {
    // Extract JSON graph data (parsing simplified)
    processed = { type: 'graph', data: {/* parsed graph JSON here */} };
  } else if (responseText.includes('[TABLE]')) {
    // Extract table markdown content after the marker
    processed = { type: 'table', markdown: responseText.split('[TABLE]')[1] };
  }
  return processed;
}; 