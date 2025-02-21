import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

const FileList = forwardRef(({ onSelectedFilesChange }, ref) => {
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Expose clearSelection method through ref
  useImperativeHandle(ref, () => ({
    clearSelection: () => {
      setSelectedFiles(new Set());
      onSelectedFilesChange([]);
    }
  }));

  const fetchFiles = async () => {
    try {
      const response = await axios.get('/api/file/list');
      setFiles(response.data.files || []);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Failed to load files');
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // Notify parent component when selected files change
  useEffect(() => {
    if (onSelectedFilesChange) {
      const selectedFilesList = files.filter(file => selectedFiles.has(file.id));
      onSelectedFilesChange(selectedFilesList);
    }
  }, [selectedFiles, files, onSelectedFilesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        setUploading(true);
        setError(null);
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
          await axios.post('http://localhost:3001/api/file/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          
          await fetchFiles(); // Refresh the file list
        } catch (err) {
          console.error('Upload error:', err);
          setError('Failed to upload file');
        } finally {
          setUploading(false);
        }
      }
    }
  });

  const handleDelete = async (fileId) => {
    try {
      await axios.delete(`http://localhost:3001/api/file/${fileId}`);
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
    <div className="border rounded p-4 bg-white">
      <h2 className="font-bold mb-4">Files</h2>
      
      {/* Upload area */}
      <div
        {...getRootProps()}
        className={`p-4 border-2 border-dashed rounded cursor-pointer mb-4 transition-colors ${
          isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-center text-gray-600">
          {uploading ? 'Uploading...' : 'Drag and drop a file here, or click to select one'}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* File list */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {files.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No files uploaded yet</p>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              className={`p-3 rounded border transition-colors ${
                selectedFiles.has(file.id)
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.id)}
                      onChange={() => toggleFileSelection(file.id)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <p className="font-medium truncate" title={file.filename}>
                      {file.filename}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500 space-y-1 mt-1">
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
          ))
        )}
      </div>
    </div>
  );
});

export default FileList; 