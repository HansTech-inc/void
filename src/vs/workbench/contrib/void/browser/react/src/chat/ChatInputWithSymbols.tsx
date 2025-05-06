import React, { useState, useRef, useCallback, useEffect } from 'react';
import { VSBuffer } from '../../../../../../../base/common/buffer';
import { AtSymbolCompletions } from './AtSymbolCompletions';
import { AtSymbolContext } from '../../../common/atSymbolService';
import { useService } from '../context';
import { IAtSymbolService } from '../../../common/atSymbolService';
import { ImageAttachment } from './ImageAttachment';
import { ImagePreview } from './ImagePreview';
import { VoidImageMimeType, IVoidImagePart } from '../../../../../../../vs/workbench/contrib/void/common/imageMessageTypes';
import { resizeImage, readImageFromClipboard } from '../utils/imageUtils';

interface ChatInputWithSymbolsProps {
    onSubmit: (text: string, contexts: AtSymbolContext[], images?: IVoidImagePart[]) => void;
    placeholder?: string;
    disabled?: boolean;
}

export const ChatInputWithSymbols: React.FC<ChatInputWithSymbolsProps> = ({
    onSubmit,
    placeholder = 'Type a message...',
    disabled = false
}) => {
    const [inputText, setInputText] = useState('');
    const [cursorPosition, setCursorPosition] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const atSymbolService = useService(IAtSymbolService);

    // Track active contexts
    const [contexts, setContexts] = useState<AtSymbolContext[]>([]);

    // Track attached images
    const [attachedImages, setAttachedImages] = useState<Array<{data: VSBuffer, mimeType: VoidImageMimeType}>>([]);

    // Track if image attachment UI is open
    const [isAttachingImage, setIsAttachingImage] = useState(false);

    const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputText(event.target.value);
        setCursorPosition(event.target.selectionStart);
    };

    const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Check for paste image shortcut (Ctrl+V with image in clipboard)
        if (event.ctrlKey && event.key === 'v') {
            try {
                const imageData = await readImageFromClipboard();
                if (imageData) {
                    event.preventDefault();
                    handleImageAttached(imageData.data, imageData.mimeType as VoidImageMimeType);
                    return;
                }
            } catch (error) {
                console.error('Failed to paste image:', error);
            }
        }

        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        if (inputText.trim() || attachedImages.length > 0) {
            // Process @ symbols and get final text with contexts
            const { text, contexts: resolvedContexts } = await atSymbolService.processText(inputText);

            // Convert attached images to IVoidImagePart format
            const imageParts: IVoidImagePart[] = attachedImages.map(img => ({
                type: 'image',
                mimeType: img.mimeType,
                data: img.data
            }));

            onSubmit(text, resolvedContexts, imageParts.length > 0 ? imageParts : undefined);
            setInputText('');
            setContexts([]);
            setAttachedImages([]);
        }
    };

    const handleAtSymbolSelection = (context: AtSymbolContext) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Find the @ symbol being completed
        const beforeCursor = inputText.substring(0, cursorPosition);
        const atMatch = beforeCursor.match(/@([^\s]*)$/);

        if (atMatch) {
            const startIndex = beforeCursor.length - atMatch[0].length;
            const beforeAt = inputText.substring(0, startIndex);
            const afterCursor = inputText.substring(cursorPosition);

            // Replace the @ symbol and any text after it with the context reference
            const contextText = formatContextReference(context);
            const newText = beforeAt + contextText + ' ' + afterCursor;

            setInputText(newText);
            setContexts([...contexts, context]);

            // Move cursor after the inserted reference
            const newPosition = startIndex + contextText.length + 1;
            setTimeout(() => {
                textarea.selectionStart = newPosition;
                textarea.selectionEnd = newPosition;
                setCursorPosition(newPosition);
            }, 0);
        }
    };

    const handleImageAttached = async (data: VSBuffer, mimeType: VoidImageMimeType) => {
        try {
            // Resize the image if needed
            const resizedImage = await resizeImage(data);

            // Add to attached images
            setAttachedImages(prev => [...prev, { data: resizedImage, mimeType }]);

            // Close the attachment UI
            setIsAttachingImage(false);
        } catch (error) {
            console.error('Failed to process image:', error);
        }
    };

    const handleRemoveImage = (index: number) => {
        setAttachedImages(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="chat-input-container" style={{ position: 'relative' }}>
            {/* Image Attachment UI */}
            {isAttachingImage && (
                <ImageAttachment
                    onImageAttached={handleImageAttached}
                    onCancel={() => setIsAttachingImage(false)}
                />
            )}

            {/* Image Previews */}
            {attachedImages.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    {attachedImages.map((img, index) => (
                        <ImagePreview
                            key={index}
                            image={img.data}
                            mimeType={img.mimeType}
                            onRemove={() => handleRemoveImage(index)}
                        />
                    ))}
                </div>
            )}

            <textarea
                ref={textareaRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                style={{
                    width: '100%',
                    minHeight: '60px',
                    maxHeight: '200px',
                    resize: 'vertical',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid var(--vscode-input-border)',
                    backgroundColor: 'var(--vscode-input-background)',
                    color: 'var(--vscode-input-foreground)',
                    fontFamily: 'var(--vscode-font-family)',
                    fontSize: 'var(--vscode-font-size)',
                    outline: 'none',
                }}
            />

            {/* @ Symbol Completions */}
            <AtSymbolCompletions
                text={inputText}
                cursorPosition={cursorPosition}
                onSelect={handleAtSymbolSelection}
            />

            {/* Active Context Indicators */}
            {contexts.length > 0 && (
                <div className="active-contexts" style={{
                    display: 'flex',
                    gap: '4px',
                    marginTop: '4px',
                }}>
                    {contexts.map((context, index) => (
                        <div
                            key={`${context.type}-${index}`}
                            className="context-indicator"
                            style={{
                                padding: '2px 6px',
                                fontSize: '0.9em',
                                backgroundColor: 'var(--vscode-badge-background)',
                                color: 'var(--vscode-badge-foreground)',
                                borderRadius: '3px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <span>{context.display || context.value}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Action Buttons */}
            <div style={{ position: 'absolute', right: '8px', bottom: '8px', display: 'flex', gap: '8px' }}>
                {/* Image Upload Button */}
                <button
                    onClick={() => setIsAttachingImage(true)}
                    disabled={disabled}
                    title="Attach image"
                    style={{
                        padding: '4px 8px',
                        backgroundColor: 'var(--vscode-button-secondaryBackground)',
                        color: 'var(--vscode-button-secondaryForeground)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    📷
                </button>

                {/* Send Button */}
                <button
                    onClick={handleSubmit}
                    disabled={disabled || (!inputText.trim() && attachedImages.length === 0)}
                    style={{
                        padding: '4px 8px',
                        backgroundColor: 'var(--vscode-button-background)',
                        color: 'var(--vscode-button-foreground)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        opacity: (inputText.trim() || attachedImages.length > 0) ? '1' : '0.5',
                    }}
                >
                    Send
                </button>
            </div>
        </div>
    );
};

// Helper function to format context references
const formatContextReference = (context: AtSymbolContext): string => {
    return `@[${context.display || context.value}](${context.type}:${context.id})`;
};
