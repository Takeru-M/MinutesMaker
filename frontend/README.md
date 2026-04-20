# Frontend (Next.js)

MinutesMaker のフロントエンドアプリケーション。Next.js (App Router) を使用した React ベースの UI です。

## 概要

このフロントエンドアプリケーションは、ユーザーが会議管理、議事録作成、ナレッジベース検索などを行うためのインターフェースを提供します。TypeScript で完全に型安全に実装され、React Redux による状態管理、i18next による多言語対応、Tailwind CSS によるレスポンシブデザインを採用しています。

## ディレクトリ構成

一般的な Next.js (App Router) 開発で使いやすい構成に整理しています。

```
app/                      # ルーティング、レイアウト、API Route
├── (auth)/               # 認証関連ページ
├── admin/                # 管理画面
├── agenda/               # 議題管理
├── api/                  # API エンドポイント
├── guide/                # ガイドページ
├── meeting-schedule/     # 会議スケジュール
├── minutes/              # 議事録
├── notice/               # 通知管理
├── orgs/                 # 組織管理
├── repository/           # リポジトリ
├── search/               # 検索機能
├── layout.tsx            # ルートレイアウト
├── page.tsx              # ホームページ
└── globals.css           # グローバルスタイル

components/               # 再利用可能な UI コンポーネント
├── guards/               # ルートガード、権限チェック
├── layout/               # ヘッダー、フッター、サイドバーなど
├── providers/            # React Context Provider
└── ui/                   # ボタン、フォーム、モーダルなど汎用コンポーネント

features/                 # 機能単位の UI ロジック
├── admin/                # 管理画面の機能
├── agenda/               # 議題管理の機能
├── auth/                 # 認証・ログイン機能
├── content-list/         # コンテンツリスト表示
├── guide/                # ガイド表示機能
├── home/                 # ホームページ機能
├── i18n/                 # 多言語設定
├── meeting-schedule/     # 会議スケジュール管理
├── minutes/              # 議事録作成・表示
├── notice/               # 通知機能
├── repository/           # リポジトリ機能
├── search/               # 検索機能
└── theme/                # テーマ管理（ライト・ダーク）

hooks/                    # カスタムフック
├── use-current-org.ts    # 現在の組織情報を取得
├── use-mounted.ts        # マウント状態判定
├── use-org-aware-fetch.ts # 組織対応の API フェッチ
└── use-permissions.ts    # ユーザー権限チェック

lib/                      # 汎用ユーティリティ
├── api-client.ts         # API クライアント実装
├── api-types.ts          # API レスポンス型定義
├── api-types-content.ts  # コンテンツ関連の型定義
├── date-formatter.ts     # 日付フォーマット
├── env.ts                # 環境変数取得
├── minutes-window.ts     # 議事録編集ウィンドウ管理
├── permissions.ts        # 権限判定ユーティリティ
└── shims/                # ポリフィル

styles/                   # 追加CSS、テーマ
constants/                # 定数定義
types/                    # 型定義（グローバル）
store/                    # Redux ストア
├── hooks.ts              # Redux フック
├── slices/               # Redux スライス（状態管理）
└── selectors/            # Redux セレクター

public/                   # 静的アセット
└── pdf.worker.min.js     # PDF.js ワーカースクリプト

scripts/                  # ビルドスクリプト
└── copy-pdf-worker.js    # PDF.js ワーカーのコピー

tests/                    # テストファイル
```

## 主な機能

### 認証・権限管理

JWT トークンベースの認証を実装。ユーザーログイン時に入手したトークンは、後続の API リクエストに含められます。middleware.ts により、認証が必要なルートへのアクセスが制御されます。複数組織対応により、ユーザーが属する組織を切り替えてアクセス可能です。

### テーマシステム

ライトモード・ダーク モードの二つのテーマをサポート。選択したテーマは localStorage に保存され、ページリロード時に復元されます。pre-hydration スクリプトにより、初期表示時のちらつきを防ぎます。

### 多言語対応

i18next を使用した国際化対応。日本語、英語などの複数言語でアプリケーションを利用可能です。言語設定はヘッダーのメニューから切り替え可能です。

### 状態管理

Redux による集中型状態管理を採用。hooks.ts と selectors/ により、コンポーネント内での簡潔な状態アクセスが実現されます。

### PDF 処理

react-pdf と pdfjs-dist を使用して、ブラウザ内で PDF ファイルを表示・処理します。議事録の PDF 出力やプレビュー機能に利用されます。

## 開発

### インストール

```bash
cd frontend
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

### ビルド

```bash
npm run build
npm start
```

### リント

```bash
npm run lint
```

## Docker での実行

```bash
docker-compose up -d frontend
```

開発サーバーは自動的に起動します。ホットリロード対応。

## 環境変数

`.env.local` ファイルをフロントエンドルートに作成し、以下を設定。

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

`NEXT_PUBLIC_` プレフィックスは、これらの変数がブラウザに公開されることを示します。

## 依存関係

主な依存パッケージ。

- **next**: フレームワーク
- **react, react-dom**: UI ライブラリ
- **typescript**: 型チェック
- **tailwindcss**: スタイリング
- **redux, react-redux**: 状態管理
- **react-pdf, pdfjs-dist**: PDF 処理
- **i18next, react-i18next**: 国際化

詳細は `package.json` を参照。

## ベストプラクティス

- コンポーネントは機能ごとに `features/` に分類。
- 再利用可能な UI は `components/` に配置。
- API 通信ロジックは `hooks/` または `lib/` へ分離。
- 型定義は可能な限り TypeScript で行う。
- 環境変数は `lib/env.ts` で一元管理。

## トラブルシューティング

### PDF コンポーネントが表示されない

`pdf.worker.min.js` が正しく配置されていることを確認。`scripts/copy-pdf-worker.js` により、ビルド時に自動コピーされます。

### 言語が切り替わらない

localStorage の `mm-lang` キーを確認。キャッシュをクリアして再度試してください。

### API 通信エラー

`NEXT_PUBLIC_API_BASE_URL` が正しく設定されていることを確認。バックエンド が起動しているか確認。

## その他

詳細はルートディレクトリの README を参照。
