import React, { useState, useRef, ChangeEvent } from 'react';

interface ImageUploadProps {
  onUploadComplete: (imageUrl: string) => void;
  onUploadError?: (error: Error) => void;
  maxSizeInMB?: number;
  acceptedFileTypes?: string[];
  uploadEndpoint?: string;
  className?: string;
  buttonText?: string;
  showPreview?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onUploadComplete,
  onUploadError,
  maxSizeInMB = 5,
  acceptedFileTypes = ['image/jpeg', 'image/png', 'image/gif'],
  uploadEndpoint = '/api/upload',
  className = '',
  buttonText = 'Upload Image',
  showPreview = true
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states
    setError(null);
    setProgress(0);

    // Validate file type
    if (!acceptedFileTypes.includes(file.type)) {
      const error = new Error(`File type not supported. Accepted types: ${acceptedFileTypes.join(', ')}`);
      setError(error.message);
      if (onUploadError) onUploadError(error);
      return;
    }

    // Validate file size
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      const error = new Error(`File is too large. Maximum size is ${maxSizeInMB}MB`);
      setError(error.message);
      if (onUploadError) onUploadError(error);
      return;
    }

    // Create preview
    if (showPreview) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    // Upload file
    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          setIsUploading(false);
          onUploadComplete(response.imageUrl);
        } else {
          throw new Error(`Upload failed with status ${xhr.status}`);
        }
      });

      xhr.addEventListener('error', () => {
        const error = new Error('Network error occurred during upload');
        setError(error.message);
        setIsUploading(false);
        if (onUploadError) onUploadError(error);
      });

      xhr.open('POST', uploadEndpoint);
      xhr.send(formData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error.message);
      setIsUploading(false);
      if (onUploadError) onUploadError(error);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const resetUpload = () => {
    setPreviewUrl(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`image-upload-container ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={acceptedFileTypes.join(',')}
        style={{ display: 'none' }}
      />

      <button
        className="image-upload-button"
        onClick={triggerFileInput}
        disabled={isUploading}
      >
        {buttonText}
      </button>

      {isUploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="progress-text">{progress}%</span>
        </div>
      )}

      {error && (
        <div className="upload-error">
          <p>{error}</p>
          <button onClick={resetUpload}>Try Again</button>
        </div>
      )}

      {showPreview && previewUrl && !isUploading && !error && (
        <div className="image-preview">
          <img src={previewUrl} alt="Preview" />
        </div>
      )}
    </div>
  );
};

// Simpler hook version for custom implementations
export const useImageUpload = (options: {
  onUploadComplete: (imageUrl: string) => void;
  onUploadError?: (error: Error) => void;
  maxSizeInMB?: number;
  acceptedFileTypes?: string[];
  uploadEndpoint?: string;
}) => {
  const {
    onUploadComplete,
    onUploadError,
    maxSizeInMB = 5,
    acceptedFileTypes = ['image/jpeg', 'image/png', 'image/gif'],
    uploadEndpoint = '/api/upload'
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const validateAndUploadFile = async (file: File) => {
    // Reset states
    setError(null);
    setProgress(0);

    // Validate file type
    if (!acceptedFileTypes.includes(file.type)) {
      const error = new Error(`File type not supported. Accepted types: ${acceptedFileTypes.join(', ')}`);
      setError(error);
      if (onUploadError) onUploadError(error);
      return;
    }

    // Validate file size
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      const error = new Error(`File is too large. Maximum size is ${maxSizeInMB}MB`);
      setError(error);
      if (onUploadError) onUploadError(error);
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          setIsUploading(false);
          onUploadComplete(response.imageUrl);
        } else {
          throw new Error(`Upload failed with status ${xhr.status}`);
        }
      });

      xhr.addEventListener('error', () => {
        const error = new Error('Network error occurred during upload');
        setError(error);
        setIsUploading(false);
        if (onUploadError) onUploadError(error);
      });

      xhr.open('POST', uploadEndpoint);
      xhr.send(formData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      setIsUploading(false);
      if (onUploadError) onUploadError(error);
    }
  };

  return {
    uploadImage: validateAndUploadFile,
    isUploading,
    progress,
    error,
    reset: () => {
      setIsUploading(false);
      setProgress(0);
      setError(null);
    }
  };
};

// Utility function for direct usage without React
export const uploadImage = async (
  file: File,
  options: {
    onProgress?: (progress: number) => void;
    maxSizeInMB?: number;
    acceptedFileTypes?: string[];
    uploadEndpoint?: string;
  } = {}
): Promise<string> => {
  const {
    onProgress,
    maxSizeInMB = 5,
    acceptedFileTypes = ['image/jpeg', 'image/png', 'image/gif'],
    uploadEndpoint = '/api/upload'
  } = options;

  // Validate file type
  if (!acceptedFileTypes.includes(file.type)) {
    throw new Error(`File type not supported. Accepted types: ${acceptedFileTypes.join(', ')}`);
  }

  // Validate file size
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    throw new Error(`File is too large. Maximum size is ${maxSizeInMB}MB`);
  }

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('image', file);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        onProgress(percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response.imageUrl);
        } catch (err) {
          reject(new Error('Invalid response format'));
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error occurred during upload'));
    });

    xhr.open('POST', uploadEndpoint);
    xhr.send(formData);
  });
};
