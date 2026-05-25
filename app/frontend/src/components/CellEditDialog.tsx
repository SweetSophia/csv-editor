import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

interface CellEditDialogProps {
    initialValue: string;
    rowIndex: number;
    columnIndex: number;
    onSave: (value: string) => void;
    onCancel: () => void;
}

export function CellEditDialog({
    initialValue,
    rowIndex,
    columnIndex,
    onSave,
    onCancel,
}: CellEditDialogProps) {
    const [value, setValue] = useState(initialValue);
    const dialogRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const composingRef = useRef(false);
    const compositionEndAtRef = useRef(0);

    useEffect(() => {
        const previouslyFocused = document.activeElement;
        textareaRef.current?.focus();
        textareaRef.current?.select();

        return () => {
            if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
                previouslyFocused.focus();
            }
        };
    }, []);

    const isIME = (e: KeyboardEvent<HTMLElement>) => {
        if (e.nativeEvent.isComposing) return true;
        if (composingRef.current) return true;
        if (e.keyCode === 229) return true;
        if (Date.now() - compositionEndAtRef.current < 50) return true;
        return false;
    };

    const trapFocus = (e: KeyboardEvent<HTMLElement>) => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const focusable = Array.from(
            dialog.querySelectorAll<HTMLElement>(
                'button:not([disabled]), textarea:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
        ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex >= 0);

        if (focusable.length === 0) {
            e.preventDefault();
            dialog.focus();
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (e.shiftKey) {
            if (active === first || !dialog.contains(active)) {
                e.preventDefault();
                last.focus();
            }
        } else if (active === last || !dialog.contains(active)) {
            e.preventDefault();
            first.focus();
        }
    };

    const handleDialogKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (e.key === 'Tab') {
            trapFocus(e);
        } else if (e.key === 'Escape' && !isIME(e)) {
            e.preventDefault();
            onCancel();
        }
    };

    const handleTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        e.stopPropagation();
        if (e.key === 'Tab') {
            trapFocus(e);
            return;
        }
        if (isIME(e)) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
        } else if (e.key === 'Enter' && !e.altKey) {
            e.preventDefault();
            onSave(value);
        }
    };

    return (
        <div
            className="cell-edit-dialog-overlay"
            onClick={onCancel}
            role="presentation"
        >
            <div
                className="cell-edit-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cell-edit-title"
                ref={dialogRef}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleDialogKeyDown}
            >
                <div className="cell-edit-dialog-header" id="cell-edit-title">
                    Edit Cell ({rowIndex + 1}, {columnIndex + 1})
                </div>
                <textarea
                    ref={textareaRef}
                    className="cell-edit-dialog-textarea"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onCompositionStart={() => {
                        composingRef.current = true;
                    }}
                    onCompositionEnd={() => {
                        composingRef.current = false;
                        compositionEndAtRef.current = Date.now();
                    }}
                    onKeyDown={handleTextareaKeyDown}
                    spellCheck={false}
                />
                <div className="cell-edit-dialog-buttons">
                    <button
                        type="button"
                        className="cell-edit-dialog-btn cell-edit-dialog-btn-cancel"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="cell-edit-dialog-btn cell-edit-dialog-btn-save"
                        onClick={() => onSave(value)}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
