import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    type ColumnDef,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CellEditor, type CommitDirection } from './CellEditor';
import {
    bounds,
    type CellPosition,
    type Selection,
    singleCell,
} from '../selection';

type Row = string[];

export interface EditingCell {
    rowIndex: number;
    columnIndex: number;
}

interface VirtualTableProps {
    header: string[] | null;
    rows: string[][];
    maxColumns: number;
    selection: Selection | null;
    onSelectionChange: (sel: Selection) => void;
    editing: EditingCell | null;
    onStartEdit: (cell: EditingCell) => void;
    onCommitEdit: (value: string, direction: CommitDirection) => void;
    onCancelEdit: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onCopy: () => void;
    onPaste: () => void;
}

const ROW_NUMBER_WIDTH = 64;
const DEFAULT_COL_WIDTH = 160;
const ROW_HEIGHT = 28;
const HEAD_HEIGHT = 32;

export function VirtualTable({
    header,
    rows,
    maxColumns,
    selection,
    onSelectionChange,
    editing,
    onStartEdit,
    onCommitEdit,
    onCancelEdit,
    onUndo,
    onRedo,
    onCopy,
    onPaste,
}: VirtualTableProps) {
    const columns = useMemo<ColumnDef<Row>[]>(() => {
        const cols: ColumnDef<Row>[] = [];
        cols.push({
            id: '__rownum',
            header: '#',
            cell: ({ row }) => row.index + 1,
            size: ROW_NUMBER_WIDTH,
        });
        for (let i = 0; i < maxColumns; i++) {
            cols.push({
                id: `c${i}`,
                header: header?.[i] ?? (header ? `(col ${i + 1})` : `Col ${i + 1}`),
                accessorFn: (row: Row) => row[i] ?? '',
                size: DEFAULT_COL_WIDTH,
            });
        }
        return cols;
    }, [header, maxColumns]);

    const table = useReactTable({
        data: rows,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const scrollRef = useRef<HTMLDivElement>(null);
    const draggingRef = useRef(false);

    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 16,
        scrollPaddingStart: HEAD_HEIGHT,
    });

    const totalWidth = ROW_NUMBER_WIDTH + maxColumns * DEFAULT_COL_WIDTH;

    const ensureCellVisible = useCallback(
        (rowIndex: number, columnIndex: number) => {
            const container = scrollRef.current;
            if (!container) return;
            const rowTop = HEAD_HEIGHT + rowIndex * ROW_HEIGHT;
            const rowBottom = rowTop + ROW_HEIGHT;
            const viewTop = container.scrollTop + HEAD_HEIGHT;
            const viewBottom = container.scrollTop + container.clientHeight;
            if (rowTop < viewTop) container.scrollTop = rowTop - HEAD_HEIGHT;
            else if (rowBottom > viewBottom) container.scrollTop = rowBottom - container.clientHeight;

            const cellLeft = ROW_NUMBER_WIDTH + columnIndex * DEFAULT_COL_WIDTH;
            const cellRight = cellLeft + DEFAULT_COL_WIDTH;
            if (cellLeft < container.scrollLeft + ROW_NUMBER_WIDTH)
                container.scrollLeft = cellLeft - ROW_NUMBER_WIDTH;
            else if (cellRight > container.scrollLeft + container.clientWidth)
                container.scrollLeft = cellRight - container.clientWidth;
        },
        [],
    );

    const clamp = useCallback(
        (p: CellPosition): CellPosition => ({
            rowIndex: Math.max(0, Math.min(rows.length - 1, p.rowIndex)),
            columnIndex: Math.max(0, Math.min(maxColumns - 1, p.columnIndex)),
        }),
        [rows.length, maxColumns],
    );

    const setFocus = useCallback(
        (focus: CellPosition, extend: boolean) => {
            const f = clamp(focus);
            const next: Selection = extend && selection
                ? { anchor: selection.anchor, focus: f }
                : singleCell(f);
            onSelectionChange(next);
            ensureCellVisible(f.rowIndex, f.columnIndex);
        },
        [clamp, selection, onSelectionChange, ensureCellVisible],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLDivElement>) => {
            if (editing) return;
            if (rows.length === 0 || maxColumns === 0) return;

            const cmdOrCtrl = e.metaKey || e.ctrlKey;

            if (cmdOrCtrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                onUndo();
                return;
            }
            if (
                cmdOrCtrl &&
                ((e.key.toLowerCase() === 'z' && e.shiftKey) ||
                    e.key.toLowerCase() === 'y')
            ) {
                e.preventDefault();
                onRedo();
                return;
            }
            if (cmdOrCtrl && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                onCopy();
                return;
            }
            if (cmdOrCtrl && e.key.toLowerCase() === 'v') {
                e.preventDefault();
                onPaste();
                return;
            }
            if (cmdOrCtrl && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                onSelectionChange({
                    anchor: { rowIndex: 0, columnIndex: 0 },
                    focus: {
                        rowIndex: rows.length - 1,
                        columnIndex: maxColumns - 1,
                    },
                });
                return;
            }

            if ((e.key === 'Enter' || e.key === 'F2') && selection) {
                e.preventDefault();
                onStartEdit(selection.focus);
                return;
            }

            // Tab moves the selection horizontally (Excel-style) and is
            // trapped so focus does not escape to the status bar.
            if (e.key === 'Tab' && selection) {
                e.preventDefault();
                const dir = e.shiftKey ? -1 : 1;
                setFocus(
                    {
                        rowIndex: selection.focus.rowIndex,
                        columnIndex: selection.focus.columnIndex + dir,
                    },
                    false,
                );
                return;
            }

            const navKeys = [
                'ArrowUp',
                'ArrowDown',
                'ArrowLeft',
                'ArrowRight',
                'Home',
                'End',
                'PageUp',
                'PageDown',
            ];
            if (!navKeys.includes(e.key)) return;

            if (selection == null) {
                e.preventDefault();
                setFocus({ rowIndex: 0, columnIndex: 0 }, false);
                return;
            }

            const pageSize = Math.max(
                1,
                Math.floor(((scrollRef.current?.clientHeight ?? 0) - HEAD_HEIGHT) / ROW_HEIGHT) - 1,
            );

            let { rowIndex: r, columnIndex: c } = selection.focus;
            // Cmd+arrow jumps to the edge regardless of Shift. Shift just
            // controls whether the anchor stays put (extend) or collapses.
            const cmdJump = cmdOrCtrl;

            switch (e.key) {
                case 'ArrowUp':
                    r = cmdJump ? 0 : r - 1;
                    break;
                case 'ArrowDown':
                    r = cmdJump ? rows.length - 1 : r + 1;
                    break;
                case 'ArrowLeft':
                    c = cmdJump ? 0 : c - 1;
                    break;
                case 'ArrowRight':
                    c = cmdJump ? maxColumns - 1 : c + 1;
                    break;
                case 'Home':
                    c = 0;
                    break;
                case 'End':
                    c = maxColumns - 1;
                    break;
                case 'PageUp':
                    r = r - pageSize;
                    break;
                case 'PageDown':
                    r = r + pageSize;
                    break;
            }
            e.preventDefault();
            setFocus({ rowIndex: r, columnIndex: c }, e.shiftKey);
        },
        [
            rows.length,
            maxColumns,
            selection,
            editing,
            setFocus,
            onSelectionChange,
            onStartEdit,
            onUndo,
            onRedo,
            onCopy,
            onPaste,
        ],
    );

    useEffect(() => {
        if (!editing) scrollRef.current?.focus({ preventScroll: true });
    }, [editing]);

    useEffect(() => {
        scrollRef.current?.focus({ preventScroll: true });
    }, [rows]);

    // Global mouseup ends a drag selection started inside the table.
    useEffect(() => {
        const onUp = () => {
            draggingRef.current = false;
        };
        window.addEventListener('mouseup', onUp);
        return () => window.removeEventListener('mouseup', onUp);
    }, []);

    const selBounds = selection ? bounds(selection) : null;

    return (
        <div
            className="vt-scroll"
            ref={scrollRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            <div
                className="vt-content"
                style={{
                    width: totalWidth,
                    height: HEAD_HEIGHT + rowVirtualizer.getTotalSize(),
                }}
            >
                <div className="vt-head" style={{ width: totalWidth, height: HEAD_HEIGHT }}>
                    {table.getHeaderGroups().map((hg) => (
                        <div className="vt-row vt-row-head" key={hg.id}>
                            {hg.headers.map((h) => (
                                <div
                                    className="vt-cell vt-cell-head"
                                    key={h.id}
                                    style={{ width: h.getSize() }}
                                >
                                    {flexRender(h.column.columnDef.header, h.getContext())}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                {rowVirtualizer.getVirtualItems().map((v) => {
                    const tableRow = table.getRowModel().rows[v.index];
                    return (
                        <div
                            className="vt-row"
                            key={v.key}
                            style={{
                                transform: `translateY(${HEAD_HEIGHT + v.start}px)`,
                                height: ROW_HEIGHT,
                            }}
                        >
                            {tableRow.getVisibleCells().map((cell, colIdx) => {
                                const isRowNum = colIdx === 0;
                                const dataColIdx = colIdx - 1;
                                const inSelection =
                                    !isRowNum &&
                                    selBounds != null &&
                                    v.index >= selBounds.r0 &&
                                    v.index <= selBounds.r1 &&
                                    dataColIdx >= selBounds.c0 &&
                                    dataColIdx <= selBounds.c1;
                                const isFocus =
                                    !isRowNum &&
                                    selection != null &&
                                    selection.focus.rowIndex === v.index &&
                                    selection.focus.columnIndex === dataColIdx;
                                const isEditing =
                                    !isRowNum &&
                                    editing?.rowIndex === v.index &&
                                    editing?.columnIndex === dataColIdx;
                                const className =
                                    'vt-cell' +
                                    (isRowNum ? ' vt-cell-rownum' : '') +
                                    (inSelection ? ' vt-cell-selected' : '') +
                                    (isFocus ? ' vt-cell-focus' : '') +
                                    (isEditing ? ' vt-cell-editing' : '');
                                const cellWidth = cell.column.getSize();
                                const cellHandlers = isRowNum
                                    ? {}
                                    : {
                                          onMouseDown: (
                                              e: React.MouseEvent<HTMLDivElement>,
                                          ) => {
                                              if (e.button !== 0) return;
                                              scrollRef.current?.focus({ preventScroll: true });
                                              const pos: CellPosition = {
                                                  rowIndex: v.index,
                                                  columnIndex: dataColIdx,
                                              };
                                              draggingRef.current = true;
                                              setFocus(pos, e.shiftKey);
                                          },
                                          onMouseEnter: (
                                              e: React.MouseEvent<HTMLDivElement>,
                                          ) => {
                                              if (!draggingRef.current) return;
                                              if (e.buttons === 0) {
                                                  draggingRef.current = false;
                                                  return;
                                              }
                                              setFocus(
                                                  {
                                                      rowIndex: v.index,
                                                      columnIndex: dataColIdx,
                                                  },
                                                  true,
                                              );
                                          },
                                          onDoubleClick: () =>
                                              onStartEdit({
                                                  rowIndex: v.index,
                                                  columnIndex: dataColIdx,
                                              }),
                                      };
                                return (
                                    <div
                                        key={cell.id}
                                        className={className}
                                        style={{ width: cellWidth }}
                                        {...cellHandlers}
                                    >
                                        {isEditing ? (
                                            <CellEditor
                                                initialValue={rows[v.index]?.[dataColIdx] ?? ''}
                                                width={cellWidth}
                                                height={ROW_HEIGHT}
                                                onCommit={onCommitEdit}
                                                onCancel={onCancelEdit}
                                            />
                                        ) : (
                                            flexRender(cell.column.columnDef.cell, cell.getContext())
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
