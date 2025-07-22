import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';

/**
 * ConsultingPage - Main interface for the Partner-Principal-Associate consulting system
 * Provides project creation, progress tracking, and deliverable management
 */
const ConsultingPage = () => {
  const [activeProjects, setActiveProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressUpdates, setProgressUpdates] = useState([]);
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [executionUpdates, setExecutionUpdates] = useState([]);
  const [activeAgents, setActiveAgents] = useState([]);
  
  // New project form state
  const [newProject, setNewProject] = useState({
    query: '',
    context: '',
    expectedDeliverables: [],
    timeframe: '',
    budget: '',
    urgency: 'normal'
  });

  const progressRef = useRef(null);

  // Load active projects on component mount
  useEffect(() => {
    // Clear any corrupted project data on load
    try {
      const projects = JSON.parse(localStorage.getItem('consulting_projects') || '[]');
      const validProjects = projects.filter(project => 
        project && project.id && typeof project.id === 'string' && project.id.length > 5
      );
      if (validProjects.length !== projects.length) {
        console.log('Cleaned up corrupted project data');
        localStorage.setItem('consulting_projects', JSON.stringify(validProjects));
      }
    } catch (error) {
      console.log('Clearing corrupted localStorage data');
      localStorage.removeItem('consulting_projects');
    }
    loadActiveProjects();
  }, []);

  // Refresh selected project when activeProjects changes
  useEffect(() => {
    if (selectedProject && activeProjects.length > 0) {
      const updatedProject = activeProjects.find(p => p.id === selectedProject.id);
      if (updatedProject && updatedProject.status !== selectedProject.status) {
        console.log('Updating selected project due to status change:', updatedProject.status);
        setSelectedProject({...updatedProject});
      }
    }
  }, [activeProjects, selectedProject]);

  const loadActiveProjects = async () => {
    try {
      // For now, we'll manage projects in localStorage since we don't have persistence
      const projects = JSON.parse(localStorage.getItem('consulting_projects') || '[]');
      setActiveProjects(projects);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.query.trim()) {
      setError('Please describe what you need help with');
      return;
    }
    setLoading(true);
    setError(null);
    setProgressUpdates([]);
    setShowProgressModal(true);
    
    // Add initial progress update
    setProgressUpdates([{
      phase: 'starting',
      message: 'Preparing your consulting project...',
      progress: 5,
      timestamp: new Date()
    }]);
    
    try {
      // Create project request
      const projectRequest = {
        ...newProject,
        expectedDeliverables: newProject.expectedDeliverables.filter(d => d.trim()),
        createdAt: new Date().toISOString(),
        id: Date.now().toString()
      };

      // Update progress
      setProgressUpdates(prev => [...prev, {
        phase: 'analyzing',
        message: 'Analyzing project requirements...',
        progress: 25,
        timestamp: new Date()
      }]);

      const response = await axios.post('/api/consulting/start', projectRequest);
      
      // DEBUG: Log the full response
      console.log('=== CONSULTING API RESPONSE DEBUG ===');
      console.log('Full response:', JSON.stringify(response.data, null, 2));
      console.log('Project object:', response.data.project);
      console.log('Project status:', response.data.project?.status);
      console.log('Project feasible:', response.data.project?.feasible);
      console.log('Project reason:', response.data.project?.reason);
      console.log('=====================================');
      
      if (response.data.success) {
        // Check if project was marked as infeasible
        if (response.data.project && response.data.project.status === 'infeasible') {
          setProgressUpdates(prev => [...prev, {
            phase: 'infeasible',
            message: 'Project marked as not feasible',
            progress: 100,
            timestamp: new Date()
          }]);
        } else {
          // Update progress
          setProgressUpdates(prev => [...prev, {
            phase: 'completed',
            message: 'Project analysis complete!',
            progress: 100,
            timestamp: new Date()
          }]);
        }
        // Save to localStorage for persistence
        const existingProjects = JSON.parse(localStorage.getItem('consulting_projects') || '[]');
        const projectWithResults = {
          ...projectRequest,
          id: response.data.project.projectId || projectRequest.id, // Use backend's project ID
          project: response.data.project,
          progressUpdates: response.data.progressUpdates || [],
          status: response.data.project.status || 'initiated'
        };
        
        existingProjects.push(projectWithResults);
        localStorage.setItem('consulting_projects', JSON.stringify(existingProjects));
        
        // Update state and close modal immediately
        setActiveProjects([...existingProjects]);
        setSelectedProject({...projectWithResults});
        
        // Reset form
        setNewProject({
          query: '',
          context: '',
          expectedDeliverables: [],
          timeframe: '',
          budget: '',
          urgency: 'normal'
        });

        // Close modals and clear loading
        setLoading(false);
        setShowNewProjectModal(false);
        setShowProgressModal(false);
        setShowProjectDetails(true);

        // Start background execution if feasible
        if (response.data.project.status === 'initiated') {
          setTimeout(() => {
            executeProject(projectWithResults);
          }, 100);
        }
      } else {
        setLoading(false);
        setShowProgressModal(false);
        setError('Failed to create project: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      setLoading(false);
      setShowProgressModal(false);
      setError(error.response?.data?.message || 'Failed to create project');
    }
  };

  const executeProject = async (project) => {
    try {
      console.log('Starting project execution for:', project.id);
      
      // Show execution modal with real backend tracking
      setShowExecutionModal(true);
      setExecutionUpdates([]);
      setActiveAgents([
        { name: 'Partner', role: 'Client Relations', status: 'reviewing', avatar: '🤵' },
        { name: 'Principal', role: 'Project Manager', status: 'pending', avatar: '👩‍💼' },
        { name: 'Research Associate', role: 'Market Research', status: 'pending', avatar: '🔍' },
        { name: 'Strategy Associate', role: 'Strategic Analysis', status: 'pending', avatar: '📊' }
      ]);

      // Add initial progress update
      setExecutionUpdates([{
        id: Date.now(),
        agent: 'System',
        message: 'Starting project execution...',
        timestamp: new Date(),
        progress: 5,
        phase: 'starting'
      }]);

      // Make the main execution API call
      const response = await axios.post(`/api/consulting/execute/${project.id}`, {
        project: {
          id: project.id,
          projectId: project.id,
          status: 'initiated',
          workModules: project.project.workModules || [],
          requirements: project.project.requirements || {},
          ...project.project
        }
      });
      
      // Simulate progress during execution with real progress updates
      const progressSteps = [
        { agent: 'Partner', message: 'Reviewing project requirements...', progress: 10 },
        { agent: 'Principal', message: 'Coordinating work modules...', progress: 25 },
        { agent: 'Research Associate', message: 'Conducting market research...', progress: 45 },
        { agent: 'Strategy Associate', message: 'Developing strategic recommendations...', progress: 65 },
        { agent: 'Principal', message: 'Integrating all deliverables...', progress: 85 }
      ];
      
      progressSteps.forEach((step, index) => {
        setTimeout(() => {
          setExecutionUpdates(prev => [...prev, {
            id: Date.now() + index,
            agent: step.agent,
            message: step.message,
            timestamp: new Date(),
            progress: step.progress,
            phase: `step_${index}`
          }]);
          
          // Update agent status
          setActiveAgents(prev => prev.map(agent => ({
            ...agent,
            status: agent.name === step.agent ? 'active' : 
                    step.progress >= 85 ? 'completed' : agent.status
          })));
          
          // Update project in localStorage with progress for real-time progress bars
          const projects = JSON.parse(localStorage.getItem('consulting_projects') || '[]');
          const updatedProjects = projects.map(p => 
            p.id === project.id ? {
              ...p, 
              currentProgress: step.progress,
              lastUpdate: step.message,
              updatedAt: new Date()
            } : p
          );
          localStorage.setItem('consulting_projects', JSON.stringify(updatedProjects));
          setActiveProjects([...updatedProjects]);
        }, index * 1500); // 1.5 second intervals for better visibility
      });

      if (response.data.success) {
        console.log('✅ Project execution successful:', response.data);
        
        // Show final completion update after a delay
        setTimeout(() => {
          setExecutionUpdates(prev => [...prev, {
            id: Date.now() + Math.random(),
            agent: 'Partner',
            message: '🎉 Project completed successfully! All deliverables ready for client presentation.',
            timestamp: new Date(),
            progress: 100,
            phase: 'completed'
          }]);

          // Mark all agents as completed
          setActiveAgents(prev => prev.map(agent => ({ ...agent, status: 'completed' })));
        }, 6000); // After all progress steps complete
        
        // Update project with execution results
        const updatedProject = {
          ...project,
          execution: response.data.execution,
          finalReport: response.data.execution?.finalReport,
          deliverables: response.data.execution?.finalReport?.deliverables || [],
          workModules: response.data.execution?.finalReport?.deliverables?.map(d => ({
            ...d,
            status: 'completed'
          })) || project.project.workModules || [],
          progressUpdates: [...(project.progressUpdates || []), ...(response.data.progressUpdates || [])],
          status: 'completed',
          qualityScore: response.data.execution?.qualityScore || 0.85
        };

        // Update localStorage
        const projects = JSON.parse(localStorage.getItem('consulting_projects') || '[]');
        const updatedProjects = projects.map(p => p.id === project.id ? updatedProject : p);
        localStorage.setItem('consulting_projects', JSON.stringify(updatedProjects));
        
        // Force state updates
        setActiveProjects([...updatedProjects]);
        setSelectedProject({...updatedProject});
        
        // Auto-close modal after showing completion
        setTimeout(() => {
          setShowExecutionModal(false);
        }, 3000);
        
        console.log('✅ State updated, project completed:', updatedProject.status);
      }
    } catch (error) {
      console.error('❌ Error executing project:', error);
      
      // Show error in execution modal
      setExecutionUpdates(prev => [...prev, {
        id: Date.now(),
        agent: 'System',
        message: `❌ Execution failed: ${error.response?.data?.message || error.message}`,
        timestamp: new Date(),
        progress: 0,
        phase: 'error'
      }]);
      
      setError(error.response?.data?.message || 'Failed to execute project');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTest = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/consulting/quick-test', {
        query: 'I need a comprehensive market analysis for my AI-powered fintech startup targeting small businesses'
      });
      
      if (response.data.success) {
        // Create a test project entry
        const testProject = {
          id: 'test_' + Date.now(),
          query: response.data.testRequest.query,
          context: response.data.testRequest.context,
          createdAt: new Date().toISOString(),
          project: response.data.project,
          execution: response.data.execution,
          progressUpdates: response.data.progressUpdates || [],
          status: 'completed',
          isTestProject: true
        };
        
        // Add to projects list
        const existingProjects = JSON.parse(localStorage.getItem('consulting_projects') || '[]');
        existingProjects.unshift(testProject); // Add to beginning
        localStorage.setItem('consulting_projects', JSON.stringify(existingProjects));
        
        setActiveProjects(existingProjects);
        setSelectedProject(testProject);
        setShowProjectDetails(true);
      }
    } catch (error) {
      console.error('Error running quick test:', error);
      setError(error.response?.data?.message || 'Quick test failed');
    } finally {
      setLoading(false);
    }
  };

  const addDeliverable = () => {
    setNewProject({
      ...newProject,
      expectedDeliverables: [...newProject.expectedDeliverables, '']
    });
  };

  const removeDeliverable = (index) => {
    setNewProject({
      ...newProject,
      expectedDeliverables: newProject.expectedDeliverables.filter((_, i) => i !== index)
    });
  };

  const updateDeliverable = (index, value) => {
    const updated = [...newProject.expectedDeliverables];
    updated[index] = value;
    setNewProject({
      ...newProject,
      expectedDeliverables: updated
    });
  };

  const deleteProject = (projectId) => {
    if (confirm('Are you sure you want to delete this project?')) {
      const projects = JSON.parse(localStorage.getItem('consulting_projects') || '[]');
      const updatedProjects = projects.filter(p => p.id !== projectId);
      localStorage.setItem('consulting_projects', JSON.stringify(updatedProjects));
      setActiveProjects([...updatedProjects]); // Force new array reference
      
      // If deleting the currently selected project, clear selection
      if (selectedProject && selectedProject.id === projectId) {
        setSelectedProject(null);
        setShowProjectDetails(false);
      }
    }
  };

  const clearAllProjects = () => {
    if (confirm('Are you sure you want to delete ALL projects? This cannot be undone.')) {
      localStorage.setItem('consulting_projects', '[]');
      setActiveProjects([]);
      setSelectedProject(null);
      setShowProjectDetails(false);
    }
  };

  const getStatusColor = (status, project) => {
    // If project is not feasible, show as not feasible regardless of status
    if (project && project.project && project.project.feasible === false) {
      return 'bg-red-100 text-red-800';
    }
    
    switch (status) {
      case 'initiated': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status, project) => {
    // If project is not feasible, show as not feasible regardless of status
    if (project && project.project && project.project.feasible === false) {
      return 'not feasible';
    }
    
    return status;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[#2d3c59] mb-2">🏢 Consulting Services</h1>
            <p className="text-gray-600">Partner-Principal-Associate consulting system powered by AI</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleQuickTest}
              disabled={loading}
              className="px-4 py-2 bg-[#7dd2d3] text-[#2d3c59] rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-50 font-medium"
            >
              🚀 Quick Test
            </button>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="px-6 py-2 bg-[#2d3c59] text-white rounded-md hover:bg-opacity-90 transition-colors font-medium"
            >
              + New Project
            </button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-[#2d3c59]">Active Projects</h2>
            {activeProjects.length > 0 && (
              <div className="space-x-2">
                <button
                  onClick={clearAllProjects}
                  className="text-xs text-red-600 hover:text-red-800 underline"
                >
                  Clear All
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('consulting_projects');
                    setActiveProjects([]);
                    setSelectedProject(null);
                    setShowProjectDetails(false);
                    window.location.reload(); // Force clean reload
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Force Reset
                </button>
              </div>
            )}
          </div>
          
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d3c59]"></div>
              <p className="mt-2 text-gray-600">Processing...</p>
            </div>
          )}
          
          {activeProjects.length === 0 && !loading ? (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-4xl mb-2">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Projects</h3>
              <p className="text-gray-500 mb-4">Create your first consulting project to get started</p>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="px-4 py-2 bg-[#2d3c59] text-white rounded-md hover:bg-opacity-90 transition-colors"
              >
                Create Project
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeProjects.map((project, index) => (
                <div
                  key={project.id || index}
                  className="bg-white p-4 rounded-lg border hover:border-[#7dd2d3] transition-colors relative group"
                >
                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                    {/* Report button - only show for completed projects */}
                    {project.status === 'completed' && project.execution && project.execution.finalReport && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProject({...project});
                          setShowProjectDetails(true);
                        }}
                        className="text-blue-500 hover:text-blue-700 p-1 rounded bg-white shadow-sm"
                        title="View Report"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14,2 14,8 20,8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10,9 9,9 8,9"></polyline>
                        </svg>
                      </button>
                    )}
                    
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject(project.id);
                      }}
                      className="text-red-500 hover:text-red-700 p-1 rounded bg-white shadow-sm"
                      title="Delete project"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>
                  </div>

                  {/* Project content - clickable */}
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      console.log('Project clicked:', project.id, project.status);
                      setSelectedProject({...project}); // Force new object reference
                      setShowProjectDetails(true);
                    }}
                  >
                                      <div className="flex justify-between items-start mb-2 pr-12">
                    <h3 className="font-medium text-[#2d3c59] flex-1">
                      {project.project?.title || project.query.substring(0, 60) + '...'}
                      {project.isTestProject && <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">TEST</span>}
                    </h3>
                    <div className="flex items-center space-x-2">
                      {/* Report icon for completed projects */}
                      {project.status === 'completed' && project.execution && project.execution.finalReport && (
                        <span className="text-blue-500" title="Report Available">📊</span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status, project)}`}>
                        {getStatusText(project.status, project)}
                      </span>
                    </div>
                  </div>
                                      <p className="text-sm text-gray-600 mb-2">{project.context}</p>
                  
                  {/* Progress bar for executing projects */}
                  {project.status === 'initiated' && project.currentProgress && (
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-blue-600 font-medium">
                          {project.lastUpdate || 'Executing...'}
                        </span>
                        <span className="text-xs text-blue-600 font-bold">
                          {project.currentProgress}%
                        </span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-[#7dd2d3] to-blue-500 h-2 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${project.currentProgress || 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                    {project.timeframe && <span>{project.timeframe}</span>}
                  </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project Details */}
        {selectedProject && showProjectDetails && (
          <div className="bg-white rounded-lg border p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-[#2d3c59]">Project Details</h2>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(selectedProject.status, selectedProject)}`}>
                  {getStatusText(selectedProject.status, selectedProject)}
                </span>
                {selectedProject.status === 'initiated' && (
                  <div className="flex items-center mt-2 text-sm text-blue-600">
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Executing project...
                    <button 
                      onClick={() => {
                        setShowExecutionModal(true);
                        setSelectedProject({...selectedProject}); // Refresh selected project
                      }}
                      className="ml-3 text-xs underline hover:text-blue-800"
                    >
                      View Team Progress
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowProjectDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Query</h3>
                <p className="text-gray-600">{selectedProject.query}</p>
              </div>
              
              {selectedProject.context && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">Context</h3>
                  <p className="text-gray-600">{selectedProject.context}</p>
                </div>
              )}
              
              {selectedProject.project && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Project Analysis</h3>
                  <div className={`p-3 rounded ${selectedProject.project.feasible ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'}`}>
                    <p><strong>Type:</strong> {selectedProject.project.consultingType || 'Analysis'}</p>
                    <p><strong>Feasible:</strong> 
                      <span className={selectedProject.project.feasible ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                        {selectedProject.project.feasible ? '✅ Yes' : '❌ No'}
                      </span>
                    </p>
                    {selectedProject.project.estimatedDuration && (
                      <p><strong>Duration:</strong> {selectedProject.project.estimatedDuration}</p>
                    )}
                    {!selectedProject.project.feasible && selectedProject.project.reason && (
                      <div className="mt-2 p-2 bg-red-100 rounded">
                        <p className="text-sm"><strong>Reason:</strong> {selectedProject.project.reason}</p>
                      </div>
                    )}
                    {!selectedProject.project.feasible && selectedProject.project.suggestedAlternative && (
                      <div className="mt-2 p-2 bg-yellow-100 rounded">
                        <p className="text-sm"><strong>Alternative:</strong> {selectedProject.project.suggestedAlternative}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Enhanced Final Report Display */}
              {selectedProject.execution && selectedProject.execution.finalReport && (
                <div className="space-y-6">
                  {/* Report Header */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                    <h3 className="font-bold text-[#2d3c59] text-xl mb-2 flex items-center">
                      <span className="mr-3">🎯</span> Consulting Report Delivered
                    </h3>
                    <div className="flex items-center space-x-6 text-sm">
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                        ✅ Complete
                      </span>
                      <span className="text-gray-600">
                        Quality Score: <strong className="text-[#7dd2d3]">
                          {Math.round((selectedProject.execution.finalReport.qualityScore || 0.85) * 100)}%
                        </strong>
                      </span>
                      <span className="text-gray-600">
                        Execution: <strong>{selectedProject.execution.executionTime ? 
                          Math.round(selectedProject.execution.executionTime / 1000 / 60) : 'N/A'} min</strong>
                      </span>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div className="bg-white border border-blue-200 rounded-lg p-6">
                    <h4 className="font-bold text-[#2d3c59] text-lg mb-3 flex items-center">
                      <span className="mr-2">📊</span> Executive Summary
                    </h4>
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                      <p className="text-gray-800 leading-relaxed">
                        {typeof selectedProject.execution.finalReport.executiveSummary === 'string' 
                          ? selectedProject.execution.finalReport.executiveSummary
                          : selectedProject.execution.finalReport.executiveSummary?.overview || 
                            'Executive summary not available'}
                      </p>
                      
                      {selectedProject.execution.finalReport.executiveSummary?.keyTakeaways && (
                        <div className="mt-4">
                          <h5 className="font-semibold text-gray-800 mb-2">Key Takeaways:</h5>
                          <ul className="list-disc list-inside space-y-1">
                            {selectedProject.execution.finalReport.executiveSummary.keyTakeaways.map((takeaway, idx) => (
                              <li key={idx} className="text-gray-700">{takeaway}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Work Modules Completed */}
                  {selectedProject.workModules && selectedProject.workModules.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="font-bold text-[#2d3c59] text-lg mb-4 flex items-center">
                        <span className="mr-2">✅</span> Work Modules Completed
                      </h4>
                      <div className="grid gap-3">
                        {selectedProject.workModules.map((module, idx) => (
                          <div key={idx} className="flex items-center bg-green-50 p-3 rounded border-l-4 border-green-400">
                            <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm mr-3">
                              ✓
                            </div>
                            <div className="flex-1">
                              <span className="font-medium text-gray-800">{module.title || module.type}</span>
                              <div className="text-sm text-gray-600 mt-1">
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-2">
                                  {module.specialist || 'General'}
                                </span>
                                Quality: <span className="font-medium text-green-600">
                                  {Math.round((module.qualityScore || 0.85) * 100)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Findings */}
                  {selectedProject.execution.finalReport.keyFindings && selectedProject.execution.finalReport.keyFindings.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="font-bold text-[#2d3c59] text-lg mb-4 flex items-center">
                        <span className="mr-2">🔍</span> Key Findings
                      </h4>
                      <div className="space-y-3">
                        {selectedProject.execution.finalReport.keyFindings.map((finding, idx) => (
                          <div key={idx} className="flex items-start bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                            <span className="text-yellow-600 mr-3 mt-0.5 font-bold">{idx + 1}.</span>
                            <span className="text-gray-700">
                              {typeof finding === 'string' ? finding : finding?.findings || finding?.description || JSON.stringify(finding)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strategic Recommendations */}
                  {selectedProject.execution.finalReport.recommendations && selectedProject.execution.finalReport.recommendations.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="font-bold text-[#2d3c59] text-lg mb-4 flex items-center">
                        <span className="mr-2">💡</span> Strategic Recommendations
                      </h4>
                                             <div className="space-y-4">
                        {selectedProject.execution.finalReport.recommendations.map((rec, idx) => {
                          const recText = typeof rec === 'string' ? rec : rec?.title || rec?.description || JSON.stringify(rec);
                          const priority = typeof rec === 'object' ? rec?.priority || 'High' : 'High';
                          
                          return (
                            <div key={idx} className="bg-purple-50 border border-purple-200 p-4 rounded">
                              <div className="flex items-center mb-2">
                                <span className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                                  {idx + 1}
                                </span>
                                <span className="font-medium text-purple-800">{priority} Priority Recommendation</span>
                              </div>
                              <p className="text-gray-700 ml-11">{recText}</p>
                              
                              {typeof rec === 'object' && rec?.timeline && (
                                <div className="mt-2 ml-11 text-sm text-gray-600">
                                  <strong>Timeline:</strong> {rec.timeline}
                                </div>
                              )}
                              
                              {typeof rec === 'object' && rec?.impact && (
                                <div className="mt-1 ml-11 text-sm text-gray-600">
                                  <strong>Expected Impact:</strong> {rec.impact}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Implementation Roadmap */}
                  {selectedProject.execution.finalReport.implementationRoadmap && selectedProject.execution.finalReport.implementationRoadmap.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="font-bold text-[#2d3c59] text-lg mb-4 flex items-center">
                        <span className="mr-2">🛣️</span> Implementation Roadmap
                      </h4>
                                             <div className="space-y-3">
                        {selectedProject.execution.finalReport.implementationRoadmap.map((step, idx) => {
                          const stepText = typeof step === 'string' ? step : step?.description || step?.title || JSON.stringify(step);
                          const timeline = typeof step === 'object' ? step?.timeline : null;
                          
                          return (
                            <div key={idx} className="flex items-start">
                              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-[#7dd2d3] to-[#2d3c59] text-white rounded-full flex items-center justify-center font-bold mr-4 mt-1">
                                {idx + 1}
                              </div>
                              <div className="flex-1 bg-gray-50 p-3 rounded border-l-4 border-[#7dd2d3]">
                                <span className="text-gray-800">{stepText}</span>
                                {timeline && (
                                  <div className="text-sm text-gray-600 mt-1">Timeline: {timeline}</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Individual Deliverables */}
                  {selectedProject.deliverables && selectedProject.deliverables.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="font-bold text-[#2d3c59] text-lg mb-4 flex items-center">
                        <span className="mr-2">📦</span> Specialist Deliverables
                      </h4>
                      <div className="grid gap-4">
                        {selectedProject.deliverables.map((deliverable, idx) => (
                          <div key={idx} className="border border-gray-300 rounded-lg overflow-hidden">
                            <div className="bg-gray-100 px-4 py-3 border-b">
                              <div className="flex justify-between items-center">
                                <h5 className="font-bold text-[#2d3c59]">{deliverable.title}</h5>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    {deliverable.specialist}
                                  </span>
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                                    {Math.round((deliverable.qualityScore || 0.85) * 100)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="p-4">
                              <p className="text-gray-700 mb-3 italic">
                                {typeof deliverable.executiveSummary === 'string' 
                                  ? deliverable.executiveSummary 
                                  : deliverable.executiveSummary?.overview || 'Summary not available'}
                              </p>
                              
                              {deliverable.insights && Array.isArray(deliverable.insights) && deliverable.insights.length > 0 && (
                                <div className="mb-3">
                                  <h6 className="font-medium text-gray-800 mb-2">💭 Key Insights:</h6>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    {deliverable.insights.map((insight, i) => (
                                      <li key={i} className="flex items-start">
                                        <span className="text-[#7dd2d3] mr-2">•</span>
                                        <span>{typeof insight === 'string' ? insight : insight?.description || JSON.stringify(insight)}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {deliverable.recommendations && Array.isArray(deliverable.recommendations) && deliverable.recommendations.length > 0 && (
                                <div>
                                  <h6 className="font-medium text-gray-800 mb-2">🎯 Specialist Recommendations:</h6>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    {deliverable.recommendations.map((rec, i) => (
                                      <li key={i} className="flex items-start">
                                        <span className="text-green-500 mr-2">→</span>
                                        <span>{typeof rec === 'string' ? rec : rec?.title || rec?.description || JSON.stringify(rec)}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Success Metrics & Next Steps */}
                  {(selectedProject.execution.finalReport.successMetrics || selectedProject.execution.finalReport.riskMitigation) && (
                    <div className="grid md:grid-cols-2 gap-6">
                      {selectedProject.execution.finalReport.successMetrics && (
                        <div className="bg-white border border-green-200 rounded-lg p-6">
                          <h4 className="font-bold text-[#2d3c59] text-lg mb-4 flex items-center">
                            <span className="mr-2">📈</span> Success Metrics
                          </h4>
                          <ul className="space-y-2">
                            {selectedProject.execution.finalReport.successMetrics.map((metric, idx) => (
                              <li key={idx} className="flex items-center bg-green-50 p-2 rounded">
                                <span className="text-green-600 mr-2">📊</span>
                                <span className="text-gray-700">
                                  {typeof metric === 'string' ? metric : metric?.description || metric?.title || JSON.stringify(metric)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {selectedProject.execution.finalReport.riskMitigation && (
                        <div className="bg-white border border-orange-200 rounded-lg p-6">
                          <h4 className="font-bold text-[#2d3c59] text-lg mb-4 flex items-center">
                            <span className="mr-2">⚠️</span> Risk Mitigation
                          </h4>
                          <ul className="space-y-2">
                            {selectedProject.execution.finalReport.riskMitigation.map((risk, idx) => (
                              <li key={idx} className="flex items-center bg-orange-50 p-2 rounded">
                                <span className="text-orange-600 mr-2">🛡️</span>
                                <span className="text-gray-700">
                                  {typeof risk === 'string' ? risk : risk?.description || risk?.mitigation || JSON.stringify(risk)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {selectedProject.status === 'completed' && !selectedProject.execution && selectedProject.project && selectedProject.project.feasible && (
                <div className="bg-yellow-50 p-4 rounded border-l-4 border-yellow-400">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Project marked as completed but execution results not found. This may be due to a processing error.
                  </p>
                </div>
              )}
              
              {selectedProject.project && !selectedProject.project.feasible && (
                <div className="bg-red-50 p-4 rounded border-l-4 border-red-500">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">❌</span>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-red-800 mb-1">Project Not Feasible</h4>
                      <p className="text-sm text-red-700">
                        Our analysis determined that this project is not feasible as initially requested.
                      </p>
                      
                      {/* DEBUG: Show all feasibility data */}
                      <div className="mt-3 p-2 bg-gray-100 rounded text-xs">
                        <p><strong>DEBUG INFO:</strong></p>
                        <p><strong>Status:</strong> {selectedProject.project.status}</p>
                        <p><strong>Feasible:</strong> {String(selectedProject.project.feasible)}</p>
                        <p><strong>Reason:</strong> {selectedProject.project.reason || 'No reason provided'}</p>
                        <p><strong>Suggested Alternative:</strong> {selectedProject.project.suggestedAlternative || 'None'}</p>
                        <p><strong>Full Project Object:</strong></p>
                        <pre className="text-xs bg-white p-1 mt-1 overflow-auto max-h-32">
                          {JSON.stringify(selectedProject.project, null, 2)}
                        </pre>
                      </div>
                      {selectedProject.project.suggestedAlternative && (
                        <div className="mt-2 p-2 bg-yellow-100 rounded">
                          <p className="text-xs text-yellow-800">
                            <strong>💡 Suggested Alternative:</strong> {selectedProject.project.suggestedAlternative}
                          </p>
                        </div>
                      )}
                      <div className="mt-3">
                        <button 
                          onClick={() => {
                            setShowNewProjectModal(true);
                            setShowProjectDetails(false);
                          }}
                          className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                        >
                          Create New Project
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Execution Progress */}
              {selectedProject.status === 'initiated' && executionUpdates.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2 flex items-center">
                    <span className="mr-2">⚡</span> Live Execution Progress
                  </h3>
                  
                  {/* Live progress bar */}
                  <div className="mb-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-[#7dd2d3] to-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${executionUpdates[executionUpdates.length - 1]?.progress || 0}%` }}
                    />
                  </div>
                  
                  {/* Latest agent update */}
                  {executionUpdates.length > 0 && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-blue-800 text-sm">
                          {executionUpdates[executionUpdates.length - 1].agent}
                        </span>
                        <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                          {executionUpdates[executionUpdates.length - 1].progress}%
                        </span>
                      </div>
                      <p className="text-sm text-blue-700">
                        {executionUpdates[executionUpdates.length - 1].message}
                      </p>
                    </div>
                  )}
                  
                  {/* Mini team status */}
                  <div className="grid grid-cols-4 gap-2">
                    {activeAgents.map((agent, index) => (
                      <div key={index} className="text-center">
                        <div className={`text-lg ${agent.status === 'active' ? 'animate-pulse' : ''}`}>
                          {agent.avatar}
                        </div>
                        <div className={`text-xs px-1 py-0.5 rounded ${
                          agent.status === 'active' ? 'bg-green-100 text-green-800' :
                          agent.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {agent.status === 'active' ? 'Active' : 
                           agent.status === 'completed' ? 'Done' : 'Waiting'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedProject.progressUpdates && selectedProject.progressUpdates.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Initial Progress Log</h3>
                  <div className="max-h-48 overflow-y-auto bg-gray-50 p-3 rounded">
                    {selectedProject.progressUpdates.map((update, idx) => (
                      <div key={idx} className="text-xs text-gray-600 mb-1">
                        <span className="font-medium">{update.phase}:</span> {update.message}
                        {update.progress && <span className="text-[#7dd2d3]"> ({update.progress}%)</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Project Modal */}
      <Modal
        key={showNewProjectModal ? 'open' : 'closed'}
        isOpen={showNewProjectModal}
        onClose={() => {
          setShowNewProjectModal(false);
          setLoading(false);
          setError(null);
        }}
        title="🏢 New Consulting Project"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What do you need help with? *
            </label>
            <textarea
              value={newProject.query}
              onChange={(e) => setNewProject({ ...newProject, query: e.target.value })}
              placeholder="E.g., I need a comprehensive market analysis for my fintech startup..."
              className="w-full p-3 border rounded-md resize-none h-24"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Context
            </label>
            <textarea
              value={newProject.context}
              onChange={(e) => setNewProject({ ...newProject, context: e.target.value })}
              placeholder="Provide background information, current situation, constraints..."
              className="w-full p-3 border rounded-md resize-none h-20"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timeframe
              </label>
              <input
                type="text"
                value={newProject.timeframe}
                onChange={(e) => setNewProject({ ...newProject, timeframe: e.target.value })}
                placeholder="e.g., 4 weeks"
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget
              </label>
              <input
                type="text"
                value={newProject.budget}
                onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                placeholder="e.g., $25,000"
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={newProject.urgency}
              onChange={(e) => setNewProject({ ...newProject, urgency: e.target.value })}
              className="w-full p-2 border rounded-md"
            >
              <option value="low">Low Priority</option>
              <option value="normal">Normal Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Expected Deliverables
              </label>
              <button
                type="button"
                onClick={addDeliverable}
                className="text-sm text-[#2d3c59] hover:text-[#7dd2d3]"
              >
                + Add
              </button>
            </div>
            {newProject.expectedDeliverables.map((deliverable, index) => (
              <div key={index} className="flex mb-2">
                <input
                  type="text"
                  value={deliverable}
                  onChange={(e) => updateDeliverable(index, e.target.value)}
                  placeholder="e.g., Market analysis report"
                  className="flex-1 p-2 border rounded-md mr-2"
                />
                <button
                  type="button"
                  onClick={() => removeDeliverable(index)}
                  className="px-3 py-2 text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => setShowNewProjectModal(false)}
              disabled={loading}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateProject}
              disabled={loading || !newProject.query.trim()}
              className="px-6 py-2 bg-[#2d3c59] text-white rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Start Project'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Progress Modal */}
      <Modal
        isOpen={showProgressModal}
        onClose={() => {
          setShowProgressModal(false);
          setLoading(false);
        }}
        title="🚀 Creating Your Project"
      >
        <div className="space-y-4">
          {progressUpdates.map((update, index) => (
            <div key={index} className="border-l-4 border-[#7dd2d3] pl-4 py-2">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-[#2d3c59] capitalize">
                  {update.phase.replace('_', ' ')}
                </span>
                <span className="text-sm text-gray-500">
                  {update.progress}%
                </span>
              </div>
              <p className="text-gray-600 text-sm mb-2">{update.message}</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    update.phase === 'infeasible' ? 'bg-red-500' : 'bg-[#7dd2d3]'
                  }`}
                  style={{ width: `${update.progress}%` }}
                />
              </div>
              {index === progressUpdates.length - 1 && update.progress < 100 && (
                <div className="flex items-center mt-2 text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Processing...
                </div>
              )}
            </div>
          ))}
          
          {progressUpdates.length === 0 && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d3c59] mx-auto mb-4"></div>
              <p className="text-gray-600">Initializing...</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Execution Modal - Agents Working */}
      <Modal
        isOpen={showExecutionModal}
        onClose={() => setShowExecutionModal(false)}
        title="🏢 Consulting Team in Action"
        size="lg"
      >
        <div className="space-y-6">
          {/* Agent Status Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {activeAgents.map((agent, index) => (
              <div key={index} className="text-center">
                <div className={`text-4xl mb-2 ${
                  agent.status === 'active' ? 'animate-bounce' : 
                  agent.status === 'completed' ? 'opacity-100' : 'opacity-50'
                }`}>
                  {agent.avatar}
                </div>
                <div className="text-sm font-medium text-[#2d3c59]">{agent.name}</div>
                <div className="text-xs text-gray-500">{agent.role}</div>
                <div className={`text-xs mt-1 px-2 py-1 rounded-full ${
                  agent.status === 'active' ? 'bg-blue-100 text-blue-800' :
                  agent.status === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {agent.status === 'active' ? 'Working' : 
                   agent.status === 'completed' ? 'Done' : 'Waiting'}
                </div>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          {executionUpdates.length > 0 && (
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#7dd2d3] to-[#2d3c59] h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${executionUpdates[executionUpdates.length - 1]?.progress || 0}%` }}
              />
            </div>
          )}

          {/* Agent Conversations */}
          <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
            <h4 className="font-medium text-[#2d3c59] mb-3 flex items-center">
              <span className="mr-2">💬</span> Team Communications
            </h4>
            
            {executionUpdates.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="animate-pulse">Initializing consultation team...</div>
              </div>
            ) : (
              <div className="space-y-3">
                {executionUpdates.map((update) => (
                  <div key={update.id} className="flex items-start space-x-3 animate-fadeIn">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#7dd2d3] flex items-center justify-center text-white text-sm font-medium">
                      {update.agent.split(' ')[0].charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-[#2d3c59] text-sm">{update.agent}</span>
                        <span className="text-xs text-gray-500">
                          {update.timestamp.toLocaleTimeString()}
                        </span>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {update.progress}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{update.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status Footer */}
          <div className="flex justify-between items-center text-sm text-gray-600 bg-blue-50 p-3 rounded">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Consulting team is working on your project...</span>
            </div>
            <button 
              onClick={() => setShowExecutionModal(false)}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Run in background
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ConsultingPage; 