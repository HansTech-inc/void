import React, { useEffect, useState } from 'react';
import { VSBuffer } from 'vs/base/common/buffer';
import { VoidImageMimeType } from 'vs/workbench/contrib/void/common/imageMessageTypes';

export interface ImagePreviewProps {
    image: VSBuffer;
    mimeType: VoidImageMimeType;
    onRemove: () => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ image, mimeType, onRemove }) => {
    const [imageSrc, setImageSrc] = useState<string>('');

    useEffect(() => {
        // Convert the VSBuffer to a data URL
        const blob = new Blob([image.buffer], { type: mimeType });
        const url = URL.createObjectURL(blob);
        setImageSrc(url);

        // Clean up the URL when the component unmounts
        return () => {
            URL.revokeObjectURL(url);
        };
    }, [image, mimeType]);

    return (
        <div
            className="image-preview-container"
            style={{
                position: 'relative',
                display: 'inline-block',
                maxWidth: '150px',
                maxHeight: '150px',
                margin: '8px 0',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid var(--vscode-input-border)'
            }}
        >
            <img
                src={imageSrc}
                alt="Attached image"
                style={{
                    maxWidth: '100%',
                    maxHeight: '150px',
                    display: 'block'
                }}
            />
            <button
                onClick={onRemove}
                style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '14px',
                    lineHeight: 1
                }}
                title="Remove image"
            >
                ×
            </button>
        </div>
    );
};
