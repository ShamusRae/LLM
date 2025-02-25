import React, { useState, useEffect } from 'react';
import { Avatar } from '../types/chat';

interface SettingsScreenProps {
  onClose: () => void;
  onAvatarSelect: (avatar: Avatar) => void;
  selectedAvatar: Avatar | null;
}

interface AvatarResponse {
  avatars: Avatar[];
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onClose,
  onAvatarSelect,
  selectedAvatar
}) => {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchAvatars();
  }, []);

  const fetchAvatars = async () => {
    try {
      const response = await fetch('/api/chat/avatars');
      const data: AvatarResponse = await response.json();
      setAvatars(data.avatars);
    } catch (error) {
      console.error('Failed to fetch avatars:', error);
      setError('Failed to load avatars');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('avatar', selectedFile);

    try {
      const response = await fetch('/api/chat/avatars/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload avatar');
      }

      await fetchAvatars();
      setSelectedFile(null);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setUploadError('Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateAvatar = async () => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const response = await fetch('/api/chat/avatars/generate', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to generate avatar');
      }

      await fetchAvatars();
    } catch (error) {
      console.error('Error generating avatar:', error);
      setUploadError('Failed to generate avatar');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          Close
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Avatar</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-violet-50 file:text-violet-700
                hover:file:bg-violet-100"
            />
            {selectedFile && (
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            )}
          </div>
          <div>
            <button
              onClick={handleGenerateAvatar}
              disabled={isUploading}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
            >
              Generate with DALL-E
            </button>
          </div>
        </div>

        {uploadError && (
          <p className="text-red-500 text-sm">{uploadError}</p>
        )}

        {error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {avatars.map(avatar => (
              <div
                key={avatar.id}
                className={`p-4 border rounded-lg cursor-pointer ${
                  selectedAvatar?.id === avatar.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => onAvatarSelect(avatar)}
              >
                <div className="flex items-center space-x-3">
                  {avatar.imageUrl ? (
                    <img
                      src={avatar.imageUrl}
                      alt={avatar.name}
                      className="w-10 h-10 rounded-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = ''; // Clear the broken image
                        target.onerror = null; // Prevent infinite loop
                        target.className = 'hidden'; // Hide the img element
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                      {avatar.name[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900">{avatar.name}</h4>
                    <p className="text-sm text-gray-500">{avatar.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsScreen; 