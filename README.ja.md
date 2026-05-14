# csv-editor

Windows / macOS 両対応の CSV/TSV ビューワ＆エディタ GUI。

[Wails](https://wails.io) (Go + React/TypeScript) で実装。メンテナンスが止まり
ARM64 専用 macOS で動作不能になる TableTool を置き換える目的で開発。
日本語エンコーディング (UTF-8 / Shift_JIS / CP932)、行・列単位のコピー操作、
TSV ペーストの複数セル展開を正しく処理する。

> **ステータス**: Phase 1 (Core) — スキャフォールド済み、ビューワは開発中。
> まだ実用には至らない。

## 機能 (予定)

- **マルチエンコーディング** — UTF-8 (BOM 有/無)、Shift_JIS、CP932 の読み書き、
  読込時自動判定
- **CSV と TSV** — どちらもネイティブ対応、RFC 4180 クォート
- **大規模ファイル** — 数十万行を仮想スクロールで扱う
- **IME 安全な編集** — 日本語入力中に誤ってセル確定されない
- **まともなクリップボード** — 行/列のコピー＆ペースト、TSV ペースト時の
  自動セル分割、形状不一致時の警告ダイアログ
- **1 ウィンドウ 1 ファイル** — 複数ファイルは複数ウィンドウで開く
- **フリーズペイン**、**インクリメンタル検索＋正規表現**、**複数キーソート**、
  **フィルタ**
- **CSV/TSV 専用** — 表計算ツールではない (数式、複数シート、グラフ、xlsx は対象外)

詳細は [docs/ja/csv-editor-rfp.ja.md](docs/ja/csv-editor-rfp.ja.md) を参照。

## 要件

- macOS 12 以降 (Apple Silicon 推奨)
- Windows 11
- ソースからのビルド: Go 1.23+、Node.js 20+、[Wails v2](https://wails.io)

## ビルド

```bash
cd app
make build     # 本番ビルド → dist/csv-editor.app (macOS) または .exe (Windows)
make dev       # ライブリロード開発
make test      # 単体テスト
```

## インストール (リリース後)

GitHub Releases でバイナリを配布。当面**未署名**のため以下の手順が必要:

- **macOS Gatekeeper**: `.app` を右クリック → 開く → 確認
- **Windows SmartScreen**: 「詳細情報」→「実行」

## ドキュメント

- [RFP (英語)](docs/en/csv-editor-rfp.md)
- [RFP (日本語)](docs/ja/csv-editor-rfp.ja.md)

## ライセンス

MIT
