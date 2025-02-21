# LLM Chat

A modern chat application featuring multiple AI avatars with different personalities and expertise. Built with React, Node.js, and various LLM integrations.

## Features

- Multi-avatar chat support with context-aware responses
- Real-time streaming of AI responses
- Interactive data visualization with Chart.js
- File upload and management
- Session management and history
- Customizable avatar personalities and roles
- Support for multiple LLM providers (OpenAI, Anthropic, Ollama)

## Setup

### Prerequisites

- Node.js 16+
- npm or yarn
- OpenAI API key (and optionally Anthropic API key)
- Ollama (optional, for local models)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Engine-B/llm-chat.git
cd llm-chat
```

2. Install dependencies for both frontend and backend:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables:
Create a `.env` file in the backend directory with:
```
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key (optional)
```

4. Start the application:
```bash
# From the root directory
./start.sh
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Usage

1. Select one or more avatars from the avatar list
2. Type your message in the chat input
3. The selected avatars will respond in sequence, building upon each other's responses
4. Graphs and visualizations will be rendered automatically when included in responses

## Development

- Frontend: Built with React, Vite, and TailwindCSS
- Backend: Node.js with Express
- Real-time updates using Server-Sent Events (SSE)
- File management with local storage
- Session management for conversation persistence 