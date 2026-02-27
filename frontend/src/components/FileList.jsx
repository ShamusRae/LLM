import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { discoverService } from '../services/serviceDiscovery';

// Remove hard-coded API_BASE
// const API_BASE = 'http://localhost:3001'; // Adjust this if your server runs on a different port

const FileList = forwardRef(({ onSelectedFilesChange, onFileUploadComplete }, ref) => {
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendUrl, setBackendUrl] = useState('');

  // Discover backend service on component mount
  useEffect(() => {
    const initializeBackendConnection = async () => {
      try {
        const url = await discoverService('backend');
        setBackendUrl(url);
      } catch (err) {
        console.error('Failed to discover backend service:', err);
        setError('Failed to connect to backend service. Please check if backend is running.');
      }
    };
    
    initializeBackendConnection();
  }, []);

  // Expose clearSelection method through ref
  useImperativeHandle(ref, () => ({
    clearSelection: () => {
      setSelectedFiles(new Set());
      onSelectedFilesChange([]);
    }
  }));

  const fetchFiles = async (retries = 3) => {
    if (!backendUrl) {
      setError('Cannot fetch files: Backend service not discovered yet');
      setLoading(false);
      return [];
    }
    
    try {
      setLoading(true);
      console.log('Fetching file list from server...');
      
      // Add a small delay to make sure server has time to complete operations
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const response = await axios.get(`${backendUrl}/api/file/list`);
      setFiles(response.data.files || []);
      console.log(`Fetched ${response.data.files?.length || 0} files from server`, response.data);
      
      // Clear any previous errors if the request succeeds
      if (error) setError(null);
      
      return response.data.files || [];
    } catch (err) {
      console.error('Error fetching files:', err);
      // Add retry logic
      if (retries > 0) {
        console.log(`Retrying fetch (${retries} attempts left)...`);
        // Increase wait time with each retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
        return fetchFiles(retries - 1);
      }
      
      let errorMessage = 'Failed to load files';
      if (err.response) {
        errorMessage = `Server error: ${err.response.status} - ${err.response.data?.error || 'Unknown error'}`;
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your network connection.';
      }
      
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Refetch files when backendUrl changes
  useEffect(() => {
    if (backendUrl) {
      fetchFiles();
    }
  }, [backendUrl]);

  // Notify parent component when selected files change
  useEffect(() => {
    if (onSelectedFilesChange) {
      const selectedFilesList = files.filter(file => selectedFiles.has(file.id));
      onSelectedFilesChange(selectedFilesList);
    }
  }, [selectedFiles, files]);

  const handleUpload = async (acceptedFiles) => {
    if (!backendUrl) {
      setError('Cannot upload: Backend service not discovered yet');
      return;
    }
    
    setUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      acceptedFiles.forEach(file => {
        formData.append('file', file);
      });
      
      const response = await axios.post(`${backendUrl}/api/file/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Upload response:', response.data);
      
      // Refresh the file list after upload
      await fetchFiles();
      
      // Notify parent component if callback provided
      if (onFileUploadComplete) {
        onFileUploadComplete(response.data);
      }
    } catch (err) {
      console.error('Error uploading files:', err);
      let errorMessage = 'Failed to upload files';
      
      if (err.response) {
        errorMessage = `Server error: ${err.response.status} - ${err.response.data?.error || 'Unknown error'}`;
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your network connection.';
      }
      
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload
  });

  const handleDelete = async (fileId) => {
    try {
      await axios.delete(`${backendUrl}/api/file/${fileId}`);
      setSelectedFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
      await fetchFiles(); // Refresh the file list
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete file');
    }
  };

  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-[var(--rovesg-surface)]/80 border-b border-[var(--rovesg-border)]">
        <h2 className="font-bold mb-4 text-[var(--rovesg-text)]">Files</h2>
        
        {/* Upload area */}
        <div
          {...getRootProps()}
          className={`p-4 border-2 border-dashed rounded cursor-pointer mb-4 transition-colors ${
            isDragActive ? 'border-[var(--rovesg-primary)] bg-[var(--rovesg-secondary)]/30' : 'border-[var(--rovesg-border)] hover:border-[var(--rovesg-primary)] bg-[#182025]'
          }`}
        >
          <input {...getInputProps()} />
          <p className="text-center text-[var(--rovesg-text-muted)]">
            {uploading ? 'Uploading...' : 'Drag and drop a file here, or click to select one'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>

      {/* File list - Now scrollable */}
      <div className="overflow-y-auto flex-1 p-4 bg-[var(--rovesg-surface)]/70">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-pulse text-center">
              <div className="h-4 w-32 bg-[#2a343c] mb-2 mx-auto rounded"></div>
              <p className="text-[var(--rovesg-text-muted)]">Loading files...</p>
            </div>
          </div>
        ) : files.length === 0 ? (
          <p className="text-[var(--rovesg-text-muted)] text-center py-4">No files uploaded yet</p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className={`p-3 rounded border transition-colors ${
                  selectedFiles.has(file.id)
                    ? 'bg-[var(--rovesg-secondary)]/35 border-[var(--rovesg-primary)]/40'
                    : 'bg-[#182025] border-[var(--rovesg-border)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.id)}
                        onChange={() => toggleFileSelection(file.id)}
                        className="h-4 w-4 text-[var(--rovesg-primary)] rounded border-[var(--rovesg-border)] focus:ring-[var(--rovesg-primary)] bg-[#121619]"
                      />
                      <p className="font-medium truncate text-[var(--rovesg-text)]" title={file.filename}>
                        {file.filename}
                      </p>
                    </div>
                    <div className="text-sm text-[var(--rovesg-text-muted)] space-y-1 mt-1">
                      <p>Type: {file.type || 'Unknown'}</p>
                      <p>Size: {formatFileSize(file.size)}</p>
                      <p>Uploaded: {formatDate(file.uploadDate)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="ml-4 p-2 text-red-600 hover:text-red-800 focus:outline-none"
                    title="Delete file"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default FileList; 