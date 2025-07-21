import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from './Modal';
import CreateTeamForm from './CreateTeamForm';

const TeamList = ({ onTeamSelect, onTeamSelected }) => {
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/team');
      setTeams(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError('Failed to load teams. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = () => {
    setIsCreateModalOpen(true);
  };

  const handleTeamCreated = (newTeam) => {
    setTeams([...teams, newTeam]);
    setIsCreateModalOpen(false);
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to delete this team?')) {
      return;
    }

    try {
      await axios.delete(`/api/team/${teamId}`);
      setTeams(teams.filter(team => team.id !== teamId));
    } catch (err) {
      console.error('Error deleting team:', err);
      alert('Failed to delete team. Please try again later.');
    }
  };

  const handleTeamClick = (team) => {
    setSelectedTeam(team);
    if (onTeamSelect) {
      onTeamSelect(team);
    }
    if (onTeamSelected) {
      onTeamSelected(team);
    }
  };

  const getTeamImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    return imageUrl.startsWith('http') ? imageUrl : imageUrl;
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRandomColor = (id) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-red-500', 'bg-purple-500', 'bg-pink-500',
      'bg-indigo-500', 'bg-teal-500', 'bg-orange-500'
    ];
    
    // Use the team ID to deterministically select a color
    const colorIndex = typeof id === 'string' 
      ? id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
      : id % colors.length;
    
    return colors[colorIndex];
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Teams</h2>
        <button
          onClick={handleCreateTeam}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Create Team
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-4">
          <svg className="animate-spin h-5 w-5 mx-auto text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-gray-500">Loading teams...</p>
        </div>
      ) : error ? (
        <div className="text-center py-4 text-red-500">{error}</div>
      ) : teams.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No teams created yet.</p>
          <p className="mt-2">Create a team to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {teams.map(team => (
            <div 
              key={team.id} 
              className={`border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${selectedTeam?.id === team.id ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => handleTeamClick(team)}
            >
              <div className="relative h-32 bg-gray-200">
                {team.imageUrl ? (
                  <img 
                    src={getTeamImageUrl(team.imageUrl)} 
                    alt={team.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      e.target.parentNode.classList.add(getRandomColor(team.id));
                      e.target.parentNode.innerHTML += `<div class="absolute inset-0 flex items-center justify-center text-white text-2xl font-bold">${getInitials(team.name)}</div>`;
                    }}
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${getRandomColor(team.id)}`}>
                    <span className="text-white text-2xl font-bold">{getInitials(team.name)}</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg mb-1">{team.name}</h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{team.objective}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {team.members && team.members.slice(0, 3).map((member, index) => (
                    <div key={index} className="flex items-center bg-gray-100 rounded-full px-2 py-1 text-xs">
                      {member.name}
                    </div>
                  ))}
                  {team.members && team.members.length > 3 && (
                    <div className="flex items-center bg-gray-100 rounded-full px-2 py-1 text-xs">
                      +{team.members.length - 3} more
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTeam(team.id);
                    }}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isCreateModalOpen && (
        <Modal onClose={() => setIsCreateModalOpen(false)}>
          <CreateTeamForm onTeamCreated={handleTeamCreated} onCancel={() => setIsCreateModalOpen(false)} />
        </Modal>
      )}
    </div>
  );
};

export default TeamList; 