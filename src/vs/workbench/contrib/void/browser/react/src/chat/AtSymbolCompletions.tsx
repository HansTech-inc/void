import React, { useEffect, useState } from 'react';
import { useService } from '../context';
import { AtSymbolContext, IAtSymbolService } from '../../../common/atSymbolService';
import { Globe2, FileText, Folder } from 'lucide-react';

interface AtSymbolCompletionsProps {
    text: string;
    cursorPosition: number;
    onSelect: (context: AtSymbolContext) => void;
}

export const AtSymbolCompletions: React.FC<AtSymbolCompletionsProps> = ({
    text,
    cursorPosition,
    onSelect
}) => {
    const [completions, setCompletions] = useState<AtSymbolContext[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    const atSymbolService = useService(IAtSymbolService);

    useEffect(() => {
        const updateCompletions = async () => {
            const results = await atSymbolService.getCompletions(text, cursorPosition);
            setCompletions(results);
            setIsVisible(results.length > 0);
            setSelectedIndex(0);
        };

        updateCompletions();
    }, [text, cursorPosition]);

    const handleKeyDown = (e: KeyboardEvent) => {
        if (!isVisible) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(i => (i + 1) % completions.length);
                break;

            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(i => (i - 1 + completions.length) % completions.length);
                break;

            case 'Enter':
                e.preventDefault();
                if (completions[selectedIndex]) {
                    onSelect(completions[selectedIndex]);
                    setIsVisible(false);
                }
                break;

            case 'Escape':
                e.preventDefault();
                setIsVisible(false);
                break;
        }
    };

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [completions, selectedIndex, isVisible]);

    if (!isVisible) return null;

    const getIcon = (type: AtSymbolContext['type']) => {
        switch (type) {
            case 'file':
                return <FileText size={16} />;
            case 'folder':
                return <Folder size={16} />;
            case 'link':
                return <Globe2 size={16} />;
            default:
                return null;
        }
    };

    return (
        <div
            className="at-symbol-completions"
            style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                maxHeight: '200px',
                overflow: 'auto',
                backgroundColor: 'var(--vscode-editorSuggestWidget-background)',
                border: '1px solid var(--vscode-editorSuggestWidget-border)',
                borderRadius: '3px',
                boxShadow: '0 2px 8px var(--vscode-widget-shadow)',
                zIndex: 100,
            }}
        >
            {completions.map((completion, index) => (
                <div
                    key={`${completion.type}-${completion.value}`}
                    className={`completion-item ${index === selectedIndex ? 'selected' : ''}`}
                    onClick={() => {
                        onSelect(completion);
                        setIsVisible(false);
                    }}
                    style={{
                        padding: '6px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: index === selectedIndex ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent',
                        color: index === selectedIndex ? 'var(--vscode-list-activeSelectionForeground)' : 'var(--vscode-foreground)',
                    }}
                >
                    {getIcon(completion.type)}
                    <div>
                        <div style={{ fontWeight: 500 }}>{completion.displayName}</div>
                        {completion.metadata?.description && (
                            <div style={{ fontSize: '0.9em', opacity: 0.8 }}>
                                {completion.metadata.description}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};
