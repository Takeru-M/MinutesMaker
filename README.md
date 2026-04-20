# MinutesMaker

会議の議事録作成・管理を効率化するプロジェクトです。フロントエンドとバックエンドから構成されています。

## 概要

MinutesMaker は、組織内の会議管理機能を提供するアプリケーションです。ユーザー認証、会議スケジュール管理、議題設定、議事録作成、通知管理、およびナレッジベース機能を含みます。多言語対応により、複数の言語でのサポートが可能です。

## プロジェクト構成

- `frontend/`: Next.js によるフロントエンドアプリケーション
- `backend/`: FastAPI によるバックエンドAPI サーバー
- `Docker/`: Docker イメージの定義ファイル
- `docs/`: ドキュメント

## はじめに

### 前提条件

- Node.js 18+ および npm（フロントエンド開発用）
- Python 3.10+ および pip（バックエンド開発用）
- Docker および Docker Compose（推奨）
- MySQL 8.0 以上

### クイックスタート（Docker 使用）

```bash
# リポジトリのクローン後、カレントディレクトリで以下を実行
docker-compose up -d
```

フロントエンドは `http://localhost:3000` でアクセス可能。バックエンドAPI は `http://localhost:8000` でアクセス可能。API ドキュメントは `http://localhost:8000/api/docs` で確認可能です。

### ローカル開発

詳細な開発手順は各ディレクトリの README.md を参照してください。

- [Frontend README](./frontend/README.md)
- [Backend README](./backend/README.md)

## 主な機能

- **ユーザー認証と組織管理**: JWT ベースの認証、複数組織対応
- **会議スケジュール管理**: 会議日時と参加者管理
- **議題管理**: 会議前の議題設定と管理
- **議事録作成**: 会議中の記録、PDF 出力対応
- **通知管理**: 参加者への通知配信
- **ナレッジベース**: ガイドとリポジトリ、検索機能
- **多言語対応**: 日本語、英語などのサポート

## 技術スタック

- **フロントエンド**: Next.js, React, TypeScript, Tailwind CSS, Redux, i18n
- **バックエンド**: FastAPI, Python, SQLModel, MySQL
- **インフラ**: Docker, Docker Compose

## ディレクトリ構成（ルートレベル）

```
├── frontend/              # フロントエンドアプリケーション
├── backend/               # バックエンドAPI サーバー
├── Docker/                # Docker ビルド配置
├── docs/                  # プロジェクトドキュメント
├── docker-compose.yml     # Docker Compose 設定
└── README.md              # このファイル
```

## セットアップ

### 環境変数の設定

バックエンド用の `.env` ファイルを `backend/` ディレクトリ内に作成してください。以下は例です。

```env
DATABASE_URL=mysql+pymysql://user:password@db:3306/minutesmaker
SECRET_KEY=your-secret-key-here
```

### データベース初期化

Docker Compose を使用する場合は、起動時に自動的に初期化されます。

ローカル開発の場合は以下を実行。

```bash
cd backend
alembic upgrade head
```

## ライセンス

このプロジェクトのライセンスについては、プロジェクト管理者に確認してください。

## 参考資料

- [Frontend Development Guide](./frontend/README.md)
- [Backend Development Guide](./backend/README.md)
- [Database Structure](./backend/docs/db-structure-refactor-tasks.md)
