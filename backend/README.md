# Backend (FastAPI)

MinutesMaker のバックエンド API サーバー。FastAPI を使用した高速で型安全な Python ベースの API です。

## 概要

このバックエンド API は、フロントエンドアプリケーションや外部クライアントに対して RESTful API を提供します。ユーザー認証、会議・議題・議事録の CRUD 操作、通知管理、ナレッジベース管理、ファイルストレージ管理、および RAG（Retrieval Augmented Generation）機能を含みます。SQLModel による型安全なデータベース操作と Alembic によるスキーマバージョン管理を採用しています。

## ディレクトリ構成

FastAPI の一般的なレイヤード構成に整理しています。

```
app/                      # アプリケーションコード
├── main.py               # FastAPI アプリケーション起動エントリポイント
├── api/                  # ルーター定義
│   ├── api.py            # 統合ルーター
│   └── v1/               # API v1 ルーター
│       ├── endpoints/    # 各エンドポイント実装
│       │   ├── admin.py
│       │   ├── agenda.py
│       │   ├── auth.py
│       │   ├── content.py
│       │   ├── guide.py
│       │   ├── meetings.py
│       │   ├── minutes.py
│       │   ├── notice.py
│       │   ├── organizations.py
│       │   ├── repository.py
│       │   ├── search.py
│       │   └── users.py
│       └── __init__.py
├── core/                 # 設定・例外・ロギング（横断関心事）
│   ├── config.py         # アプリケーション設定
│   ├── exceptions.py     # カスタム例外とハンドラー
│   ├── logging.py        # ログ設定
│   └── security.py       # セキュリティ（JWT など）
├── db/                   # データベース関連
│   ├── init_db.py        # DB 初期化
│   ├── session.py        # DB セッション管理
│   └── metadata.py       # SQLModel メタデータ集約
├── models/               # ORM / SQLModel モデル
│   ├── user.py           # ユーザーモデル
│   ├── organization.py   # 組織モデル
│   ├── role.py           # ロール定義
│   ├── meeting.py        # 会議モデル
│   ├── agenda.py         # 議題モデル
│   ├── agenda_relation.py # 議題関連モデル
│   ├── minutes.py        # 議事録モデル
│   ├── notice.py         # 通知モデル
│   ├── content.py        # コンテンツ（ガイド・リポジトリ）モデル
│   ├── meeting_knowledge.py # ナレッジベースモデル
│   └── audit_log.py      # 監査ログモデル
├── schemas/              # API 入出力スキーマ（Pydantic）
│   ├── user.py
│   ├── meeting.py
│   ├── minutes.py
│   ├── pagination.py     # ページネーション定義
│   └── ... 他各機能
├── crud/                 # CRUD 操作
│   ├── user.py           # ユーザー CRUD
│   ├── meeting.py        # 会議 CRUD
│   ├── minutes.py        # 議事録 CRUD
│   └── ... 他各機能
├── services/             # ビジネスロジック層
│   ├── meeting_access.py # 会議アクセス権限検証
│   ├── s3_storage.py     # S3 ファイルストレージ
│   └── rag/              # RAG（言語モデル連携）
│       ├── embeddings.py # ベクトル埋め込み
│       ├── retrieval.py  # 検索実装
│       └── generation.py # テキスト生成
├── utils/                # 補助関数
│   ├── validators.py
│   ├── formatters.py
│   └── helpers.py
├── __init__.py
└── data/                 # 初期化データなど

alembic/                  # データベースマイグレーション
├── env.py                # Alembic 環境設定
├── script.py.mako        # マイグレーション生成テンプレート
├── versions/             # マイグレーション履歴
│   ├── 001_create_users_table.py
│   ├── 002_expand_domain_schema.py
│   ├── ... 他マイグレーション
│   └── 013_add_agenda_attachments.py
└── README

alembic.ini               # Alembic 基本設定
requirements.txt          # Python 依存パッケージ
.env                      # 環境変数（ローカル開発用）

tests/                    # テスト
├── test_health.py
├── test_minutes_mutation_window.py
└── ... 他テスト

docs/                     # ドキュメント
└── db-structure-refactor-tasks.md
```

## 主な機能

### ユーザー認証と権限管理

JWT（JSON Web Token）ベースの認証を実装。ユーザーはログイン時にトークンを取得し、API リクエストの Authorization ヘッダーに含めて認証を行います。複数組織対応により、ユーザーは異なる組織に属することが可能。role（管理者、一般ユーザー等）による権限制御もサポートしています。

### 会議スケジュール管理

会議の日時、参加者、場所などを管理。meetings テーブルで会議情報を保持。meeting_participants テーブル（またはリレーション）で参加者情報を管理します。meeting_access.py により、ユーザーの会議アクセス権限が検証されます。

### 議題管理

agenda テーブルで会議に対する議題を管理。agenda_relation テーブルで議題間の依存関係を管理。agenda が meeting に紐付けられることで、会議前の議題設定が実現されます。

### 議事録作成・管理

minutes テーブルで議事録を保持。議事録には会議内容の要約、действия items、参加者ノートなどが含まれます。minutes_mutation_window により、議事録編集可能なウィンドウが制限。PDF 出力機能も提供。

### ファイルストレージ管理（S3）

s3_storage.py により、AWS S3 へのファイルアップロード・ダウンロードを管理。議事録や参考資料の PDF、議題・通知の添付ファイルなどが保存されます。

### RAG（Retrieval Augmented Generation）機能

rag/ 以下の実装により、言語モデル（OpenAI API 等）と Qdrant ベクトルデータベースを組み合わせた知識検索・回答生成を実現。既存の議事録やリポジトリから関連情報を取得し、LLM により自動回答を生成。

### 検索機能

search エンドポイントにより、議事録、ガイド、リポジトリなどのコンテンツを全文検索可能。RAG 機能と連携して関連性の高い結果を提供。

### 通知管理

notice テーブルで通知を管理。会議招待、議事録完成、アクションアイテム割り当てなど、各種イベントに対して通知を生成・配信。

### コンテンツ管理（ガイド・リポジトリ）

content テーブルまたは guide、repository テーブルにより、ナレッジベースコンテンツを管理。content_attachments テーブルで添付ファイルを関連付け可能です。

## 環境変数

`.env` ファイルをプロジェクトルートに作成し、以下を設定。

```env
# データベース
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/minutesmaker
DB_USER=user
DB_PASSWORD=password
DB_DATABASE=minutesmaker

# セキュリティ
SECRET_KEY=your-super-secret-key-keep-it-safe
ALGORITHM=HS256

# JWT
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-northeast-1
S3_BUCKET_NAME=your-bucket-name

# OpenAI（RAG 機能用）
OPENAI_API_KEY=your-openai-api-key

# Qdrant(ベクトルDB)
QDRANT_URL=http://localhost:6333

# アプリケーション
APP_NAME=MinutesMaker
APP_ENV=development
```

## インストール・実行

### 前提条件

- Python 3.10 以上
- pip
- MySQL 8.0 以上

### セットアップ（ローカル開発）

```bash
# リポジトリのクローン後、backend ディレクトリに移動
cd backend

# 仮想環境の作成
python -m venv venv

# 仮想環境の有効化
source venv/bin/activate  # macOS/Linux
# または
venv\Scripts\activate     # Windows

# 依存パッケージのインストール
pip install -r requirements.txt

# データベースマイグレーション
alembic upgrade head

# 開発サーバー起動
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API ドキュメント（Swagger UI）は http://localhost:8000/api/docs でアクセス可能。

### Docker での実行

```bash
# ルートディレクトリから
docker-compose up -d backend
```

### 依存パッケージ

主な依存パッケージ。詳細は `requirements.txt` を参照。

- **fastapi**: Web フレームワーク
- **uvicorn**: ASGI サーバー
- **sqlmodel**: ORM（SQLAlchemy + Pydantic）
- **alembic**: マイグレーション管理
- **pydantic**: スキーマ検証
- **python-jose, passlib, bcrypt**: 認証・セキュリティ
- **boto3**: AWS S3 連携
- **httpx**: HTTP クライアント
- **langchain, langchain-openai, qdrant-client**: RAG 機能
- **openai**: OpenAI API 連携
- **PyPDF2, reportlab**: PDF 処理

## データベーススキーマ

### 主要テーブル

**users テーブル**

- user_id, username, email, hashed_password, created_at, updated_at

**organizations テーブル**

- organization_id, name, description, created_at, updated_at

**organization_memberships テーブル**

- membership_id, user_id, organization_id, role, created_at

**meetings テーブル**

- meeting_id, organization_id, title, description, scheduled_at, location, created_by, created_at, updated_at

**agendas テーブル**

- agenda_id, meeting_id, title, description, order, created_at, updated_at

**minutes テーブル**

- minutes_id, meeting_id, content, summary, created_by, published_at, created_at, updated_at

**notices テーブル**

- notice_id, title, content, meeting_id, created_by, created_at, updated_at

**contents テーブル**

- content_id, type（guide/repository）, title, body, attachment_ids, created_by, created_at, updated_at

マイグレーション履歴は `alembic/versions/` を参照。

## API エンドポイント

各機能のエンドポイント一覧。詳細は `http://localhost:8000/api/docs` を参照。

- `/api/v1/auth/`: 認証関連
- `/api/v1/users/`: ユーザー管理
- `/api/v1/organizations/`: 組織管理
- `/api/v1/meetings/`: 会議管理
- `/api/v1/agendas/`: 議題管理
- `/api/v1/minutes/`: 議事録管理
- `/api/v1/notices/`: 通知管理
- `/api/v1/guide/`: ガイド管理
- `/api/v1/repository/`: リポジトリ管理
- `/api/v1/search/`: 検索API
- `/api/v1/admin/`: 管理者機能

## テスト

```bash
# テスト実行
pytest

# 特定のテストファイル実行
pytest tests/test_health.py
```

## ベストプラクティス

- API エンドポイントは `api/v1/` 配下に実装
- ビジネスロジックは `services/` に分離
- データベース操作は `crud/` に集約
- 入出力スキーマは Pydantic で定義
- 権限チェックは `services/meeting_access.py` などで一元管理
- 環境変数は `core/config.py` で取得・検証

## トラブルシューティング

### データベース接続エラー

`DATABASE_URL` が正しいか確認。MySQL サーバーが起動しているか確認。

```bash
# ローカル MySQL 起動例
mysql -u user -p
```

### マイグレーションエラー

```bash
# 現在のマイグレーション状態確認
alembic current

# 特定のマイグレーションにロールバック
alembic downgrade REVISION_ID
```

### S3 アップロードエラー

AWS 認証情報、バケット名、リージョンが `.env` に正しく設定されているか確認。

### RAG 機能エラー

Qdrant サーバーが起動しているか、OpenAI API キーが有効か確認。

## その他

詳細はルートディレクトリの README を参照。
