import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import './App.css';
import { StatusBar } from './components/StatusBar';
import { VirtualTable, type EditingCell } from './components/VirtualTable';
import type { CommitDirection } from './components/CellEditor';
import {
    ConfirmDialog,
    LoadFile,
    SaveFile,
    SaveFileDialog,
    SupportedReadEncodings,
} from '../wailsjs/go/main/Bindings';
import { EventsOn } from '../wailsjs/runtime/runtime';
import type { main } from '../wailsjs/go/models';
import { initialState, isDirty, reducer, type PendingEdit } from './state';
import {
    bounds,
    singleCell,
    type CellPosition,
    type Selection,
} from './selection';
import { decodeTSV, encodeTSV } from './tsv';

function App() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [supportedEncodings, setSupportedEncodings] = useState<string[]>([]);
    const [selection, setSelection] = useState<Selection | null>(null);
    const [editing, setEditing] = useState<EditingCell | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { file, rows } = state;
    const dirty = isDirty(state);

    // Computed dynamically so paste-driven column growth flows through.
    const maxColumns = useMemo(() => {
        let m = file?.hasHeader && file.header ? file.header.length : 0;
        for (const row of rows) if (row.length > m) m = row.length;
        return Math.max(m, file?.maxColumns ?? 0);
    }, [file?.hasHeader, file?.header, file?.maxColumns, rows]);

    useEffect(() => {
        SupportedReadEncodings().then(setSupportedEncodings).catch(() => {});
    }, []);

    useEffect(() => {
        const offLoaded = EventsOn('file:loaded', (payload: main.FileLoadResult) => {
            dispatch({ type: 'LOAD', payload });
            setSelection(null);
            setEditing(null);
            setError(null);
        });
        const offError = EventsOn('file:error', (message: string) => {
            setError(message);
        });
        return () => {
            offLoaded();
            offError();
        };
    }, []);

    const handleSave = useCallback(async () => {
        if (!file) return;
        try {
            await SaveFile(
                file.path,
                file.usedEncoding,
                file.lineEnding,
                file.delimiter,
                file.hasHeader,
                file.hasHeader ? file.header : [],
                rows,
            );
            dispatch({ type: 'SAVED' });
            setError(null);
        } catch (e) {
            setError(String(e));
        }
    }, [file, rows]);

    const handleSaveAs = useCallback(async () => {
        if (!file) return;
        try {
            const path = await SaveFileDialog(file.filename);
            if (!path) return;
            const delimiter = path.toLowerCase().endsWith('.tsv') ? '\t' : ',';
            await SaveFile(
                path,
                file.usedEncoding,
                file.lineEnding,
                delimiter,
                file.hasHeader,
                file.hasHeader ? file.header : [],
                rows,
            );
            const filename = path.split(/[\\/]/).pop() ?? path;
            dispatch({
                type: 'UPDATE_FILE',
                patch: { path, filename, delimiter },
            });
            dispatch({ type: 'SAVED' });
            setError(null);
        } catch (e) {
            setError(String(e));
        }
    }, [file, rows]);

    useEffect(() => {
        const offSave = EventsOn('menu:save', () => {
            handleSave();
        });
        const offSaveAs = EventsOn('menu:saveAs', () => {
            handleSaveAs();
        });
        return () => {
            offSave();
            offSaveAs();
        };
    }, [handleSave, handleSaveAs]);

    const handleEncodingChange = useCallback(
        async (encoding: string) => {
            if (!file) return;
            try {
                const result = await LoadFile(file.path, encoding, file.delimiter, file.hasHeader);
                dispatch({ type: 'LOAD', payload: result });
                setSelection(null);
                setEditing(null);
                setError(null);
            } catch (e) {
                setError(String(e));
            }
        },
        [file],
    );

    const handleHasHeaderToggle = useCallback(
        async (hasHeader: boolean) => {
            if (!file) return;
            try {
                const result = await LoadFile(file.path, file.usedEncoding, file.delimiter, hasHeader);
                dispatch({ type: 'LOAD', payload: result });
                setSelection(null);
                setEditing(null);
                setError(null);
            } catch (e) {
                setError(String(e));
            }
        },
        [file],
    );

    const handleLineEndingChange = useCallback((lineEnding: string) => {
        dispatch({ type: 'UPDATE_FILE', patch: { lineEnding } });
    }, []);

    const handleStartEdit = useCallback((cell: EditingCell) => {
        setEditing(cell);
    }, []);

    const handleCommitEdit = useCallback(
        (value: string, direction: CommitDirection) => {
            if (!editing) {
                setEditing(null);
                return;
            }
            dispatch({
                type: 'APPLY_EDITS',
                edits: [
                    {
                        rowIndex: editing.rowIndex,
                        columnIndex: editing.columnIndex,
                        value,
                    },
                ],
            });
            setEditing(null);

            if (direction !== 'none') {
                const maxCols = file?.maxColumns ?? 0;
                let r = editing.rowIndex;
                let c = editing.columnIndex;
                if (direction === 'up') r = Math.max(0, r - 1);
                if (direction === 'down') r = Math.min(rows.length - 1, r + 1);
                if (direction === 'left') c = Math.max(0, c - 1);
                if (direction === 'right') c = Math.min(maxCols - 1, c + 1);
                setSelection(singleCell({ rowIndex: r, columnIndex: c }));
            }
        },
        [editing, file?.maxColumns, rows.length],
    );

    const handleCancelEdit = useCallback(() => {
        setEditing(null);
    }, []);

    const handleUndo = useCallback(() => dispatch({ type: 'UNDO' }), []);
    const handleRedo = useCallback(() => dispatch({ type: 'REDO' }), []);

    const handleCopy = useCallback(async () => {
        if (!selection) return;
        const b = bounds(selection);
        const grid: string[][] = [];
        for (let r = b.r0; r <= b.r1; r++) {
            const row: string[] = [];
            for (let c = b.c0; c <= b.c1; c++) {
                row.push(rows[r]?.[c] ?? '');
            }
            grid.push(row);
        }
        try {
            await navigator.clipboard.writeText(encodeTSV(grid));
        } catch (e) {
            setError(`Clipboard copy failed: ${e}`);
        }
    }, [selection, rows]);

    const handlePaste = useCallback(async () => {
        if (!selection || !file) return;
        let text: string;
        try {
            text = await navigator.clipboard.readText();
        } catch (e) {
            setError(`Clipboard read failed: ${e}`);
            return;
        }
        if (!text) return;
        const grid = decodeTSV(text);
        if (grid.length === 0) return;

        const b = bounds(selection);
        const selRows = b.r1 - b.r0 + 1;
        const selCols = b.c1 - b.c0 + 1;
        const clipRows = grid.length;
        const clipCols = grid.reduce((m, r) => Math.max(m, r.length), 0);

        const singleCellSelected = selRows === 1 && selCols === 1;
        const shapeMatches = selRows === clipRows && selCols === clipCols;
        const overflowsRows = b.r0 + clipRows > rows.length;
        const overflowsCols = b.c0 + clipCols > maxColumns;
        const wouldExtend = overflowsRows || overflowsCols;

        const reasons: string[] = [];
        if (!singleCellSelected && !shapeMatches) {
            reasons.push(
                `clipboard (${clipRows}×${clipCols}) doesn't match the selected ${selRows}×${selCols} range`,
            );
        }
        if (wouldExtend) {
            const newRows = Math.max(rows.length, b.r0 + clipRows);
            const newCols = Math.max(maxColumns, b.c0 + clipCols);
            reasons.push(
                `paste will extend the table to ${newRows} rows × ${newCols} columns`,
            );
        }

        if (reasons.length > 0) {
            try {
                const ok = await ConfirmDialog(
                    'Confirm paste',
                    `${reasons.join('; ')}. Continue?`,
                );
                if (!ok) return;
            } catch (e) {
                setError(`Dialog failed: ${e}`);
                return;
            }
        }

        const edits: PendingEdit[] = [];
        for (let r = 0; r < clipRows; r++) {
            const clipRow = grid[r];
            for (let c = 0; c < clipRow.length; c++) {
                edits.push({
                    rowIndex: b.r0 + r,
                    columnIndex: b.c0 + c,
                    value: clipRow[c],
                });
            }
        }
        if (edits.length === 0) return;
        dispatch({ type: 'APPLY_EDITS', edits });

        // Expand the selection to cover what was pasted.
        const newAnchor: CellPosition = { rowIndex: b.r0, columnIndex: b.c0 };
        const newFocus: CellPosition = {
            rowIndex: b.r0 + clipRows - 1,
            columnIndex: b.c0 + clipCols - 1,
        };
        setSelection({ anchor: newAnchor, focus: newFocus });
    }, [selection, file, rows.length, maxColumns]);

    return (
        <div id="App">
            {error && (
                <div className="error-bar" onClick={() => setError(null)}>
                    {error}
                </div>
            )}
            {file ? (
                <VirtualTable
                    header={file.hasHeader ? file.header : null}
                    rows={rows}
                    maxColumns={maxColumns}
                    selection={selection}
                    onSelectionChange={setSelection}
                    editing={editing}
                    onStartEdit={handleStartEdit}
                    onCommitEdit={handleCommitEdit}
                    onCancelEdit={handleCancelEdit}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    onCopy={handleCopy}
                    onPaste={handlePaste}
                />
            ) : (
                <main className="placeholder">
                    <h1>CSV Editor</h1>
                    <p>
                        Open a CSV or TSV file from the <strong>File ▸ Open…</strong> menu
                        (⌘O).
                    </p>
                </main>
            )}
            <StatusBar
                file={file}
                rows={rows}
                selection={selection}
                dirty={dirty}
                supportedEncodings={supportedEncodings}
                onEncodingChange={handleEncodingChange}
                onHasHeaderToggle={handleHasHeaderToggle}
                onLineEndingChange={handleLineEndingChange}
            />
        </div>
    );
}

export default App;
