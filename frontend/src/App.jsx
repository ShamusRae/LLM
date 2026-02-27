import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import SettingsScreen from './components/SettingsScreen';
import TeamPage from './pages/TeamPage';
import ConsultingPage from './pages/ConsultingPage';
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
          <header className="bg-gradient-to-r from-slate-900 to-[#002466] shadow-sm border-b border-slate-700 px-4 py-3">
            <nav className="flex justify-between items-center max-w-7xl mx-auto">
              <div className="flex items-center">
                <Link to="/" className="flex items-center">
                  <Logo className="h-12 w-12 rounded-lg object-cover" />
                </Link>
              </div>
              <div className="text-center flex-grow">
                <Link to="/" className="text-xl font-semibold text-white">
                  Rovesg Family Office
                </Link>
              </div>
              <div className="flex space-x-2">
                <Link to="/" className="px-4 py-2 rounded-md bg-slate-800/80 hover:bg-[#819f3d] hover:text-white transition-colors text-white">
                  💬 Chat
                </Link>
                <Link to="/teams" className="px-4 py-2 rounded-md bg-slate-800/80 hover:bg-[#819f3d] hover:text-white transition-colors text-white">
                  👥 Teams
                </Link>
                <Link to="/consulting" className="px-4 py-2 rounded-md bg-slate-800/80 hover:bg-[#819f3d] hover:text-white transition-colors text-white">
                  🏢 Consulting
                </Link>
                <Link to="/agent-wizard" className="px-4 py-2 rounded-md bg-slate-800/80 hover:bg-[#819f3d] hover:text-white transition-colors text-white">
                  🧙 Create Agent
                </Link>
                <Link to="/automation" className="px-4 py-2 rounded-md bg-slate-800/80 hover:bg-[#819f3d] hover:text-white transition-colors text-white">
                  🔄 Flow Editor
                </Link>
                <Link to="/settings" className="px-4 py-2 rounded-md bg-slate-800/80 hover:bg-[#819f3d] hover:text-white transition-colors text-white">
                  ⚙️ Settings
                </Link>
              </div>
            </nav>
          </header>
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/teams" element={<TeamPage />} />
            <Route path="/consulting" element={<ConsultingPage />} />
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