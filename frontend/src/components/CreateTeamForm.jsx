import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CreateTeamForm = ({ team, onTeamCreated, onCancel }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [error, setError] = useState(null);
  const [availableAvatars, setAvailableAvatars] = useState([]);
  const [availableFiles, setAvailableFiles] = useState([]);
  const [formState, setFormState] = useState({
    name: team?.name || '',
    description: team?.description || '',
    imagePrompt: team?.imagePrompt || '',
    imageUrl: team?.imageUrl || null,
    objective: team?.objective || '',
    context: team?.context || '',
    files: team?.files || [],
    members: team?.members || [],
    plan: team?.plan || []
  });
  const [step, setStep] = useState(1);
  const [generatedPlan, setGeneratedPlan] = useState(null);

  useEffect(() => {
    // Fetch available avatars and files when component mounts
    fetchAvatars();
    fetchFiles();
  }, []);

  const fetchAvatars = async () => {
    try {
      const response = await axios.get('/api/settings');
      if (response.data && response.data.avatars) {
        setAvailableAvatars(response.data.avatars);
      }
    } catch (err) {
      console.error('Error fetching avatars:', err);
      setError('Failed to load avatars. Please try again later.');
    }
  };

  const fetchFiles = async () => {
    try {
      const response = await axios.get('/api/file/list');
      if (response.data && response.data.files && Array.isArray(response.data.files)) {
        setAvailableFiles(response.data.files);
      } else {
        console.error('API returned non-array data for files:', response.data);
        setAvailableFiles([]);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
      // Don't set error state to avoid blocking the form
      // Just log the error and continue with empty files array
      setAvailableFiles([]);
    }
  };

  const handleChange = (field, value) => {
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileToggle = (fileId) => {
    const files = [...formState.files];
    const index = files.indexOf(fileId);
    
    if (index === -1) {
      files.push(fileId);
    } else {
      files.splice(index, 1);
    }
    
    handleChange('files', files);
  };

  const handleMemberToggle = (avatarId) => {
    const members = [...formState.members];
    const index = members.findIndex(m => m.id === avatarId);
    
    if (index === -1) {
      const avatar = availableAvatars.find(a => a.id === avatarId);
      if (avatar) {
        members.push({
          id: avatar.id,
          name: avatar.name,
          role: avatar.role,
          imageUrl: avatar.imageUrl
        });
      }
    } else {
      members.splice(index, 1);
    }
    
    handleChange('members', members);
  };

  const handleGenerateImage = async () => {
    if (!formState.imagePrompt) {
      alert('Please enter an image description first');
      return;
    }

    setIsGeneratingImage(true);
    setError(null);

    try {
      const response = await axios.post('/api/team/generate-image', {
        imagePrompt: formState.imagePrompt
      });
      
      if (response.data && response.data.imageUrl) {
        handleChange('imageUrl', response.data.imageUrl);
      } else {
        throw new Error('Invalid response from image generation API');
      }
    } catch (err) {
      console.error('Error generating image:', err);
      setError('Failed to generate image. Please try again later.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!formState.objective) {
      alert('Please enter a team objective first');
      return;
    }

    setIsGeneratingPlan(true);
    setError(null);

    try {
      const response = await axios.post('/api/team/generate-plan', {
        objective: formState.objective,
        context: formState.context,
        availableAvatars: formState.members.length > 0 ? formState.members : availableAvatars
      });
      
      if (response.data) {
        setGeneratedPlan(response.data);
        
        // If members were not selected yet, use the recommended members
        if (formState.members.length === 0 && response.data.recommendedMembers) {
          const recommendedMembers = response.data.recommendedMembers
            .filter(member => member.id) // Only include members with valid IDs
            .map(member => {
              const avatar = availableAvatars.find(a => a.id === member.id);
              return {
                id: member.id,
                name: avatar?.name || member.name,
                role: avatar?.role || member.role,
                imageUrl: avatar?.imageUrl,
                justification: member.justification
              };
            });
          
          handleChange('members', recommendedMembers);
        }
        
        // Update the plan
        if (response.data.plan) {
          handleChange('plan', response.data.plan);
        }
      } else {
        throw new Error('Invalid response from plan generation API');
      }
    } catch (err) {
      console.error('Error generating plan:', err);
      setError('Failed to generate plan. Please try again later.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    
    if (!formState.name || !formState.objective) {
      alert('Team name and objective are required');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const endpoint = team ? `/api/team/${team.id}` : '/api/team';
      const method = team ? 'put' : 'post';
      
      const response = await axios[method](endpoint, formState);
      
      if (response.data) {
        if (onTeamCreated) {
          onTeamCreated(response.data);
        }
      } else {
        throw new Error('Invalid response from API');
      }
    } catch (err) {
      console.error('Error saving team:', err);
      setError('Failed to save team. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h3 className="text-lg font-bold mb-4">Team Details</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Team Name *</label>
              <input
                type="text"
                value={formState.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter team name"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formState.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter team description"
                rows={2}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Team Image</label>
              <div className="flex items-start gap-2">
                <textarea
                  value={formState.imagePrompt}
                  onChange={(e) => handleChange('imagePrompt', e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md"
                  placeholder="Describe the team image you want to generate"
                  rows={2}
                />
                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage || !formState.imagePrompt}
                  className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isGeneratingImage ? 'Generating...' : 'Generate'}
                </button>
              </div>
              {formState.imageUrl && (
                <div className="mt-2 relative w-full h-32">
                  <img
                    src={formState.imageUrl}
                    alt="Team"
                    className="w-full h-full object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => handleChange('imageUrl', null)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                    title="Remove image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      
      case 2:
        return (
          <div>
            <h3 className="text-lg font-bold mb-4">Team Objective</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Objective *</label>
              <textarea
                value={formState.objective}
                onChange={(e) => handleChange('objective', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="What is the team's objective?"
                rows={3}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Context</label>
              <textarea
                value={formState.context}
                onChange={(e) => handleChange('context', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Provide any additional context that might help the team achieve its objective"
                rows={3}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference Files</label>
              <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                {!Array.isArray(availableFiles) || availableFiles.length === 0 ? (
                  <p className="text-gray-500 text-sm">No files available</p>
                ) : (
                  availableFiles.map(file => (
                    <div key={file.id} className="flex items-center mb-1">
                      <input
                        type="checkbox"
                        id={`file-${file.id}`}
                        checked={formState.files.includes(file.id)}
                        onChange={() => handleFileToggle(file.id)}
                        className="mr-2"
                      />
                      <label htmlFor={`file-${file.id}`} className="text-sm cursor-pointer">
                        {file.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div>
            <h3 className="text-lg font-bold mb-4">Team Members</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Team Members</label>
              <div className="border rounded-md p-2 max-h-60 overflow-y-auto">
                {availableAvatars.length === 0 ? (
                  <p className="text-gray-500 text-sm">No avatars available</p>
                ) : (
                  availableAvatars.map(avatar => (
                    <div key={avatar.id} className="flex items-center mb-2 p-1 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        id={`avatar-${avatar.id}`}
                        checked={formState.members.some(m => m.id === avatar.id)}
                        onChange={() => handleMemberToggle(avatar.id)}
                        className="mr-2"
                      />
                      <label htmlFor={`avatar-${avatar.id}`} className="flex items-center cursor-pointer">
                        {avatar.imageUrl ? (
                          <img src={avatar.imageUrl} alt={avatar.name} className="w-8 h-8 rounded-full mr-2 object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-2">
                            {avatar.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium">{avatar.name}</div>
                          <div className="text-xs text-gray-500">{avatar.role}</div>
                        </div>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="mb-4">
              <button
                type="button"
                onClick={handleGeneratePlan}
                disabled={isGeneratingPlan || !formState.objective}
                className="w-full px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isGeneratingPlan ? 'Generating Plan...' : 'Generate Team Plan'}
              </button>
              <p className="text-xs text-gray-500 mt-1">
                This will suggest team members and create a plan based on your objective.
              </p>
            </div>
            {generatedPlan && generatedPlan.recommendedMembers && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-1">Recommended Members</h4>
                <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                  {generatedPlan.recommendedMembers.map((member, index) => (
                    <div key={index} className="mb-2 text-sm">
                      <div className="font-medium">{member.name} ({member.role})</div>
                      <div className="text-xs text-gray-500">{member.justification}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      
      case 4:
        return (
          <div>
            <h3 className="text-lg font-bold mb-4">Team Plan</h3>
            {formState.plan.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500">No plan has been created yet.</p>
                <button
                  type="button"
                  onClick={handleGeneratePlan}
                  disabled={isGeneratingPlan || !formState.objective}
                  className="mt-2 px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isGeneratingPlan ? 'Generating Plan...' : 'Generate Team Plan'}
                </button>
              </div>
            ) : (
              <div className="border rounded-md p-4">
                {formState.plan.map((step, index) => (
                  <div key={index} className="mb-4 pb-4 border-b last:border-b-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold">Step {step.stepNumber}: {step.title}</h4>
                    </div>
                    <p className="text-sm my-2">{step.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      <div>
                        <h5 className="text-xs font-medium text-gray-700">Assigned To:</h5>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {step.assignedMembers.map((memberName, idx) => {
                            const member = formState.members.find(m => m.name === memberName);
                            return (
                              <div key={idx} className="flex items-center bg-blue-100 rounded-full px-2 py-1 text-xs">
                                {member?.imageUrl && (
                                  <img src={member.imageUrl} alt={memberName} className="w-4 h-4 rounded-full mr-1" />
                                )}
                                {memberName}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <h5 className="text-xs font-medium text-gray-700">Reviewed By:</h5>
                        <div className="flex items-center bg-green-100 rounded-full px-2 py-1 text-xs inline-block mt-1">
                          {step.reviewedBy}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <h5 className="text-xs font-medium text-gray-700">Expected Output:</h5>
                      <p className="text-xs text-gray-600 mt-1">{step.expectedOutput}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">{team ? 'Edit Team' : 'Create New Team'}</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <div className="flex items-center mb-4">
            {[1, 2, 3, 4].map((stepNumber) => (
              <React.Fragment key={stepNumber}>
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    stepNumber === step 
                      ? 'bg-blue-500 text-white' 
                      : stepNumber < step 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {stepNumber < step ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </div>
                {stepNumber < 4 && (
                  <div className={`flex-1 h-1 ${stepNumber < step ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <div>Details</div>
            <div>Objective</div>
            <div>Members</div>
            <div>Plan</div>
          </div>
        </div>
        
        {renderStepContent()}
        
        <div className="flex justify-between mt-6">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 mr-2"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 bg-red-50 text-red-700 hover:bg-red-100"
            >
              Cancel
            </button>
          </div>
          <button
            type={step === 4 ? 'submit' : 'button'}
            onClick={step < 4 ? handleSubmit : undefined}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
          >
            {isLoading ? 'Saving...' : step === 4 ? 'Create Team' : 'Next'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTeamForm; 