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

type FindFailureReason = 'invalid-regex' | 'unsafe-regex' | 'search-timeout';

export interface FindFailure {
    ok: false;
    reason: FindFailureReason;
    message: string;
}

export interface FindSuccess<T> {
    ok: true;
    value: T;
}

export type FindResult<T> = FindSuccess<T> | FindFailure;

const regexTimeoutMs = 5000;

function fail(reason: FindFailureReason, message: string): FindFailure {
    return { ok: false, reason, message };
}

function hasNestedQuantifier(pattern: string): boolean {
    const stack: Array<{ hasInnerQuantifier: boolean }> = [];
    let escaped = false;
    let inClass = false;
    for (let i = 0; i < pattern.length; i++) {
        const ch = pattern[i];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (ch === '\\') {
            escaped = true;
            continue;
        }
        if (inClass) {
            if (ch === ']') inClass = false;
            continue;
        }
        if (ch === '[') {
            inClass = true;
            continue;
        }
        if (ch === '(') {
            stack.push({ hasInnerQuantifier: false });
            continue;
        }
        if (ch === ')') {
            const group = stack.pop();
            if (!group) continue;
            const next = pattern[i + 1];
            const groupIsQuantified = next === '*' || next === '+' || next === '?' || next === '{';
            if (groupIsQuantified && group.hasInnerQuantifier) return true;
            if (groupIsQuantified && stack.length > 0) {
                stack[stack.length - 1].hasInnerQuantifier = true;
            }
            continue;
        }
        const isGroupPrefix = ch === '?' && pattern[i - 1] === '(';
        if ((ch === '*' || ch === '+' || ch === '?' || ch === '{') && !isGroupPrefix && stack.length > 0) {
            stack[stack.length - 1].hasInnerQuantifier = true;
        }
    }
    return false;
}

function hasRepeatedAlternation(pattern: string): boolean {
    return /\((?:\?[:=!<][^)]*)?[^)]*\|[^)]*\)(?:[+*?]|\{)/.test(pattern);
}

function validateRegexPattern(pattern: string): FindFailure | null {
    if (hasNestedQuantifier(pattern) || hasRepeatedAlternation(pattern)) {
        return fail(
            'unsafe-regex',
            'Search failed: this regular expression is too complex and could freeze the app.',
        );
    }
    return null;
}

function buildRegex(query: string, opts: FindOptions): FindResult<RegExp | null> {
    if (!query) return { ok: true, value: null };
    const flags = opts.caseSensitive ? 'g' : 'gi';
    if (opts.regex) {
        const unsafe = validateRegexPattern(query);
        if (unsafe) return unsafe;
        try {
            return { ok: true, value: new RegExp(query, flags) };
        } catch {
            return fail('invalid-regex', 'Search failed: invalid regular expression.');
        }
    }
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return { ok: true, value: new RegExp(escaped, flags) };
}

export function findMatches(
    query: string,
    opts: FindOptions,
    rows: string[][],
): FindResult<Match[]> {
    const built = buildRegex(query, opts);
    if (!built.ok) return built;
    const re = built.value;
    if (!re) return { ok: true, value: [] };
    const out: Match[] = [];
    const deadline = Date.now() + regexTimeoutMs;
    for (let r = 0; r < rows.length; r++) {
        if (Date.now() > deadline) {
            return fail('search-timeout', 'Search failed: the table is too large to search safely.');
        }
        const row = rows[r];
        for (let c = 0; c < row.length; c++) {
            if (Date.now() > deadline) {
                return fail('search-timeout', 'Search failed: the table is too large to search safely.');
            }
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
    return { ok: true, value: out };
}

// replaceAllEdits builds one PendingEdit per cell containing matches,
// using String#replace so $1, $&, etc. work in regex mode.
export function replaceAllEdits(
    query: string,
    replacement: string,
    opts: FindOptions,
    rows: string[][],
): FindResult<PendingEdit[]> {
    const built = buildRegex(query, opts);
    if (!built.ok) return built;
    const re = built.value;
    if (!re) return { ok: true, value: [] };
    const edits: PendingEdit[] = [];
    const deadline = Date.now() + regexTimeoutMs;
    for (let r = 0; r < rows.length; r++) {
        if (Date.now() > deadline) {
            return fail('search-timeout', 'Replace all failed: the table is too large to search safely.');
        }
        const row = rows[r];
        for (let c = 0; c < row.length; c++) {
            if (Date.now() > deadline) {
                return fail('search-timeout', 'Replace all failed: the table is too large to search safely.');
            }
            const cell = row[c] ?? '';
            if (!cell) continue;
            re.lastIndex = 0;
            if (opts.wholeCell) {
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
    return { ok: true, value: edits };
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
        const built = buildRegex(query, opts);
        if (!built.ok || !built.value) return null;
        const re = built.value;
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
