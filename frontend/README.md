# Frontend (Next.js)

一般的な Next.js (App Router) 開発で使いやすい構成に整理しています。

## ディレクトリ構成

- `app/`: ルーティング、レイアウト、API Route
- `components/`: 再利用 UI コンポーネント
- `features/`: 機能単位の UI / ロジック
- `constants/`: 定数定義
- `types/`: 型定義
- `lib/`: 汎用ユーティリティ（環境変数など）
- `hooks/`: カスタムフック
- `styles/`: 追加スタイル
- `tests/`: テスト

## 開発

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開いて確認してください。
