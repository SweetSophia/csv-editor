# CLAUDE.md — csv-editor

## Overview

CSV/TSV viewer & editor GUI for Windows / macOS.
Wails v2 (Go + React/TypeScript) desktop application.

Designed to replace TableTool with a maintained, ARM64-native, multi-encoding
(UTF-8 / Shift_JIS / CP932) alternative that handles row/column copy and TSV
clipboard expansion correctly.

## Build

- `cd app && make build`
- Development: `cd app && make dev`
- Tests: `cd app && make test`

## Architecture (planned)

- **app/main.go** — Wails app entry, window options
- **app/bindings.go** — Wails bindings (thin delegation to internal packages)
- **app/internal/** — private Go packages (added during Phase 1)
  - `csvio/` — CSV/TSV parser, RFC 4180 quoting
  - `encoding/` — UTF-8 / Shift_JIS / CP932 detection and conversion
  - `config/` — JSON config at OS-standard location
- **app/frontend/src/** — React UI, virtualized table via TanStack Table

The internal layout is intentionally not pre-created — packages are added when
they get real implementations (no half-finished scaffolds).

## Key Design Decisions

See [docs/ja/csv-editor-rfp.ja.md](docs/ja/csv-editor-rfp.ja.md) for the full
RFP. Highlights:

- **CSV/TSV only** — not a spreadsheet. No formulas, no multiple sheets,
  no xlsx native support, no charts.
- **Encoding scope** — UTF-8 (BOM optional), Shift_JIS, CP932 only. Auto-detect
  on read, user-selected on write.
- **One file per window** — multiple files open in multiple windows.
- **Clipboard** — copy writes TSV (Excel-compatible); paste of TSV into a
  single cell splits across multiple cells; shape mismatch into a multi-cell
  selection triggers a warning dialog.
- **Hundreds of thousands of rows** — virtual scrolling via TanStack Table.
- **IME-safe editing** — wait for `compositionend` before committing.
- **Distribution** — single executable, unsigned for now (Gatekeeper /
  SmartScreen workarounds documented in README).
- **Windows 11 only** — WebView2 is OS-bundled; Win10 excluded to keep
  maintenance simple.

## Phase Plan

| Phase | Scope |
|-------|-------|
| 1. Core | Scaffold, read with auto-detect, virtual scroll, encoding re-specify, cell selection (read-only) |
| 2. Editing | Cell edit (IME), row/col ops, clipboard, undo/redo, save |
| 3. Productivity | Search, replace, sort, filter, frozen panes, recent files, D&D |
| 4. Release | Build pipeline, icon, unsigned distribution guidance, GitHub Releases |

Tests are written alongside implementation (table-driven for Go, Vitest+RTL
for React). E2E is manual checklist through Phase 4.

## Series

util-series (umbrella: nlink-jp/util-series)
