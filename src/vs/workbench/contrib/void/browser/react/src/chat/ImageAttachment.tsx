import React, { useState } from 'react';
import { VSBuffer } from 'vs/base/common/buffer';
import { VoidImageMimeType } from 'vs/workbench/contrib/void/common/imageMessageTypes';

export interface ImageAttachmentProps {
    onImageAttached: (data: VSBuffer, mimeType: VoidImageMimeType) => void;
    onCancel: () => void;
}

export const ImageAttachment: React.FC<ImageAttachmentProps> = ({ onImageAttached, onCancel }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            processImageFile(file);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            processImageFile(file);
        }
    };

    const processImageFile = (file: File) => {
        // Check if the file is an image
        if (!file.type.startsWith('image/')) {
            return;
        }

        // Map the mime type to our enum
        let mimeType: VoidImageMimeType;
        switch (file.type) {
            case 'image/png':
                mimeType = VoidImageMimeType.PNG;
                break;
            case 'image/jpeg':
                mimeType = VoidImageMimeType.JPEG;
                break;
            case 'image/gif':
                mimeType = VoidImageMimeType.GIF;
                break;
            case 'image/webp':
                mimeType = VoidImageMimeType.WEBP;
                break;
            case 'image/bmp':
                mimeType = VoidImageMimeType.BMP;
                break;
            default:
                // Default to PNG if we don't have a direct match
                mimeType = VoidImageMimeType.PNG;
                break;
        }

        // Read the file as an ArrayBuffer and convert to VSBuffer
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target && event.target.result) {
                const arrayBuffer = event.target.result as ArrayBuffer;
                // Convert to VSBuffer
                const buffer = VSBuffer.wrap(new Uint8Array(arrayBuffer));
                onImageAttached(buffer, mimeType);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div
            className="image-attachment-container"
            style={{
                border: `2px dashed ${isDragging ? 'var(--vscode-focusBorder)' : 'var(--vscode-input-border)'}`,
                borderRadius: '4px',
                padding: '16px',
                textAlign: 'center',
                backgroundColor: isDragging ? 'var(--vscode-editor-hoverBackground)' : 'var(--vscode-input-background)',
                color: 'var(--vscode-input-foreground)',
                marginBottom: '8px',
                cursor: 'pointer'
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <p>Drag and drop an image here, or</p>
            <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="image-upload"
            />
            <label
                htmlFor="image-upload"
                style={{
                    padding: '6px 12px',
                    backgroundColor: 'var(--vscode-button-background)',
                    color: 'var(--vscode-button-foreground)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'inline-block',
                    marginTop: '8px'
                }}
            >
                Browse...
            </label>
            <button
                onClick={onCancel}
                style={{
                    padding: '6px 12px',
                    backgroundColor: 'var(--vscode-button-secondaryBackground)',
                    color: 'var(--vscode-button-secondaryForeground)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginLeft: '8px',
                    marginTop: '8px'
                }}
            >
                Cancel
            </button>
        </div>
    );
};
