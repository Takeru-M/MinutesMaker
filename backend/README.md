# Backend Structure

このディレクトリは FastAPI の一般的なレイヤード構成に整理しています。

- `app/main.py`: アプリ起動エントリポイント
- `app/api/`: ルーター定義（バージョニング含む）
- `app/core/`: 設定・例外・ロギングなど横断関心
- `app/db/`: DB 接続・セッション・メタデータ集約
- `app/models/`: ORM / SQLModel モデル
- `app/schemas/`: API 入出力スキーマ
- `app/crud/`: DB 操作
- `app/services/`: ビジネスロジック
- `app/utils/`: 補助関数
- `alembic/`, `alembic.ini`: マイグレーション
- `tests/`: テスト
