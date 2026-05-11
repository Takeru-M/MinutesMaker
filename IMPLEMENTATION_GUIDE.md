# AI Assistant / Job Queue 実装ガイド

## 実装状況（完了）

このドキュメントは、AIエージェント（チャットベース）とジョブキュー・非同期処理の実装が完了した状態を記述しています。

### バックエンド実装

#### 1. インフラストラクチャ

- ✅ Redis：`docker-compose.yml` に `redis` サービスを追加
- ✅ ワーカプロセス：`docker-compose.yml` に `backend_worker` サービスを追加
- ✅ 環境設定：`backend/app/core/config.py` に Redis 関連設定追加

#### 2. ジョブキュー基盤

- ✅ Redis クライアント：`backend/app/core/redis_client.py`
- ✅ RQ キュー定義：`backend/app/core/job_queue.py` （qa, ingest, low の3キュー）
- ✅ ワーカエントリポイント：`backend/app/workers/rq_worker.py`

#### 3. ワーカタスク実装

- ✅ QA タスク：`backend/app/workers/tasks.py::run_meeting_qa_job()`
  - 既存の `answer_meeting_question_graph()` を呼び出し
  - 結果を Redis にキャッシュ
- ✅ Ingest タスク：`backend/app/workers/tasks.py::run_meeting_ingest_job()`
  - PDF テキスト抽出、embedding 生成、Vector DB 格納

#### 4. API エンドポイント（非同期）

- ✅ `POST /api/v1/meetings/{meeting_id}/qa/async`
  - リクエスト：`{ question, scope?, intent? }`
  - レスポンス：`{ job_id, status, job_type }` (202 Accepted)
- ✅ `GET /api/v1/qa/jobs/{job_id}`
  - ジョブステータスと結果を返却
- ✅ `POST /api/v1/meetings/{meeting_id}/qa/ingest/async`
  - Ingest ジョブをキューに投入

#### 5. キャッシュ戦略

- ✅ キャッシュクライアント：`backend/app/core/cache.py`
- ✅ キャッシュキー定義：`backend/app/core/cache_keys.py`
  - QA 結果（1時間 TTL）
  - 会議一覧（2分 TTL）
  - 最新議案（5分 TTL）
  - Embeddings（7日 TTL）

#### 6. 運用・監視

- ✅ キューメトリクスエンドポイント：`GET /api/v1/admin/operations/queues/stats`
- ✅ ワーカヘルスチェック：`GET /api/v1/admin/operations/health/workers`
- RQ Dashboard ：別途起動 `rq-dashboard` (推奨、オプション)

### フロントエンド実装

#### 1. API クライアント関数

- ✅ `enqueueMeetingQAJob()` - QA ジョブをサーバーに投入
- ✅ `getMeetingQAJobStatus()` - ジョブステータスをポーリング
- ✅ `enqueueMeetingIngestJob()` - Ingest ジョブを投入

#### 2. アシスタント機能

- ✅ チャットパネルコンポーネント：`frontend/features/assistant/components/assistant-chat-panel.tsx`
  - メッセージ表示、QA 結果（引用付き）、ローディング状態
- ✅ チャットトグルボタン：`frontend/features/assistant/components/assistant-chat-toggle.tsx`
  - ページ右下に浮動配置（小会議詳細ページ）
- ✅ ポーリングフック：`frontend/features/assistant/hooks/use-qa-job-polling.ts`
  - 1 秒から 5 秒の指数バックオフ

#### 3. 統合

- ✅ 小会議詳細ページ：`SmallMeetingDetailView` に チャットパネル・トグル統合
- ✅ 国際化メッセージ：日本語（ja.ts）・英語（en.ts）にアシスタント用テキスト追加

---

## 実行手順

### 1. 環境起動

```bash
cd /path/to/MinutesMaker

# Redis、DB、ワーカを含む全サービスを起動
docker-compose up -d

# 確認
docker-compose ps
# 以下が起動しているはず：
#   - mysql_db
#   - minutes_redis
#   - qdrant_db
#   - minutes_backend
#   - minutes_backend_worker （ワーカプロセス）
#   - minutes_frontend
```

### 2. 初期化（必要に応じて）

```bash
# DB マイグレーション（既存設定で実行されているはず）
docker-compose exec backend alembic upgrade head

# ワーカが正常に動作しているか確認
docker-compose logs minutes_backend_worker | head -20
```

### 3. フロント側動作確認

1. ブラウザで `http://localhost:3000` を開く
2. ユーザーでログイン
3. 会議スケジュール → 小規模会議詳細 を開く
4. 右下の 🤖 ボタンをクリック
5. チャットパネルが開く → 質問を入力して送信

### 4. ジョブキューの監視

```bash
# ワーカのログを見る
docker-compose logs -f minutes_backend_worker

# キューの状態を確認（API）
curl http://localhost:8000/api/v1/admin/operations/queues/stats \
  -H "Authorization: Bearer <JWT_TOKEN>"

# RQ Dashboard（オプション）
pip install rq-dashboard
rq-dashboard -u redis://localhost:6379
# http://localhost:9181 を開く
```

---

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (Next.js / React)                                  │
│  - チャットパネル (AssistantChatPanel)                      │
│  - ポーリング (useQAJobPolling)                             │
│  - API クライアント (enqueueMeetingQAJob)                   │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP POST/GET
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend API (FastAPI)                                       │
│  - POST /meetings/{id}/qa/async (enqueue)                   │
│  - GET /qa/jobs/{id} (status)                               │
└────────────┬───────────────────┬────────────────────────────┘
             │                   │
             ▼ enqueue           ▼
        ┌─────────────────────────────────┐
        │   Redis Job Queue (RQ)          │
        │  ┌─────────────────────────────┐│
        │  │ QA Queue                    ││
        │  │ - run_meeting_qa_job        ││
        │  ├─────────────────────────────┤│
        │  │ Ingest Queue                ││
        │  │ - run_meeting_ingest_job    ││
        │  └─────────────────────────────┘│
        └──────────┬────────────────────┬──┘
                   │                    │
                   ▼                    ▼
            ┌────────────────┐  ┌──────────────────┐
            │ Worker Proc 1  │  │ Worker Proc 2    │
            │  (QA)          │  │  (Ingest)        │
            │ run_meeting_qa │  │ run_meeting_     │
            │ _job           │  │ ingest_job       │
            └────────┬───────┘  └────────┬─────────┘
                     │                   │
                     ▼                   ▼
         ┌──────────────────────────────────────┐
         │ External Services                    │
         │  - OpenAI (LLM / Embeddings)        │
         │  - Qdrant (Vector DB)               │
         │  - S3 / MinIO (PDF Storage)         │
         └──────────────────────────────────────┘

         ┌──────────────────────┐
         │ Redis Cache Layer    │
         │  - QA Results (1h)   │
         │  - Embeddings (7d)   │
         │  - Meetings (2min)   │
         └──────────────────────┘
```

---

## パフォーマンス・スケーリング

### ワーカ数の目安

- **開発環境**：1 ワーカプロセス（backend_worker x1）
- **小規模本番**：2-4 ワーカプロセス（QA 担当：2個、Ingest 担当：1個）
- **中規模本番**：複数マシンに分散（各マシン 2-4 ワーカ）
- **大規模本番**：Kubernetes で水平スケール

### キャッシュ効果

- QA 結果キャッシュ（1 時間）：同一質問への即時応答
- Embedding キャッシュ（7 日）：再利用によるトークン節約
- 会議一覧キャッシュ（2 分）：ホームページなど高頻度アクセスの負荷削減

---

## トラブルシューティング

### ワーカが起動しない

```bash
# ワーカログ確認
docker-compose logs minutes_backend_worker

# よくある原因：
# 1. Redis が起動していない → docker-compose logs minutes_redis
# 2. Python 依存関係不足 → requirements.txt に rq が含まれているか確認
# 3. ワーカコマンド誤り → docker-compose.yml の backend_worker command を確認
```

### ジョブが実行されない

```bash
# キューを確認
curl http://localhost:8000/api/v1/admin/operations/queues/stats \
  -H "Authorization: Bearer <JWT_TOKEN>"

# ワーカが対応キューをリッスンしているか確認
# docker-compose.yml の RQ_QUEUES 環境変数を確認
```

### 権限エラー

```bash
# operations エンドポイントには meeting.qa.ingest 権限が必要
# ユーザーロールが org_admin 以上であることを確認
```

---

## 次のステップ（オプション）

1. **Prometheus + Grafana**：メトリクス収集とダッシュボード
2. **Dead Letter Queue (DLQ)**：失敗ジョブの手動リトライ UI
3. **WebSocket 通知**：ポーリング → リアルタイム push
4. **分散トレーシング**：OpenTelemetry で job 追跡
5. **ジョブ優先度**：緊急質問を優先処理

---

## 参考資料

- **RQ ドキュメント**：https://python-rq.org/
- **Redis ドキュメント**：https://redis.io/documentation
- **FastAPI 非同期**：https://fastapi.tiangolo.com/async-sql-databases/

---

## サポート

- 問題や質問は、プロジェクトの Issue を参照してください
- ワーカ監視の詳細は `backend/app/api/v1/endpoints/operations.py` を参照
