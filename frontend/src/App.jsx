import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import SettingsScreen from './components/SettingsScreen';
import TeamPage from './pages/TeamPage';
import Logo from './components/Logo';
import AgentWizard from './components/AgentWizard';
import FlowEditor from './components/FlowEditor';
import ChatPage from './pages/ChatPage'; // Import our new ChatPage
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';

const App = () => {
  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-[#f7f7f6]">
          <header className="bg-[#2d3c59] shadow-sm border-b border-gray-200 px-4 py-3">
            <nav className="flex justify-between items-center max-w-7xl mx-auto">
              <div className="flex items-center">
                <Link to="/" className="flex items-center">
                  <Logo className="h-14 w-14" />
                </Link>
              </div>
              <div className="text-center flex-grow">
                <Link to="/" className="text-xl font-semibold text-white">
                  Your Virtual Team
                </Link>
              </div>
              <div className="flex space-x-2">
                <Link to="/" className="px-4 py-2 rounded-md bg-[#2e334e] hover:bg-[#7dd2d3] hover:text-[#2d3c59] transition-colors text-white">
                  💬 Chat
                </Link>
                <Link to="/teams" className="px-4 py-2 rounded-md bg-[#2e334e] hover:bg-[#7dd2d3] hover:text-[#2d3c59] transition-colors text-white">
                  👥 Teams
                </Link>
                <Link to="/agent-wizard" className="px-4 py-2 rounded-md bg-[#2e334e] hover:bg-[#7dd2d3] hover:text-[#2d3c59] transition-colors text-white">
                  🧙 Create Agent
                </Link>
                <Link to="/automation" className="px-4 py-2 rounded-md bg-[#2e334e] hover:bg-[#7dd2d3] hover:text-[#2d3c59] transition-colors text-white">
                  🔄 Flow Editor
                </Link>
                <Link to="/settings" className="px-4 py-2 rounded-md bg-[#2e334e] hover:bg-[#7dd2d3] hover:text-[#2d3c59] transition-colors text-white">
                  ⚙️ Settings
                </Link>
              </div>
            </nav>
          </header>
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/teams" element={<TeamPage />} />
            <Route path="/agent-wizard" element={<AgentWizard />} />
            <Route path="/automation" element={<FlowEditor />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
};

export default App;