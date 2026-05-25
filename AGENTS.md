# AGENTS.md - csv-editor

## Scope / Sources
- Root instructions for the whole repo. Existing agent guidance is `CLAUDE.md`; keep this file aligned with it.
- The real app/build unit is `app/`, not the repo root.
- Prefer source, executable config/scripts, current `README.md`, and `CHANGELOG.md` over older RFP/docs text when they conflict.
- Do not pre-create empty `app/internal` packages; add packages only with real implementation.

## Commands
- App dev/build/test/package/clean: `cd app && make dev|build|test|package|clean`.
- `cd app && make test` runs only `go test ./...`.
- Focused Go tests: `cd app && go test ./internal/csvio`, `./internal/encoding`, or `./internal/config`; use `-run` for one test.
- Frontend dev server only: `cd app/frontend && npm run dev`.
- Frontend production build: `cd app/frontend && npm run build` (`tsc && vite build`).
- No frontend test or lint script is currently defined.

## Toolchain
- Go module: `app/go.mod` (`github.com/nlink-jp/csv-editor`, Go `1.25.0`, Wails `v2.12.0`). If README Go version differs, `go.mod` wins.
- Node.js 20+ per README; frontend uses npm with `package-lock.json` lockfileVersion 3.
- Wails config is `app/wails.json`; Wails runs `npm install`, `npm run build`, and `npm run dev` for frontend hooks.

## Architecture / Wiring
- `app/main.go` is the Wails entry point, embeds `app/frontend/dist`, builds native menus, restores window state, and binds backend methods.
- `app/bindings.go` is the Wails API surface; keep it thin and delegate file/encoding/config work to `app/internal/{csvio,encoding,config}`.
- `app/frontend/src/main.tsx` renders `App`.
- `app/frontend/src/App.tsx` owns editor state plus file, menu, clipboard, search/replace, save/load, and dialog flows.
- `app/frontend/src/components/VirtualTable.tsx` uses TanStack Table/Virtual; virtual scrolling is required for large files.
- Frontend imports generated Wails bindings from `app/frontend/wailsjs`; regenerate through Wails dev/build, do not hand-edit them.

## Non-obvious Constraints
- CSV/TSV only: no spreadsheet formulas, multiple sheets, xlsx/ods, charts, or macros.
- Encodings are limited to UTF-8, UTF-8-BOM, Shift_JIS, and CP932.
- Delimiter defaults to comma unless `.tsv` or an explicit tab hint is used.
- Line endings detect CRLF/LF/CR; CR-only writes are mapped to LF.
- Use the native OS title bar and update file titles through `runtime.WindowSetTitle`.
- Theme follows OS appearance through `App.css` CSS variables and `prefers-color-scheme`; avoid hardcoded colors.
- Clipboard copy emits TSV; pasting TSV into one cell expands; shape mismatch into a multi-cell selection confirms through a native dialog.
- IME-safe editing must wait for `compositionend` and guard `keyCode === 229` before committing.
- One file per window; New Window spawns another process.
- macOS package signs/notarizes/staples when credentials exist; Windows `.exe` remains unsigned. Targets are macOS 12+, Ubuntu 22.04+ / 24.04+ (amd64), and Windows 11.

## Generated / Artifacts
- Do not hand-edit or commit generated/build outputs: `app/frontend/wailsjs`, `app/frontend/dist`, `app/build/bin`, `app/dist`, `node_modules`, `app/frontend/package.json.md5`, `app/build/windows/installer/wails_tools.nsh`.
- Wails build/dev may regenerate ignored bindings/assets; review diffs before committing.

## Remotes / PR Targets
- `origin` = SweetSophia/csv-editor (user's fork) — this is where PRs targeting this repo should be opened.
- `upstream` = nlink-jp/csv-editor (original repo) — read-only, do NOT create PRs against it.
- When creating PRs, always use `--base main` against `origin`, never against `upstream`.

## Testing Notes
- Go tests are table-driven in `app/internal`; run focused packages for small changes and `cd app && make test` before broader backend changes.
- Docs mention Vitest/RTL, but there are currently no frontend test deps/scripts; do not claim frontend tests are runnable until package scripts exist.
- For docs-only changes, inspect the rendered file and `git diff -- AGENTS.md`; no heavy build is needed.
