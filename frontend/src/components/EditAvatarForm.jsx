import React from 'react';
import Modal from './Modal';

const EditAvatarForm = ({ formState, setFormState, handleSubmit, handleCancel, isGenerating, handleGenerateImage, models }) => {
  const handleMouseEvent = (e) => {
    e.stopPropagation();
  };

  const getAvatarImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    if (imageUrl.startsWith('/')) return `http://localhost:3001${imageUrl}`;
    return `http://localhost:3001/${imageUrl}`;
  };

  const handleImageError = (e) => {
    console.error('Failed to load avatar image:', e);
    e.target.onerror = null;
    e.target.src = '/default-avatar.png';
  };

  return (
    <Modal onClose={handleCancel}>
      <form 
        onSubmit={handleSubmit} 
        className="space-y-4" 
        onClick={handleMouseEvent}
        onMouseDown={handleMouseEvent}
        onMouseUp={handleMouseEvent}
        onMouseMove={handleMouseEvent}
        onSelect={handleMouseEvent}
      >
        <h2 className="text-xl font-bold mb-6">
          {formState.id ? 'Edit Avatar' : 'Create New Avatar'}
        </h2>

        <div className="space-y-4" onMouseDown={handleMouseEvent}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formState.name}
              onChange={e => setFormState(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter avatar name"
              required
              onMouseDown={handleMouseEvent}
              onMouseUp={handleMouseEvent}
              onMouseMove={handleMouseEvent}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model Category
              <span className="text-xs text-gray-500 ml-2">(AI will choose the best available model)</span>
            </label>
            <select
              value={formState.modelCategory || formState.selectedModel || 'General'}
              onChange={e => setFormState(prev => ({ 
                ...prev, 
                modelCategory: e.target.value,
                // Clear old selectedModel to fully migrate
                selectedModel: undefined 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onMouseDown={handleMouseEvent}
              onMouseUp={handleMouseEvent}
              onMouseMove={handleMouseEvent}
            >
              <option value="Strategic">🧠 Strategic - Most capable for complex reasoning & analysis</option>
              <option value="General">⚖️ General - Well-rounded for everyday tasks</option>
              <option value="Rapid">⚡ Rapid - Fast & efficient for simple tasks</option>
              <option value="Tactical">🎯 Tactical - Specialized/local models for specific needs</option>
            </select>
            <p className="text-xs text-gray-600 mt-1">
              The system automatically selects the best available model from this category. 
              Models may auto-escalate to higher categories if needed.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <input
              type="text"
              value={formState.role}
              onChange={e => setFormState(prev => ({ ...prev, role: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter avatar role"
              onMouseDown={handleMouseEvent}
              onMouseUp={handleMouseEvent}
              onMouseMove={handleMouseEvent}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formState.description}
              onChange={e => setFormState(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter avatar description"
              rows={3}
              onMouseDown={handleMouseEvent}
              onMouseUp={handleMouseEvent}
              onMouseMove={handleMouseEvent}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Skills (comma-separated)</label>
            <input
              type="text"
              value={formState.skills}
              onChange={e => setFormState(prev => ({ ...prev, skills: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter skills, separated by commas"
              onMouseDown={handleMouseEvent}
              onMouseUp={handleMouseEvent}
              onMouseMove={handleMouseEvent}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image Description (for DALL-E)</label>
            <div className="flex space-x-2">
              <textarea
                value={formState.imagePrompt}
                onChange={e => setFormState(prev => ({ ...prev, imagePrompt: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe the avatar image you want to generate..."
                rows={3}
                onMouseDown={handleMouseEvent}
                onMouseUp={handleMouseEvent}
                onMouseMove={handleMouseEvent}
              />
              <button
                type="button"
                className={`px-4 py-2 rounded-md text-white ${
                  isGenerating || !formState.imagePrompt
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
                }`}
                onClick={handleGenerateImage}
                disabled={isGenerating || !formState.imagePrompt}
                onMouseDown={handleMouseEvent}
                onMouseUp={handleMouseEvent}
                onMouseMove={handleMouseEvent}
              >
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
            </div>
            {formState.imageUrl && (
              <div className="mt-2" onMouseDown={handleMouseEvent}>
                <img 
                  src={getAvatarImageUrl(formState.imageUrl)} 
                  alt="Generated avatar" 
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                  onError={handleImageError}
                  onMouseDown={handleMouseEvent}
                  onMouseUp={handleMouseEvent}
                  onMouseMove={handleMouseEvent}
                />
              </div>
            )}
            {isGenerating && (
              <div className="mt-2 text-sm text-gray-600">
                Generating image... This may take a few seconds.
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onMouseDown={handleMouseEvent}
            onMouseUp={handleMouseEvent}
            onMouseMove={handleMouseEvent}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onMouseDown={handleMouseEvent}
            onMouseUp={handleMouseEvent}
            onMouseMove={handleMouseEvent}
          >
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default React.memo(EditAvatarForm); 