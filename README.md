# LLM Chat Application 🤖💬

A robust, multi-service LLM chat application with dynamic port discovery and AI service orchestration.

## 🚀 Quick Start

```bash
# Start all services with automatic port discovery
./start.sh

# Check application status
./status.sh

# View real-time logs
./logs.sh

# Stop all services
./stop.sh
```

## 🏗️ Architecture

This application consists of three main services:

- **Backend** (`backend/`) - Express.js API server with AI service integration
- **Frontend** (`frontend/`) - React application with Vite dev server
- **Avatar Wrapper** (`modules/avatar_predictive_wrapper_rd_agent/`) - AI agent wrapper service

## 🌐 Dynamic Port Discovery

The application automatically discovers available ports to avoid conflicts:

- **Backend**: Starts from port 3001, finds next available
- **Avatar Wrapper**: Starts from Backend port + 1
- **Frontend**: Starts from port 5173, finds next available

### Port Configuration

Ports can be configured via environment variables:

```bash
# Set custom ports (optional)
export BACKEND_PORT=4001
export WRAPPER_PORT=4002
export FRONTEND_PORT=6173

# Start with custom ports
./start.sh
```

## 📁 Project Structure

```
LLM Chat/
├── backend/                 # Express.js backend
│   ├── services/ai/        # AI service providers (OpenAI, Claude, Ollama)
│   ├── routes/             # API routes
│   ├── controllers/        # Route controllers
│   └── server.js           # Main server file
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   └── state/          # Redux state management
│   └── vite.config.js      # Vite configuration
├── modules/                # Additional services
│   └── avatar_predictive_wrapper_rd_agent/
├── ecosystem.config.js     # PM2 configuration
├── start.sh               # Dynamic startup script
├── stop.sh                # Stop all services
├── logs.sh                # View logs
├── status.sh              # Check status
└── .env.example           # Environment variables example
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Service Ports (auto-discovered if not set)
BACKEND_PORT=3001
WRAPPER_PORT=3002
FRONTEND_PORT=5173

# API Keys
OPENAI_API_KEY=your_openai_api_key_here
CLAUDE_API_KEY=your_claude_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### AI Service Integration

The application supports multiple AI providers:

- **OpenAI**: GPT models, DALL-E image generation
- **Claude**: Anthropic's Claude models
- **Ollama**: Local model execution

## 📊 Process Management

The application uses PM2 for robust process management:

```bash
# View detailed process status
pm2 status

# View logs for specific service
pm2 logs backend
pm2 logs frontend
pm2 logs avatar-wrapper

# Restart specific service
pm2 restart backend

# Monitor processes
pm2 monit
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm or yarn
- PM2 (`npm install -g pm2`)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install --prefix backend
   npm install --prefix frontend
   ```
3. Configure environment variables (copy `.env.example` to `.env`)
4. Start the application: `./start.sh`

### Adding New AI Providers

1. Create a new provider class in `backend/services/ai/`
2. Extend `BaseProvider` and implement required methods
3. Register the provider in `aiService.js`

## 🚦 Health Checks

The application includes health check endpoints:

- Backend: `http://localhost:{BACKEND_PORT}/api/health`
- Model Discovery: `http://localhost:{BACKEND_PORT}/api/llm/discover`

## 📝 API Documentation

### Core Endpoints

- `GET /api/health` - Service health check
- `GET /api/settings` - User settings and configuration
- `GET /api/chat/sessions` - Chat session history
- `POST /api/chat` - Send chat message
- `GET /api/llm/discover` - Discover available AI models

## 🔒 Security Considerations

- API keys are loaded from environment variables
- CORS is configured for local development
- File uploads are validated and size-limited
- All AI API calls are properly authenticated

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**: The startup script automatically finds available ports
2. **Service not starting**: Check `pm2 logs` for detailed error messages
3. **API keys**: Ensure valid API keys are set in `.env`
4. **Dependencies**: Run `npm install` in both `backend/` and `frontend/` directories

### Debug Commands

```bash
# Check which ports are in use
lsof -i -P | grep LISTEN

# View PM2 process details
pm2 show backend

# Reset PM2 processes
pm2 delete all
./start.sh
```

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

Built with ❤️ using Node.js, React, and modern AI APIs. 