import type { main } from '../wailsjs/go/models';

// Edit describes a single cell change. Used both as input (caller supplies
// rowIndex, columnIndex, value — the reducer computes `before`) and as the
// historical record (after the reducer fills in `before`).
export interface Edit {
    rowIndex: number;
    columnIndex: number;
    before: string;
    after: string;
}

// HistoryEntry groups edits that should be undone or redone together
// (single-cell edit, multi-cell paste, etc.). rowCountBefore and
// rowLengthsBefore let UNDO restore the original table dimensions when
// the action extended rows or columns.
export interface HistoryEntry {
    edits: Edit[];
    rowCountBefore: number;
    // Only contains rows that existed before the entry AND were
    // extended in length. Rows that didn't exist before are reflected
    // by rowCountBefore alone.
    rowLengthsBefore: Record<number, number>;
}

export interface EditableState {
    file: main.FileLoadResult | null;
    rows: string[][];
    history: HistoryEntry[];
    future: HistoryEntry[];
    savedHistoryLength: number;
}

export const initialState: EditableState = {
    file: null,
    rows: [],
    history: [],
    future: [],
    savedHistoryLength: 0,
};

export function isDirty(state: EditableState): boolean {
    return state.history.length !== state.savedHistoryLength;
}

// Pending edit as supplied by the UI (before reading current state).
export interface PendingEdit {
    rowIndex: number;
    columnIndex: number;
    value: string;
}

export type Action =
    | { type: 'LOAD'; payload: main.FileLoadResult }
    | { type: 'APPLY_EDITS'; edits: PendingEdit[] }
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'SAVED' }
    | { type: 'UPDATE_FILE'; patch: Partial<main.FileLoadResult> }
    | { type: 'CLEAR' };

function setCell(rows: string[][], r: number, c: number, value: string): string[][] {
    // Pad rows to reach r when paste extends past current data.
    let next: string[][];
    if (r >= rows.length) {
        next = rows.slice();
        while (next.length <= r) next.push([]);
    } else {
        next = rows.map((row, i) => (i === r ? row.slice() : row));
    }
    const targetRow = next[r].slice();
    while (targetRow.length <= c) targetRow.push('');
    targetRow[c] = value;
    next[r] = targetRow;
    return next;
}

export function reducer(state: EditableState, action: Action): EditableState {
    switch (action.type) {
        case 'LOAD':
            return {
                file: action.payload,
                rows: action.payload.rows.map((r) => r.slice()),
                history: [],
                future: [],
                savedHistoryLength: 0,
            };

        case 'APPLY_EDITS': {
            if (!state.file) return state;
            const rowCountBefore = state.rows.length;
            const rowLengthsBefore: Record<number, number> = {};
            let rows = state.rows;
            const entries: Edit[] = [];
            for (const e of action.edits) {
                const before = rows[e.rowIndex]?.[e.columnIndex] ?? '';
                if (before === e.value) continue;
                // Capture row length the first time we touch each pre-existing row.
                if (
                    e.rowIndex < rowCountBefore &&
                    rowLengthsBefore[e.rowIndex] === undefined
                ) {
                    rowLengthsBefore[e.rowIndex] = state.rows[e.rowIndex].length;
                }
                entries.push({
                    rowIndex: e.rowIndex,
                    columnIndex: e.columnIndex,
                    before,
                    after: e.value,
                });
                rows = setCell(rows, e.rowIndex, e.columnIndex, e.value);
            }
            if (entries.length === 0) return state;
            return {
                ...state,
                rows,
                history: [
                    ...state.history,
                    { edits: entries, rowCountBefore, rowLengthsBefore },
                ],
                future: [],
            };
        }

        case 'UNDO': {
            if (state.history.length === 0) return state;
            const entry = state.history[state.history.length - 1];
            let rows = state.rows;
            // Reverse order so overlapping edits within an entry undo correctly.
            for (let i = entry.edits.length - 1; i >= 0; i--) {
                const e = entry.edits[i];
                rows = setCell(rows, e.rowIndex, e.columnIndex, e.before);
            }
            // Shrink table dimensions if this entry had extended them.
            if (rows.length > entry.rowCountBefore) {
                rows = rows.slice(0, entry.rowCountBefore);
            }
            const lengthsToRestore = entry.rowLengthsBefore;
            const needsTrim = Object.keys(lengthsToRestore).some(
                (k) => rows[Number(k)]?.length !== lengthsToRestore[Number(k)],
            );
            if (needsTrim) {
                rows = rows.map((row, i) => {
                    const orig = lengthsToRestore[i];
                    return orig !== undefined && row.length > orig
                        ? row.slice(0, orig)
                        : row;
                });
            }
            return {
                ...state,
                rows,
                history: state.history.slice(0, -1),
                future: [...state.future, entry],
            };
        }

        case 'REDO': {
            if (state.future.length === 0) return state;
            const entry = state.future[state.future.length - 1];
            let rows = state.rows;
            for (const e of entry.edits) {
                rows = setCell(rows, e.rowIndex, e.columnIndex, e.after);
            }
            return {
                ...state,
                rows,
                history: [...state.history, entry],
                future: state.future.slice(0, -1),
            };
        }

        case 'SAVED':
            return { ...state, savedHistoryLength: state.history.length };

        case 'UPDATE_FILE': {
            if (!state.file) return state;
            return { ...state, file: { ...state.file, ...action.patch } };
        }

        case 'CLEAR':
            return initialState;
    }
}
