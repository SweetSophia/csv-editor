// Selection is a rectangular cell range identified by an anchor (where the
// drag/shift-extend began) and a focus (the active cell that arrow keys move).
// The selected rectangle is the bounding box of anchor and focus.
export interface Selection {
    anchor: CellPosition;
    focus: CellPosition;
}

export interface CellPosition {
    rowIndex: number;
    columnIndex: number;
}

// Rect is a normalized bounding box (r0 ≤ r1, c0 ≤ c1).
export interface Rect {
    r0: number;
    c0: number;
    r1: number;
    c1: number;
}

export function singleCell(p: CellPosition): Selection {
    return { anchor: p, focus: p };
}

export function bounds(sel: Selection): Rect {
    const { anchor, focus } = sel;
    return {
        r0: Math.min(anchor.rowIndex, focus.rowIndex),
        c0: Math.min(anchor.columnIndex, focus.columnIndex),
        r1: Math.max(anchor.rowIndex, focus.rowIndex),
        c1: Math.max(anchor.columnIndex, focus.columnIndex),
    };
}

export function contains(sel: Selection, p: CellPosition): boolean {
    const b = bounds(sel);
    return (
        p.rowIndex >= b.r0 &&
        p.rowIndex <= b.r1 &&
        p.columnIndex >= b.c0 &&
        p.columnIndex <= b.c1
    );
}

export function rectSize(b: Rect): { rows: number; cols: number } {
    return { rows: b.r1 - b.r0 + 1, cols: b.c1 - b.c0 + 1 };
}

export function isSingleCell(sel: Selection): boolean {
    return (
        sel.anchor.rowIndex === sel.focus.rowIndex &&
        sel.anchor.columnIndex === sel.focus.columnIndex
    );
}
