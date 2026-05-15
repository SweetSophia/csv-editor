import { useEffect, useRef, useState } from 'react';

export type CommitDirection = 'none' | 'up' | 'down' | 'left' | 'right';

interface CellEditorProps {
    initialValue: string;
    width: number;
    height: number;
    onCommit: (value: string, direction: CommitDirection) => void;
    onCancel: () => void;
}

// CellEditor renders a <textarea> overlay positioned inside a table cell.
// Textarea (instead of <input>) lets cells with embedded newlines (from
// RFC 4180-quoted CSV fields) be both displayed and edited intact.
//
// Key bindings (Excel-style):
//   - Enter       → commit ('down')
//   - Shift+Enter → commit ('up')
//   - Alt+Enter   → insert a newline
//   - Tab / Shift+Tab → commit ('right' / 'left')
//   - Esc         → cancel
//
// IME safety: WebKit fires keydown(Enter) and compositionend in different
// orders depending on the IME / browser version. We combine four guards:
//   1. e.nativeEvent.isComposing      (modern, works in most cases)
//   2. composingRef                   (catches isComposing=false during composition)
//   3. compositionEndAt timing buffer (50ms after compositionend → still IME)
//   4. keyCode === 229                (legacy Process-key fallback)
export function CellEditor({
    initialValue,
    width,
    height,
    onCommit,
    onCancel,
}: CellEditorProps) {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const composingRef = useRef(false);
    const compositionEndAtRef = useRef(0);
    const settledRef = useRef(false);

    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        el.select();
    }, []);

    const commit = (direction: CommitDirection) => {
        if (settledRef.current) return;
        settledRef.current = true;
        onCommit(value, direction);
    };

    const cancel = () => {
        if (settledRef.current) return;
        settledRef.current = true;
        onCancel();
    };

    const isIME = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.nativeEvent.isComposing) return true;
        if (composingRef.current) return true;
        if (e.keyCode === 229) return true;
        if (Date.now() - compositionEndAtRef.current < 50) return true;
        return false;
    };

    return (
        <textarea
            ref={inputRef}
            value={value}
            className="vt-cell-editor"
            style={{ width, height }}
            rows={1}
            spellCheck={false}
            onChange={(e) => setValue(e.target.value)}
            onCompositionStart={() => {
                composingRef.current = true;
            }}
            onCompositionEnd={() => {
                composingRef.current = false;
                compositionEndAtRef.current = Date.now();
            }}
            onKeyDown={(e) => {
                e.stopPropagation();
                if (isIME(e)) return;
                if (e.key === 'Enter') {
                    if (e.altKey) {
                        // Alt+Enter inserts a literal newline at the cursor.
                        // Let the textarea's default behaviour handle it.
                        return;
                    }
                    e.preventDefault();
                    commit(e.shiftKey ? 'up' : 'down');
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancel();
                } else if (e.key === 'Tab') {
                    e.preventDefault();
                    commit(e.shiftKey ? 'left' : 'right');
                }
            }}
            onBlur={() => commit('none')}
        />
    );
}
