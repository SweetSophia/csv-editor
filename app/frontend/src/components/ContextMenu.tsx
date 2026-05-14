import { useEffect, useRef } from 'react';

export interface MenuItem {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    separatorBefore?: boolean;
}

interface ContextMenuProps {
    items: MenuItem[];
    x: number;
    y: number;
    onClose: () => void;
}

export function ContextMenu({ items, x, y, onClose }: ContextMenuProps) {
    const ref = useRef<HTMLDivElement>(null);

    // Close on any mousedown that lands outside the menu. We do this on
    // capture so the menu disappears before downstream click handlers fire.
    useEffect(() => {
        const onMouseDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        window.addEventListener('mousedown', onMouseDown, true);
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('mousedown', onMouseDown, true);
            window.removeEventListener('keydown', onKey);
        };
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="context-menu"
            style={{ left: x, top: y }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {items.map((item, i) => (
                <div key={i}>
                    {item.separatorBefore && <div className="context-menu-sep" />}
                    <button
                        type="button"
                        className="context-menu-item"
                        disabled={item.disabled}
                        onClick={() => {
                            if (item.disabled) return;
                            item.onClick();
                            onClose();
                        }}
                    >
                        {item.label}
                    </button>
                </div>
            ))}
        </div>
    );
}
