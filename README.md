# 🤖 LLM Chat - Advanced Multi-Model AI Chat Platform

A sophisticated LLM chat application featuring multi-model support, MCP tool integration, and real-time financial data access.

## 🌟 Key Features

### **Multi-Model AI Support**
- **OpenAI** (GPT-4, GPT-4o)
- **Anthropic** (Claude 3.5 Sonnet, Claude 3 Opus)  
- **Ollama** (Local models: QwQ, DeepSeek, etc.)

### **Real-Time Data Integration (MCP)**
- **✅ Yahoo Finance**: Live stock prices, market data, historical charts
- **✅ SEC Edgar**: Company filings, 10-K, 10-Q, 8-K reports
- **🔧 Google Maps**: Location search and mapping (configurable)
- **🔧 Weather Data**: Current conditions and forecasts (configurable)
- **🔧 Companies House**: UK company information (configurable)

### **Advanced Chat Features**
- **Conversation Context**: Persistent memory across sessions
- **Thinking Indicators**: Visual feedback during AI processing
- **Smart Auto-Scroll**: Intelligent chat navigation
- **File Upload**: Document analysis and context integration
- **Session Management**: Save and resume conversations

### **Avatar & Team Management**
- **Custom Avatars**: Create AI personas with specific roles
- **Tool Configuration**: Per-avatar tool access control
- **Team Collaboration**: Multi-avatar discussions
- **Agent Wizard**: Guided avatar creation process

### **Visual Workflow Editor**
- **Flow-based Design**: Drag-and-drop workflow creation
- **Node-based Processing**: Data transformation, API integration
- **Real-time Execution**: Live workflow processing
- **Custom Nodes**: Extensible architecture

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+**
- **Python 3.8+** (for RD-Agent features)
- **Git**

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/ShamusRae/LLM.git
cd LLM
```

2. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your API keys:
```env
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_claude_key_here
```

3. **Install dependencies**
```bash
# Backend
cd backend && npm install

# Frontend  
cd ../frontend && npm install
```

4. **Start the application**
```bash
# From project root
./start.sh
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## 🔧 Configuration

### **MCP Tools Setup**

Enable real-time data tools in Settings:

- **Yahoo Finance** ✅ (Working) - Real stock data via `yahoo-finance2`
- **SEC Edgar** ✅ (Working) - Official SEC API integration  
- **Google Maps** - Requires `GOOGLE_MAPS_API_KEY`
- **Weather Data** - Requires weather service API key
- **Companies House** - Requires Companies House API key

### **Ollama Setup (Optional)**

For local AI models:
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull models
ollama pull qwq:latest
ollama pull deepseek-r1:32b
```

## 🏗️ Architecture

```
LLM Chat/
├── backend/                 # Node.js Express API
│   ├── controllers/        # API endpoints
│   ├── services/          # Business logic
│   │   ├── ai/           # AI provider integrations
│   │   ├── mcpService.js # MCP tool management
│   │   └── yahooFinance/ # Real-time finance data
│   └── routes/           # API routing
├── frontend/               # React application
│   ├── components/        # UI components
│   ├── pages/            # Application pages  
│   ├── services/         # API clients
│   └── store/           # State management
└── modules/               # Extension modules
    └── rd-agent/         # Predictive modeling
```

## 🛠️ Development

### **Backend Development**
```bash
cd backend
npm run dev        # Development server
npm run test       # Run tests
```

### **Frontend Development**  
```bash
cd frontend
npm run dev        # Vite dev server
npm run build      # Production build
npm run test       # Run tests
```

### **Process Management**
```bash
./start.sh         # Start all services
./stop.sh          # Stop all services  
./status.sh        # Check service status
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT models and function calling
- **Anthropic** for Claude models  
- **Yahoo Finance** for real-time market data
- **SEC.gov** for financial filings API
- **Ollama** for local model hosting

## 🐛 Issues & Support

Found a bug or need help? Please open an issue on [GitHub](https://github.com/ShamusRae/LLM/issues).

---

**⭐ Star this repo if you find it useful!** 