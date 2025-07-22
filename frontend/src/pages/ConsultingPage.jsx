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
    alert('Function called!');
    
    if (!newProject.query.trim()) {
      setError('Please describe what you need help with');
      return;
    }

    alert('About to set loading true');
    setLoading(true);
    setError(null);
    
    try {
      // Create project request
      const projectRequest = {
        ...newProject,
        expectedDeliverables: newProject.expectedDeliverables.filter(d => d.trim()),
        createdAt: new Date().toISOString(),
        id: Date.now().toString()
      };

      const response = await axios.post('/api/consulting/start', projectRequest);
      
      // Add alert to see if we get here
      alert('API call completed - success: ' + response.data.success);
      
      if (response.data.success) {
        // Save to localStorage for persistence
        const existingProjects = JSON.parse(localStorage.getItem('consulting_projects') || '[]');
        const projectWithResults = {
          ...projectRequest,
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

        // Close modal and clear loading - NUCLEAR OPTION
        alert('About to close modal - trying multiple approaches');
        setLoading(false);
        setShowNewProjectModal(false);
        setShowProjectDetails(true);
        
        // Force DOM manipulation as backup
        setTimeout(() => {
          const modal = document.querySelector('[role="dialog"], .fixed.inset-0');
          if (modal) {
            modal.remove();
            alert('Forcibly removed modal from DOM');
          }
          
          // Last resort - reload page
          if (document.querySelector('.fixed.inset-0')) {
            alert('Modal still there, reloading page...');
            window.location.reload();
          }
        }, 100);

        // Start background execution if feasible
        if (response.data.project.status === 'initiated') {
          setTimeout(() => {
            executeProject(projectWithResults);
          }, 100);
        }
      } else {
        setLoading(false);
        setError('Failed to create project: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      setLoading(false);
      setError(error.response?.data?.message || 'Failed to create project');
    }
  };

  const executeProject = async (project) => {
    try {
      console.log('Starting project execution for:', project.id);
      
      const response = await axios.post(`/api/consulting/execute/${project.id}`, {
        project: project.project
      });

      if (response.data.success) {
        console.log('Project execution successful, updating state...');
        
        // Update project with execution results
        const updatedProject = {
          ...project,
          execution: response.data.execution,
          progressUpdates: [...(project.progressUpdates || []), ...(response.data.progressUpdates || [])],
          status: 'completed'
        };

        // Update localStorage
        const projects = JSON.parse(localStorage.getItem('consulting_projects') || '[]');
        const updatedProjects = projects.map(p => p.id === project.id ? updatedProject : p);
        localStorage.setItem('consulting_projects', JSON.stringify(updatedProjects));
        
        // Force state updates
        setActiveProjects([...updatedProjects]); // Force new array reference
        setSelectedProject({...updatedProject}); // Force new object reference
        
        console.log('State updated, project completed:', updatedProject.status);
      }
    } catch (error) {
      console.error('Error executing project:', error);
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
              <button
                onClick={clearAllProjects}
                className="text-xs text-red-600 hover:text-red-800 underline"
              >
                Clear All
              </button>
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
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProject(project.id);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 p-1 rounded"
                    title="Delete project"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3,6 5,6 21,6"></polyline>
                      <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>

                  {/* Project content - clickable */}
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      console.log('Project clicked:', project.id, project.status);
                      setSelectedProject({...project}); // Force new object reference
                      setShowProjectDetails(true);
                    }}
                  >
                    <div className="flex justify-between items-start mb-2 pr-8">
                      <h3 className="font-medium text-[#2d3c59] flex-1">
                        {project.project?.title || project.query.substring(0, 80) + '...'}
                        {project.isTestProject && <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">TEST</span>}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status, project)}`}>
                        {getStatusText(project.status, project)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{project.context}</p>
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
              
              {selectedProject.execution && selectedProject.execution.finalReport && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2 flex items-center">
                    📋 Final Report
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Completed
                    </span>
                  </h3>
                  <div className="bg-gray-50 p-4 rounded max-h-96 overflow-y-auto border-l-4 border-green-500">
                    <h4 className="font-semibold mb-2 text-[#2d3c59]">Executive Summary</h4>
                    <p className="mb-4 text-sm leading-relaxed">{selectedProject.execution.finalReport.executiveSummary}</p>
                    
                    {selectedProject.execution.finalReport.keyFindings && selectedProject.execution.finalReport.keyFindings.length > 0 && (
                      <>
                        <h4 className="font-semibold mb-2 text-[#2d3c59]">Key Findings</h4>
                        <ul className="list-disc list-inside mb-4 text-sm space-y-1">
                          {selectedProject.execution.finalReport.keyFindings.map((finding, idx) => (
                            <li key={idx} className="text-gray-700">{finding}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    
                    {selectedProject.execution.finalReport.recommendations && selectedProject.execution.finalReport.recommendations.length > 0 && (
                      <>
                        <h4 className="font-semibold mb-2 text-[#2d3c59]">Recommendations</h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {selectedProject.execution.finalReport.recommendations.map((rec, idx) => (
                            <li key={idx} className="text-gray-700">{rec}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    
                    {selectedProject.execution.finalReport.qualityScore && (
                      <div className="mt-4 pt-4 border-t border-gray-300">
                        <p className="text-xs text-gray-600">
                          Quality Score: <span className="font-semibold text-[#7dd2d3]">
                            {Math.round(selectedProject.execution.finalReport.qualityScore * 100)}%
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
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
                        {selectedProject.project.reason && (
                          <span> Reason: {selectedProject.project.reason}</span>
                        )}
                      </p>
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
              
              {selectedProject.progressUpdates && selectedProject.progressUpdates.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Progress Log</h3>
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
              onClick={(e) => {
                alert('Button clicked!');
                e.preventDefault();
                e.stopPropagation();
                handleCreateProject();
              }}
              disabled={loading || !newProject.query.trim()}
              className="px-6 py-2 bg-[#2d3c59] text-white rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Start Project'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ConsultingPage; 