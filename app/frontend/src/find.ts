import type { PendingEdit } from './state';

export interface FindOptions {
    caseSensitive: boolean;
    regex: boolean;
    wholeCell: boolean;
}

export interface Match {
    rowIndex: number;
    columnIndex: number;
    matchStart: number; // inclusive
    matchEnd: number; // exclusive
}

// buildRegex returns the search regex, or null when the query is empty or
// (in regex mode) syntactically invalid.
function buildRegex(query: string, opts: FindOptions): RegExp | null {
    if (!query) return null;
    const flags = opts.caseSensitive ? 'g' : 'gi';
    if (opts.regex) {
        try {
            return new RegExp(query, flags);
        } catch {
            return null;
        }
    }
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped, flags);
}

export function findMatches(
    query: string,
    opts: FindOptions,
    rows: string[][],
): Match[] {
    const re = buildRegex(query, opts);
    if (!re) return [];
    const out: Match[] = [];
    for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        for (let c = 0; c < row.length; c++) {
            const cell = row[c] ?? '';
            if (!cell) continue;
            re.lastIndex = 0;
            let m: RegExpExecArray | null;
            while ((m = re.exec(cell)) !== null) {
                if (opts.wholeCell && m[0] !== cell) {
                    if (m[0].length === 0) re.lastIndex++;
                    continue;
                }
                out.push({
                    rowIndex: r,
                    columnIndex: c,
                    matchStart: m.index,
                    matchEnd: m.index + m[0].length,
                });
                if (m[0].length === 0) re.lastIndex++;
            }
        }
    }
    return out;
}

// replaceAllEdits builds one PendingEdit per cell containing matches,
// using String#replace so $1, $&, etc. work in regex mode.
export function replaceAllEdits(
    query: string,
    replacement: string,
    opts: FindOptions,
    rows: string[][],
): PendingEdit[] {
    const re = buildRegex(query, opts);
    if (!re) return [];
    const edits: PendingEdit[] = [];
    for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        for (let c = 0; c < row.length; c++) {
            const cell = row[c] ?? '';
            if (!cell) continue;
            re.lastIndex = 0;
            if (opts.wholeCell) {
                // Only replace if the whole cell matches the pattern exactly.
                if (re.test(cell) && re.lastIndex === cell.length) {
                    if (cell !== replacement) {
                        edits.push({ rowIndex: r, columnIndex: c, value: replacement });
                    }
                }
                continue;
            }
            const next = cell.replace(re, replacement);
            if (next !== cell) {
                edits.push({ rowIndex: r, columnIndex: c, value: next });
            }
        }
    }
    return edits;
}

// replaceOneEdit applies the replacement to a single match and returns
// the resulting PendingEdit for the affected cell.
export function replaceOneEdit(
    match: Match,
    replacement: string,
    opts: FindOptions,
    rows: string[][],
    query: string,
): PendingEdit | null {
    const cell = rows[match.rowIndex]?.[match.columnIndex] ?? '';
    if (opts.regex) {
        // To support $-substitutions on a single match, re-run the regex
        // pinned at matchStart.
        const re = buildRegex(query, opts);
        if (!re) return null;
        re.lastIndex = match.matchStart;
        const m = re.exec(cell);
        if (!m || m.index !== match.matchStart) return null;
        // Use a sticky-style single replace by splicing.
        const sub = cell.substring(match.matchStart, match.matchEnd).replace(re, replacement);
        const next = cell.substring(0, match.matchStart) + sub + cell.substring(match.matchEnd);
        return next === cell ? null : { rowIndex: match.rowIndex, columnIndex: match.columnIndex, value: next };
    }
    const next = cell.substring(0, match.matchStart) + replacement + cell.substring(match.matchEnd);
    return next === cell ? null : { rowIndex: match.rowIndex, columnIndex: match.columnIndex, value: next };
}
