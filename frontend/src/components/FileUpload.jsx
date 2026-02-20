import React, { useState } from 'react';
import API_BASE from '../config';
import './FileUpload.css';

function FileUpload({ onSuccess, onError }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.name.endsWith('.csv')) {
        setSelectedFile(file);
        onError(null);
      } else {
        onError('Please select a CSV file');
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        setSelectedFile(file);
        onError(null);
      } else {
        onError('Please select a CSV file');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      onError('Please select a file first');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess(data);
      } else {
        onError(data.detail || 'Upload failed');
      }
    } catch (error) {
      onError('Network error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <h2>📁 Upload Transaction Data</h2>
      <p className="upload-description">
        Upload a CSV file with transaction data to visualize the network
      </p>

      <div
        className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-input"
          accept=".csv"
          onChange={handleFileChange}
          className="file-input"
        />
        <label htmlFor="file-input" className="file-label">
          <div className="upload-icon">📊</div>
          <p className="upload-text">
            {selectedFile ? selectedFile.name : 'Click to browse or drag and drop CSV file'}
          </p>
          <p className="upload-hint">
            Required format: transaction_id, sender_id, receiver_id, amount, timestamp
          </p>
        </label>
      </div>

      <button
        className="upload-btn"
        onClick={handleUpload}
        disabled={!selectedFile || uploading}
      >
        {uploading ? (
          <>
            <span className="btn-spinner"></span>
            Uploading...
          </>
        ) : (
          <>
            <span>⬆️</span>
            Upload & Analyze
          </>
        )}
      </button>
    </div>
  );
}

export default FileUpload;
