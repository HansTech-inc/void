import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AtSymbolCompletions } from './AtSymbolCompletions';
import { AtSymbolContext } from '../../../common/atSymbolService';
import { useService } from '../context';
import { IAtSymbolService } from '../../../common/atSymbolService';

interface ChatInputWithSymbolsProps {
    onSubmit: (text: string, contexts: AtSymbolContext[]) => void;
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

    const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputText(event.target.value);
        setCursorPosition(event.target.selectionStart);
    };

    const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();

            if (inputText.trim()) {
                // Process @ symbols and get final text with contexts
                const { text, contexts: resolvedContexts } = await atSymbolService.processText(inputText);
                onSubmit(text, resolvedContexts);
                setInputText('');
                setContexts([]);
            }
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

    return (
        <div className="chat-input-container" style={{ position: 'relative' }}>
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
