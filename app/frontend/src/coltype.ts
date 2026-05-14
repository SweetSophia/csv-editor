// Column type inference: a column is treated as "numeric" when every
// non-empty data cell parses as a number. This drives display alignment
// only — values are still stored as strings and never coerced.

const NUMERIC_RE = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

export function isNumericString(s: string): boolean {
    if (s === '') return false;
    return NUMERIC_RE.test(s.trim());
}

// inferColumnTypes returns a boolean per column: true means "numeric"
// (right-align). An entirely-empty column returns false (no point
// guessing). Sampled above 20k rows to stay responsive on huge files.
export function inferColumnTypes(rows: string[][], colCount: number): boolean[] {
    if (colCount === 0) return [];
    const isNumeric: boolean[] = new Array(colCount).fill(true);
    const seenAny: boolean[] = new Array(colCount).fill(false);
    const stride = rows.length > 20000 ? Math.ceil(rows.length / 20000) : 1;
    for (let r = 0; r < rows.length; r += stride) {
        const row = rows[r];
        if (!row) continue;
        const limit = Math.min(colCount, row.length);
        for (let c = 0; c < limit; c++) {
            if (!isNumeric[c]) continue;
            const cell = row[c];
            if (!cell) continue;
            seenAny[c] = true;
            if (!NUMERIC_RE.test(cell.trim())) {
                isNumeric[c] = false;
            }
        }
    }
    for (let i = 0; i < colCount; i++) {
        if (!seenAny[i]) isNumeric[i] = false;
    }
    return isNumeric;
}
