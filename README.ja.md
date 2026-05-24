# csv-editor

macOS / Windows / Linux (Ubuntu) 対応の CSV/TSV ビューワ＆エディタ GUI。

[Wails](https://wails.io) (Go + React/TypeScript) で実装。メンテが止まり
ARM64 専用 macOS で動作不能になる
[TableTool](https://github.com/jakob/TableTool) を置き換える目的で開発。
日本語エンコーディング (UTF-8 / Shift_JIS / CP932)、行・列単位のコピー操作、
TSV ペーストの複数セル展開を正しく処理する。

## 機能

### ファイル操作
- 読込時に**エンコーディング自動判定**。**UTF-8** (BOM 有/無)、**Shift_JIS**、
  **CP932** (日本語 Windows 標準) に対応。
- **CSV / TSV** をネイティブに RFC 4180 クォートで解釈。
- **新規作成 / 開く / 保存 / 名前を付けて保存**。書き出し時にエンコーディングと
  改行コード (LF / CRLF) を選択可能。
- **ドラッグ & ドロップ**でウィンドウに CSV/TSV を投げ込んで開ける。
- **最近使ったファイル** サブメニュー (最大 10 件、OS 標準設定ディレクトリに永続化)。
- **New Window** (⇧⌘N) で別の csv-editor インスタンスを起動し、複数ファイルを
  並行編集。

### 編集
- **IME 安全な Enter** — 日本語入力の確定キーで誤ってセルが確定しない。
  **Alt+Enter** でセル内改行 (RFC 4180 クォート内改行を編集可能)。
- **範囲選択**: マウスドラッグ、Shift+クリック、Shift+矢印、Shift+Cmd+矢印
  (端までジャンプ拡張)、Cmd+A で全選択。
- **TSV クリップボード**を正しく扱う:
  - 範囲 / 行 / 列を **コピー** → タブ区切り、Excel への貼り付け互換。
  - **単一セル**への TSV ペースト → 自動的に複数セルへ展開。
  - **形状不一致** や **テーブル境界を超える**ペーストは確認ダイアログ。
- **Undo / Redo** (⌘Z / ⇧⌘Z / ⌘Y) — セル編集、行・列の挿入/削除/移動、
  ペーストを1ステップでまとめて取り消し。
- **行・列操作** (行番号 / 列ヘッダの右クリック):
  上/下/左/右に挿入、複製、移動 (Alt+矢印)、削除。
- **ヘッダ行編集** — Header=On のとき列ヘッダをダブルクリックで列名変更。
- **Cut / Copy / Paste / Clear contents** をセルの右クリックメニューから。

### 生産性
- **仮想スクロール** で数十万行を扱う。
- **検索 / 置換** (⌘F / ⌘H): インクリメンタル検索、件数表示、大小区別 / セル全体一致
  / 正規表現の切替、Prev/Next、1件ずつ置換 / 一括置換。
- **ソート** (列ヘッダ右クリック → Sort ascending / descending)。複数列選択で
  multi-key ソート。数値 vs 文字列は自動判別。
- **列幅**: ヘッダ右端をドラッグでリサイズ、ダブルクリックまたは右クリック
  → Auto-fit で全データから最適幅を算出。
- **数値列の自動右寄せ** (表示のみ — 値は文字列のまま)。

### 見た目
- **ネイティブタイトルバー**に開いているファイル名を表示。
- **OS のダーク / ライトモード**に自動追従。
- **ネイティブダイアログ** (ファイル選択、ペースト確認)。
- **ウィンドウの位置とサイズ**を次回起動時に復元。

## キーボードショートカット

| 操作 | macOS | Windows/Linux |
|---|---|---|
| 新規 / 開く / 保存 / 名前を付けて保存 | ⌘N / ⌘O / ⌘S / ⇧⌘S | Ctrl+N / Ctrl+O / Ctrl+S / Ctrl+Shift+S |
| 新規ウィンドウ / ウィンドウを閉じる | ⇧⌘N / ⌘W | Ctrl+Shift+N / Ctrl+W |
| 検索 / 検索と置換 | ⌘F / ⌘H | Ctrl+F / Ctrl+H |
| 次 / 前のマッチ | ⌘G / ⇧⌘G | Ctrl+G / Ctrl+Shift+G (F3 / Shift+F3 も可) |
| Undo / Redo | ⌘Z / ⇧⌘Z | Ctrl+Z / Ctrl+Shift+Z (Ctrl+Y も可) |
| カット / コピー / ペースト | ⌘X / ⌘C / ⌘V | Ctrl+X / Ctrl+C / Ctrl+V |
| 全選択 | ⌘A | Ctrl+A |
| 選択セル編集 | Enter または F2 | Enter または F2 |
| セル内改行 (編集中) | Alt+Enter | Alt+Enter |
| 選択移動 | ↑↓←→ / Home / End / PgUp / PgDn | 同左 |
| 選択範囲拡張 | Shift+矢印 / Shift+Cmd+矢印 | Shift+矢印 / Shift+Ctrl+矢印 |
| 選択行/列の移動 | Alt+↑↓←→ | Alt+矢印 |
| セル間 Tab 移動 (編集確定時) | Tab / Shift+Tab | 同左 |

## 対象外

csv-editor は **表計算ソフトではない**。以下は実装しない:

- 数式 / 関数
- 複数シート / ワークブック
- グラフ
- xlsx / ods ネイティブ読み書き
- マクロ / スクリプト
- フィルタ / フリーズペイン (RFP Discussion Log §9 — 検索＋ソートで代替可能)
- ファイルごとの列幅永続化 (セッション内のみ)

これらが必要なら Excel / Numbers / Google Sheets / LibreOffice Calc を使用。

## 要件

- **macOS 12 以降** (Apple Silicon 推奨。Intel は動くが優先対象外)
- **Windows 11** (Edge WebView2 同梱。Windows 10 は対象外)
- **Ubuntu 24.04 LTS** / Linux (Wails 用の GTK 3 と WebKitGTK 4.1 開発
  ライブラリが必要)
- **ソースビルド**: Go 1.25+、Node.js 20+、[Wails v2.12](https://wails.io)

## インストール

GitHub Releases でバイナリを配布。

- **macOS**: `.app` は **Apple Developer ID 署名済 + Apple notarize 済**
  (Hardened Runtime + ticket staple)。zip を展開して `csv-editor.app`
  を任意の場所に配置すれば、Gatekeeper ダイアログなしで起動、
  オフラインでも動作します。
- **Windows**: `.exe` は現状**未署名**。初回起動時に SmartScreen が
  「PC を保護しました」と表示するので「詳細情報」→「実行」を
  クリック。Authenticode 署名は今後の対応予定。
- **Linux/Ubuntu**: `csv-editor` 実行ファイルを含む `.tar.gz` を配布。
  デスクトップ統合用 metadata は `app/build/linux/` に保持していますが、
  現時点では `.deb` / AppImage / Snap / Flatpak は生成しません。

## ソースからのビルド

```bash
cd app
make build     # 本番ビルド → dist/csv-editor.app / .exe / Linux 実行ファイル
make package   # 配布物 → .zip (macOS/Windows) または .tar.gz (Linux)
make dev       # ライブリロード開発
make test      # 単体テスト
```

Ubuntu 24.04 では、Wails の Linux prerequisites として GTK 3 と WebKitGTK
4.1 の開発パッケージをインストールしてください。Makefile は Linux ビルドで
`-tags webkit2_41` を既定指定します。Wails を直接実行する場合は
`wails build -tags webkit2_41` を使用してください。

## ドキュメント

- [Changelog](CHANGELOG.md)
- [RFP — 仕様書 (日本語)](docs/ja/csv-editor-rfp.ja.md) ([English](docs/en/csv-editor-rfp.md))

## ライセンス

[MIT](LICENSE) © 2026 nlink-jp
