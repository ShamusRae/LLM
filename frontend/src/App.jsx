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
        <div className="min-h-screen bg-[var(--rovesg-bg)] text-[var(--rovesg-text)]">
          <header className="bg-gradient-to-r from-[var(--rovesg-secondary)] to-[#144270] shadow-sm border-b border-[var(--rovesg-border)] px-4 py-3">
            <nav className="flex justify-between items-center max-w-7xl mx-auto">
              <div className="flex items-center">
                <Link to="/" className="flex items-center">
                  <Logo className="h-12 w-12 rounded-lg object-cover" />
                </Link>
              </div>
              <div className="text-center flex-grow">
                <Link to="/" className="text-xl font-semibold text-[var(--rovesg-text)]">
                  Rovesg Family Office
                </Link>
              </div>
              <div className="flex space-x-2">
                <Link to="/" className="px-4 py-2 rounded-md bg-[var(--rovesg-surface)]/90 hover:bg-[var(--rovesg-primary)] hover:text-[#04181b] transition-colors text-[var(--rovesg-text)] border border-[var(--rovesg-border)]">
                  💬 Chat
                </Link>
                <Link to="/teams" className="px-4 py-2 rounded-md bg-[var(--rovesg-surface)]/90 hover:bg-[var(--rovesg-primary)] hover:text-[#04181b] transition-colors text-[var(--rovesg-text)] border border-[var(--rovesg-border)]">
                  👥 Teams
                </Link>
                <Link to="/consulting" className="px-4 py-2 rounded-md bg-[var(--rovesg-surface)]/90 hover:bg-[var(--rovesg-primary)] hover:text-[#04181b] transition-colors text-[var(--rovesg-text)] border border-[var(--rovesg-border)]">
                  🏢 Consulting
                </Link>
                <Link to="/agent-wizard" className="px-4 py-2 rounded-md bg-[var(--rovesg-surface)]/90 hover:bg-[var(--rovesg-primary)] hover:text-[#04181b] transition-colors text-[var(--rovesg-text)] border border-[var(--rovesg-border)]">
                  🧙 Create Agent
                </Link>
                <Link to="/automation" className="px-4 py-2 rounded-md bg-[var(--rovesg-surface)]/90 hover:bg-[var(--rovesg-primary)] hover:text-[#04181b] transition-colors text-[var(--rovesg-text)] border border-[var(--rovesg-border)]">
                  🔄 Flow Editor
                </Link>
                <Link to="/settings" className="px-4 py-2 rounded-md bg-[var(--rovesg-surface)]/90 hover:bg-[var(--rovesg-primary)] hover:text-[#04181b] transition-colors text-[var(--rovesg-text)] border border-[var(--rovesg-border)]">
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