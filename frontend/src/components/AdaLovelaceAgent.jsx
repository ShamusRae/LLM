import React, { useState, useRef } from 'react';
import { FiUpload, FiChevronDown, FiChevronUp, FiHardDrive, FiFolder } from 'react-icons/fi';
import axios from 'axios';

/**
 * The Ada Lovelace agent component for predictive modeling
 */
const AdaLovelaceAgent = () => {
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef(null);

  const toggleInstructions = () => {
    setShowInstructions(!showInstructions);
  };
  
  const handleSelectFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setSelectedFile(file);
    setAnalyzing(true);
    
    try {
      // For local development, just use the file path approach
      const fileName = file.name;
      
      // Create a message that the user can copy/paste with the file path
      const filePath = `/Users/shamusrae/Desktop/${fileName}`;
      const filePathMessage = `To analyze this file, copy and paste this message:\n\nAnalyze the dataset at ${filePath}`;
      
      // Show a notification with clear instructions
      alert(`I've detected the file ${fileName}.\n\nSince the file may be too large to upload directly, please tell me where this file is located on your computer.\n\nFor example, copy and paste this in the chat:\n"Analyze the dataset at /Users/shamusrae/path/to/${fileName}"`);
    } catch (error) {
      console.error('Error handling file selection:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="ada-lovelace-container p-4 bg-purple-50 border border-purple-200 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-purple-800">Ada Lovelace Predictive Modeling</h3>
        <button 
          onClick={toggleInstructions}
          className="text-purple-500 hover:text-purple-700 focus:outline-none"
          aria-label={showInstructions ? "Hide instructions" : "Show instructions"}
        >
          {showInstructions ? <FiChevronUp /> : <FiChevronDown />}
        </button>
      </div>
      
      <div className="mt-4 flex flex-col space-y-3">
        <button
          onClick={handleSelectFile}
          className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          disabled={analyzing}
        >
          <FiFolder className="mr-2" />
          {analyzing ? "Processing..." : "Select Dataset File"}
        </button>
        
        {selectedFile && (
          <div className="px-3 py-2 bg-purple-100 rounded-md text-sm">
            Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
          </div>
        )}
        
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
          <p className="flex items-center text-yellow-700 font-medium">
            <FiHardDrive className="mr-2" />
            For large datasets:
          </p>
          <p className="mt-1 text-gray-700">
            Tell me the full path to your file: "Analyze the dataset at /Users/username/path/to/file.csv"
          </p>
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv,.json,.xlsx,.xls,.parquet,.tsv"
          className="hidden"
        />
      </div>
      
      {showInstructions && (
        <div className="mt-4 transition-all duration-300">
          <p className="text-gray-700">
            I am Ada Lovelace, ready to help with predictive modeling and data analysis.
          </p>
          
          <div className="mt-4 p-3 bg-white border border-purple-200 rounded">
            <h4 className="font-medium text-purple-700">How to use my predictive modeling capabilities:</h4>
            <ol className="list-decimal ml-5 mt-2 space-y-2 text-gray-700">
              <li>
                <strong>For small to medium datasets (up to 100MB):</strong> Upload using the file upload button in the chat interface.
                <div className="ml-2 mt-1 text-sm text-gray-500">
                  Supported formats: CSV, JSON, Excel (.xlsx), Parquet
                </div>
              </li>
              <li>
                <strong>For large datasets (over 100MB):</strong> Provide the local file path on your computer.
                <div className="ml-2 mt-1 text-sm text-gray-500">
                  Example: "Analyze the dataset at /Users/username/Documents/large_dataset.csv"
                </div>
              </li>
              <li>
                <strong>Tell me what you want to predict or analyze</strong> by describing your goals.
                <div className="ml-2 mt-1 text-sm text-gray-500">
                  Example: "Predict customer churn based on the data" or "Find patterns in this dataset"
                </div>
              </li>
              <li>
                <strong>Review the results and insights</strong> I provide in my analysis.
                <div className="ml-2 mt-1 text-sm text-gray-500">
                  I'll share observations, correlations, and model performance metrics
                </div>
              </li>
            </ol>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-medium text-blue-700">Common tasks I can help with:</h4>
            <ul className="list-disc ml-5 mt-2 text-gray-700">
              <li>Classification (predicting categories)</li>
              <li>Regression (predicting numerical values)</li>
              <li>Clustering (finding similar groups)</li>
              <li>Correlation analysis</li>
              <li>Feature importance</li>
              <li>Visualizing data relationships</li>
              <li>Time series forecasting</li>
            </ul>
          </div>
          
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <FiUpload className="mr-2" />
            <span>Please note that larger datasets may take longer to process</span>
          </div>
        </div>
      )}
      
      {!showInstructions && !selectedFile && (
        <p className="mt-2 text-gray-600 text-sm">
          Click the arrow above for detailed instructions on using my predictive modeling capabilities.
        </p>
      )}
    </div>
  );
};

export default AdaLovelaceAgent; 