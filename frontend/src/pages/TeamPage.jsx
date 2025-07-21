import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeamList from '../components/TeamList';
import CreateTeamForm from '../components/CreateTeamForm';
import Modal from '../components/Modal';
import axios from 'axios';

const TeamPage = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTeam, setEditedTeam] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [availableAvatars, setAvailableAvatars] = useState([]);
  const navigate = useNavigate();

  // Fetch available avatars when component mounts
  React.useEffect(() => {
    fetchAvatars();
  }, []);

  const fetchAvatars = async () => {
    try {
      const response = await axios.get('/api/settings');
      if (response.data && response.data.avatars) {
        setAvailableAvatars(response.data.avatars);
      }
    } catch (err) {
      console.error('Error fetching avatars:', err);
    }
  };

  const handleTeamCreated = (team) => {
    setShowCreateModal(false);
    setSelectedTeam(null);
  };

  const handleTeamSelected = (team) => {
    setSelectedTeam(team);
    setEditedTeam(null);
    setIsEditing(false);
  };

  const handleStartChat = (teamId) => {
    navigate(`/chat?teamId=${teamId}`);
  };

  const handleCancel = () => {
    navigate('/chat');
  };

  const handleEditClick = () => {
    setEditedTeam({ ...selectedTeam });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedTeam(null);
    setIsEditing(false);
  };

  const handleInputChange = (field, value) => {
    setEditedTeam(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePlanStepChange = (index, field, value) => {
    setEditedTeam(prev => {
      const updatedPlan = [...prev.plan];
      updatedPlan[index] = {
        ...updatedPlan[index],
        [field]: value
      };
      return {
        ...prev,
        plan: updatedPlan
      };
    });
  };

  const handleGeneratePlan = async () => {
    if (!editedTeam.objective) {
      alert('Please enter a team objective first');
      return;
    }

    setIsGeneratingPlan(true);

    try {
      const response = await axios.post('/api/team/generate-plan', {
        objective: editedTeam.objective,
        context: editedTeam.context,
        availableAvatars: availableAvatars  // Always send full list of available avatars
      });
      
      if (response.data) {
        // Track existing members by name (case insensitive) to avoid duplicates
        const existingMembers = new Map();
        editedTeam.members.forEach(member => {
          existingMembers.set(member.name.toLowerCase(), member);
        });
        
        const newMembers = [];
        
        // Process recommended members
        if (response.data.recommendedMembers) {
          response.data.recommendedMembers.forEach(member => {
            const memberKey = member.name.toLowerCase();
            if (!existingMembers.has(memberKey)) {
              // First try exact match
              let avatar = availableAvatars.find(a => 
                a.name.toLowerCase() === memberKey
              );
              
              // If no exact match, try partial matches
              if (!avatar) {
                avatar = availableAvatars.find(a => 
                  a.name.toLowerCase().includes(memberKey) || 
                  memberKey.includes(a.name.toLowerCase())
                );
              }

              const newMember = {
                name: member.name,
                role: member.role || 'Team Member',
                justification: member.justification,
                source: 'Recommended'
              };

              if (avatar) {
                newMember.id = avatar.id;
                newMember.imageUrl = avatar.imageUrl;
                newMember.role = avatar.role || newMember.role;
              }

              newMembers.push(newMember);
              existingMembers.set(memberKey, newMember);
            }
          });
        }
        
        // Process members mentioned in the plan
        if (response.data.plan) {
          response.data.plan.forEach(step => {
            if (step.assignedMembers && Array.isArray(step.assignedMembers)) {
              step.assignedMembers.forEach(memberName => {
                const memberKey = memberName.toLowerCase();
                if (!existingMembers.has(memberKey)) {
                  const avatar = availableAvatars.find(a => 
                    a.name.toLowerCase() === memberKey || 
                    a.name.toLowerCase().includes(memberKey) || 
                    memberKey.includes(a.name.toLowerCase())
                  );
                  
                  const newMember = {
                    name: memberName,
                    role: 'Team Member',
                    source: 'From Plan'
                  };

                  if (avatar) {
                    newMember.id = avatar.id;
                    newMember.imageUrl = avatar.imageUrl;
                    newMember.role = avatar.role;
                  }

                  newMembers.push(newMember);
                  existingMembers.set(memberKey, newMember);
                }
              });
            }
          });
        }

        // Create updated team with new members and plan
        const updatedTeam = {
          ...editedTeam,
          members: [...editedTeam.members, ...newMembers],
          plan: response.data.plan || editedTeam.plan
        };

        // Save the updated team to the server
        try {
          const saveResponse = await axios.put(`/api/team/${editedTeam.id}`, updatedTeam);
          setEditedTeam(saveResponse.data);
          setSelectedTeam(saveResponse.data);
        } catch (error) {
          console.error('Error saving team:', error);
          alert('Failed to save team changes. The plan was generated but team members may not persist.');
        }
      }
    } catch (error) {
      console.error('Error generating plan:', error);
      alert('Failed to generate plan. Please try again.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      const response = await axios.put(`/api/team/${editedTeam.id}`, editedTeam);
      setSelectedTeam(response.data);
      setIsEditing(false);
      setEditedTeam(null);
    } catch (error) {
      console.error('Error saving team:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderTeamDetails = () => {
    const team = isEditing ? editedTeam : selectedTeam;

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={team.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="text-2xl font-bold text-[#2d3c59] w-full border-b border-gray-300 focus:border-[#7dd2d3] outline-none"
              />
            ) : (
              <h2 className="text-2xl font-bold text-[#2d3c59]">{team.name}</h2>
            )}
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 font-medium"
                  disabled={isSaving || isGeneratingPlan}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGeneratePlan}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 font-medium"
                  disabled={isSaving || isGeneratingPlan}
                >
                  {isGeneratingPlan ? 'Generating Plan...' : 'Generate Plan'}
                </button>
                <button
                  onClick={handleSaveChanges}
                  className="px-4 py-2 bg-[#7dd2d3] text-[#2d3c59] rounded-md hover:bg-[#c2eaea] font-medium"
                  disabled={isSaving || isGeneratingPlan}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEditClick}
                  className="px-4 py-2 bg-[#f7f7f6] text-[#2d3c59] rounded-md hover:bg-[#c2eaea] font-medium"
                >
                  Edit Team
                </button>
                <button
                  onClick={() => handleStartChat(team.id)}
                  className="px-4 py-2 bg-[#7dd2d3] text-[#2d3c59] rounded-md hover:bg-[#c2eaea] font-medium"
                >
                  Start Team Chat
                </button>
              </>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            {team.imageUrl ? (
              <img 
                src={team.imageUrl} 
                alt={team.name} 
                className="w-full h-48 object-cover rounded-md mb-4"
              />
            ) : (
              <div className="w-full h-48 bg-gray-200 rounded-md flex items-center justify-center mb-4">
                <span className="text-4xl font-bold text-gray-400">
                  {team.name.charAt(0)}
                </span>
              </div>
            )}
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Team Members</h3>
                {team.members.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
                  </span>
                )}
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {team.members.length === 0 ? (
                  <p className="text-gray-500">No members assigned</p>
                ) : (
                  team.members.map((member, index) => (
                    <div key={index} className="flex flex-col p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                      <div className="flex items-center mb-2">
                        {member.imageUrl ? (
                          <img 
                            src={member.imageUrl} 
                            alt={member.name} 
                            className="w-8 h-8 rounded-full mr-2"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-[#7dd2d3] rounded-full flex items-center justify-center mr-2">
                            <span className="text-sm font-medium text-[#2d3c59]">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium">{member.name}</div>
                          <div className="text-xs text-gray-500">
                            {member.role}
                          </div>
                        </div>
                      </div>
                      {member.justification && (
                        <div className="text-xs text-gray-600 mb-2">
                          {member.justification}
                        </div>
                      )}
                      {member.source && (
                        <div className="mt-auto">
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                            {member.source}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          <div className="md:col-span-2">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-[#2d3c59]">Objective</h3>
              {isEditing ? (
                <textarea
                  value={team.objective}
                  onChange={(e) => handleInputChange('objective', e.target.value)}
                  className="w-full p-2 border rounded-md focus:border-[#7dd2d3] outline-none"
                  rows={3}
                />
              ) : (
                <p className="text-gray-700 whitespace-pre-line">{team.objective}</p>
              )}
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-[#2d3c59]">Description</h3>
              {isEditing ? (
                <textarea
                  value={team.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full p-2 border rounded-md focus:border-[#7dd2d3] outline-none"
                  rows={4}
                />
              ) : (
                team.description && <p className="text-gray-700">{team.description}</p>
              )}
            </div>
            
            {(isEditing || team.context) && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 text-[#2d3c59]">Additional Context</h3>
                {isEditing ? (
                  <textarea
                    value={team.context || ''}
                    onChange={(e) => handleInputChange('context', e.target.value)}
                    className="w-full p-2 border rounded-md focus:border-[#7dd2d3] outline-none"
                    rows={3}
                  />
                ) : (
                  <p className="text-gray-700">{team.context}</p>
                )}
              </div>
            )}
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-[#2d3c59]">Team Plan</h3>
              {team.plan.length === 0 ? (
                <p className="text-gray-500">No plan created yet</p>
              ) : (
                <div className="border rounded-md divide-y">
                  {team.plan.map((step, index) => (
                    <div key={index} className="p-4">
                      <div className="flex justify-between items-start">
                        {isEditing ? (
                          <input
                            type="text"
                            value={step.title}
                            onChange={(e) => handlePlanStepChange(index, 'title', e.target.value)}
                            className="font-bold w-full border-b border-gray-300 focus:border-[#7dd2d3] outline-none"
                            placeholder="Step Title"
                          />
                        ) : (
                          <h4 className="font-bold">Step {step.stepNumber}: {step.title}</h4>
                        )}
                      </div>
                      {isEditing ? (
                        <textarea
                          value={step.description}
                          onChange={(e) => handlePlanStepChange(index, 'description', e.target.value)}
                          className="w-full p-2 border rounded-md my-2 focus:border-[#7dd2d3] outline-none"
                          rows={2}
                        />
                      ) : (
                        <p className="text-sm my-2">{step.description}</p>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        <div>
                          <h5 className="text-xs font-medium text-gray-700">Assigned To:</h5>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {step.assignedMembers.map((memberName, idx) => {
                              const member = team.members.find(m => 
                                m.name.toLowerCase() === memberName.toLowerCase()
                              );
                              return (
                                <div key={idx} className="flex items-center bg-[#c2eaea] rounded-full pl-1 pr-2 py-0.5 text-xs text-[#2d3c59]">
                                  {member && member.imageUrl ? (
                                    <img 
                                      src={member.imageUrl} 
                                      alt={memberName}
                                      className="w-4 h-4 rounded-full mr-1"
                                    />
                                  ) : (
                                    <div className="w-4 h-4 bg-[#7dd2d3] rounded-full flex items-center justify-center mr-1">
                                      <span className="text-[10px] font-medium text-[#2d3c59]">
                                        {memberName.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                  {memberName}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <h5 className="text-xs font-medium text-gray-700">Reviewed By:</h5>
                          {isEditing ? (
                            <input
                              type="text"
                              value={step.reviewedBy}
                              onChange={(e) => handlePlanStepChange(index, 'reviewedBy', e.target.value)}
                              className="w-full p-1 border rounded-md mt-1 focus:border-[#7dd2d3] outline-none text-xs"
                            />
                          ) : (
                            <div className="flex items-center bg-[#eef2b2] rounded-full pl-1 pr-2 py-0.5 text-xs text-[#2d3c59] inline-block mt-1">
                              {(() => {
                                const reviewer = team.members.find(m => 
                                  m.name.toLowerCase() === step.reviewedBy?.toLowerCase()
                                );
                                return (
                                  <>
                                    {reviewer && reviewer.imageUrl ? (
                                      <img 
                                        src={reviewer.imageUrl} 
                                        alt={step.reviewedBy}
                                        className="w-4 h-4 rounded-full mr-1"
                                      />
                                    ) : (
                                      <div className="w-4 h-4 bg-[#d9dd82] rounded-full flex items-center justify-center mr-1">
                                        <span className="text-[10px] font-medium text-[#2d3c59]">
                                          {step.reviewedBy?.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    )}
                                    {step.reviewedBy}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2">
                        <h5 className="text-xs font-medium text-gray-700">Expected Output:</h5>
                        {isEditing ? (
                          <textarea
                            value={step.expectedOutput}
                            onChange={(e) => handlePlanStepChange(index, 'expectedOutput', e.target.value)}
                            className="w-full p-2 border rounded-md mt-1 focus:border-[#7dd2d3] outline-none text-xs"
                            rows={2}
                          />
                        ) : (
                          <p className="text-xs text-gray-600 mt-1">{step.expectedOutput}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-[#2d3c59]">Teams</h1>
        <div className="flex gap-3">
          {selectedTeam && !isEditing && (
            <button
              onClick={() => setSelectedTeam(null)}
              className="px-4 py-2 bg-[#f7f7f6] text-[#2d3c59] rounded-md hover:bg-[#c2eaea] border border-gray-300"
            >
              Back to Teams
            </button>
          )}
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-[#2d3c59] text-white rounded-md hover:bg-[#2e334e]"
          >
            Go to Chat
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <TeamList onTeamSelected={handleTeamSelected} />
        </div>
        
        <div className="md:col-span-2">
          {selectedTeam ? (
            renderTeamDetails()
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-center h-64">
              <p className="text-gray-500 text-lg">Select a team to view details</p>
            </div>
          )}
        </div>
      </div>
      
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Team"
      >
        <CreateTeamForm
          onTeamCreated={handleTeamCreated}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>
    </div>
  );
};

export default TeamPage; 