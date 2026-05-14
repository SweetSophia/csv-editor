# csv-editor

A CSV/TSV viewer & editor GUI for Windows and macOS.

Built with [Wails](https://wails.io) (Go + React/TypeScript). Designed to replace
TableTool with a maintained, ARM64-native alternative that handles Japanese
encodings (UTF-8 / Shift_JIS / CP932), row/column copy operations, and TSV
clipboard expansion correctly.

> **Status**: Phase 1 (Core) — scaffold in place, viewer under construction.
> Not yet usable.

## Features (planned)

- **Multi-encoding** — read & write UTF-8 (BOM optional), Shift_JIS, CP932 with
  auto-detection on read
- **CSV and TSV** — both natively, RFC 4180 quoting
- **Large files** — virtual scrolling for hundreds of thousands of rows
- **IME-safe editing** — Japanese input doesn't accidentally commit cells
- **Clipboard that works** — copy/paste rows and columns, TSV paste auto-splits
  into multiple cells, shape-mismatch warning on paste
- **One file per window** — multiple files open in multiple windows
- **Frozen panes**, **incremental search + regex**, **multi-key sort**, **filter**
- **CSV/TSV only** — not a spreadsheet (no formulas, sheets, charts, xlsx)

See [docs/en/csv-editor-rfp.md](docs/en/csv-editor-rfp.md) for the full RFP.

## Requirements

- macOS 12+ (Apple Silicon recommended)
- Windows 11
- For building from source: Go 1.23+, Node.js 20+, [Wails v2](https://wails.io)

## Building

```bash
cd app
make build     # production build → dist/csv-editor.app (macOS) or .exe (Windows)
make dev       # live-reload development
make test      # unit tests
```

## Installation (when released)

Binaries will be distributed via GitHub Releases, **unsigned** for now.
Workarounds:

- **macOS Gatekeeper**: right-click the `.app` → Open → confirm
- **Windows SmartScreen**: "More info" → "Run anyway"

## Documentation

- [RFP (English)](docs/en/csv-editor-rfp.md)
- [RFP (Japanese)](docs/ja/csv-editor-rfp.ja.md)

## License

MIT
