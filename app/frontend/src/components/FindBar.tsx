import { useEffect, useRef } from 'react';
import type { FindOptions } from '../find';

interface FindBarProps {
    query: string;
    onQueryChange: (q: string) => void;
    options: FindOptions;
    onOptionsChange: (o: FindOptions) => void;
    matchCount: number;
    currentIndex: number;
    onNext: () => void;
    onPrev: () => void;
    onClose: () => void;
    replaceMode: boolean;
    onToggleReplaceMode: () => void;
    replaceValue: string;
    onReplaceValueChange: (v: string) => void;
    onReplaceOne: () => void;
    onReplaceAll: () => void;
}

export function FindBar(props: FindBarProps) {
    const {
        query,
        onQueryChange,
        options,
        onOptionsChange,
        matchCount,
        currentIndex,
        onNext,
        onPrev,
        onClose,
        replaceMode,
        onToggleReplaceMode,
        replaceValue,
        onReplaceValueChange,
        onReplaceOne,
        onReplaceAll,
    } = props;

    const findRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        findRef.current?.focus();
        findRef.current?.select();
    }, []);

    const setOpt = (patch: Partial<FindOptions>) =>
        onOptionsChange({ ...options, ...patch });

    const onFindKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) onPrev();
            else onNext();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };

    return (
        <div className="findbar">
            <div className="findbar-rows">
                <div className="findbar-row">
                    <button
                        type="button"
                        className={'findbar-toggle' + (replaceMode ? ' active' : '')}
                        onClick={onToggleReplaceMode}
                        title={replaceMode ? 'Hide replace' : 'Show replace'}
                        aria-label={replaceMode ? 'Hide replace' : 'Show replace'}
                        aria-expanded={replaceMode}
                    >
                        {replaceMode ? '▼' : '▶'}
                    </button>
                    <input
                        ref={findRef}
                        type="text"
                        className="findbar-input"
                        placeholder="Find"
                        value={query}
                        onChange={(e) => onQueryChange(e.target.value)}
                        onKeyDown={onFindKey}
                    />
                    <button
                        type="button"
                        className={'findbar-icon' + (options.caseSensitive ? ' active' : '')}
                        onClick={() => setOpt({ caseSensitive: !options.caseSensitive })}
                        title="Match case"
                    >
                        Aa
                    </button>
                    <button
                        type="button"
                        className={'findbar-icon' + (options.wholeCell ? ' active' : '')}
                        onClick={() => setOpt({ wholeCell: !options.wholeCell })}
                        title="Match whole cell"
                    >
                        [a]
                    </button>
                    <button
                        type="button"
                        className={'findbar-icon' + (options.regex ? ' active' : '')}
                        onClick={() => setOpt({ regex: !options.regex })}
                        title="Regular expression"
                    >
                        .*
                    </button>
                    <span className="findbar-count">
                        {matchCount === 0
                            ? 'No matches'
                            : `${currentIndex + 1} / ${matchCount}`}
                    </span>
                    <button
                        type="button"
                        className="findbar-icon"
                        onClick={onPrev}
                        disabled={matchCount === 0}
                        title="Previous (Shift+Enter)"
                    >
                        ↑
                    </button>
                    <button
                        type="button"
                        className="findbar-icon"
                        onClick={onNext}
                        disabled={matchCount === 0}
                        title="Next (Enter)"
                    >
                        ↓
                    </button>
                    <button
                        type="button"
                        className="findbar-icon"
                        onClick={onClose}
                        title="Close (Esc)"
                    >
                        ✕
                    </button>
                </div>
                {replaceMode && (
                    <div className="findbar-row">
                        <span className="findbar-toggle-spacer" aria-hidden="true" />
                        <input
                            type="text"
                            className="findbar-input"
                            placeholder="Replace"
                            value={replaceValue}
                            onChange={(e) => onReplaceValueChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    e.preventDefault();
                                    onClose();
                                }
                            }}
                        />
                        <button
                            type="button"
                            className="findbar-button"
                            onClick={onReplaceOne}
                            disabled={matchCount === 0}
                            title="Replace current match"
                        >
                            Replace
                        </button>
                        <button
                            type="button"
                            className="findbar-button"
                            onClick={onReplaceAll}
                            disabled={matchCount === 0}
                            title="Replace all matches"
                        >
                            All
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
