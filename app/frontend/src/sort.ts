export type SortMode = 'auto' | 'string' | 'number';

export interface SortKey {
    columnIndex: number;
    direction: 'asc' | 'desc';
    mode: SortMode;
}

const NUMERIC_RE = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

function isNumericString(s: string): boolean {
    return s !== '' && NUMERIC_RE.test(s.trim());
}

function compareValues(a: string, b: string, mode: SortMode): number {
    const aEmpty = a === '';
    const bEmpty = b === '';
    if (aEmpty && bEmpty) return 0;
    // Empty cells always sort to the end (Excel convention).
    if (aEmpty) return 1;
    if (bEmpty) return -1;

    if (mode === 'number' || (mode === 'auto' && isNumericString(a) && isNumericString(b))) {
        const na = parseFloat(a);
        const nb = parseFloat(b);
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
    }
    return a.localeCompare(b, undefined, { numeric: false });
}

// sortRows returns a new array of rows ordered by the given keys (lexicographic
// across keys). Original array is not mutated.
export function sortRows(rows: string[][], keys: SortKey[]): string[][] {
    if (keys.length === 0) return rows;
    const indexed = rows.map((row, i) => ({ row, i }));
    indexed.sort((a, b) => {
        for (const key of keys) {
            const cmp = compareValues(
                a.row[key.columnIndex] ?? '',
                b.row[key.columnIndex] ?? '',
                key.mode,
            );
            if (cmp !== 0) return key.direction === 'asc' ? cmp : -cmp;
        }
        // Stable sort fallback by original index.
        return a.i - b.i;
    });
    return indexed.map((x) => x.row);
}
