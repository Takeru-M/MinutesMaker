# MinutesMaker テスト戦略ガイド

## 📊 全体構成

### バックエンド（Python/FastAPI）
- **テストフレームワーク**: pytest
- **現状**: 基本的なテスト構造が存在（conftest.py, test_qa_agent.py, test_health.py）
- **カバレッジ対象**: API、サービス層、CRUD、ユーティリティ

### フロントエンド（Next.js/TypeScript）
- **テストフレームワーク**: Jest または Vitest（要追加）
- **現状**: テスト環境なし
- **カバレッジ対象**: コンポーネント、hooks、ユーティリティ

---

## 🧪 バックエンド テスト戦略

### 層別テスト構成

#### 1. **API層テスト** (`backend/tests/test_api/`)

**対象エンドポイント:**
- `/api/v1/health` - ヘルスチェック
- `/api/v1/auth/*` - 認証・認可
- `/api/v1/meetings/*` - ミーティング CRUD
- `/api/v1/meeting_qa/*` - QA エージェント
- `/api/v1/assistant/*` - アシスタント
- `/api/v1/minutes/*` - 議事録

**テストの書き方:**
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestMeetingsAPI:
    def test_list_meetings_success(self, mock_session):
        """正常系：ミーティング一覧取得"""
        response = client.get("/api/v1/meetings")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
```

#### 2. **サービス層テスト** (`backend/tests/test_services/`)

**対象:**
- `app/services/rag/` - RAG エージェント
- `app/services/meeting_access.py` - アクセス制御
- `app/services/s3_storage.py` - S3 操作

#### 3. **CRUD層テスト** (`backend/tests/test_crud/`)

**対象:**
- `app/crud/meetings.py`
- `app/crud/minutes.py`
- `app/crud/users.py`

#### 4. **ユーティリティテスト** (`backend/tests/test_utils/`)

---

## 🎨 フロントエンド テスト戦略

### セットアップ手順

#### 1. Jest をインストール
```bash
cd frontend
npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

### テスト対象

#### 1. **コンポーネント テスト** (`frontend/__tests__/components/`)
- `components/layout/` - Header, Footer
- `components/providers/` - AuthBootstrap, ReduxProvider
- `components/guards/` - PermissionGuard

#### 2. **Hooks テスト** (`frontend/__tests__/hooks/`)
- `hooks/use-mounted.ts`
- `hooks/use-org-aware-fetch.ts`
- `hooks/use-permissions.ts`

#### 3. **ユーティリティ テスト** (`frontend/__tests__/lib/`)
- `lib/api-client.ts`
- `lib/permissions.ts`
- `lib/date-formatter.ts`

---

## 🚀 実装優先度

### 1. **高優先度**
- [ ] API エンドポイント (meetings, meeting_qa)
- [ ] RAG サービス (質問分類、検索)
- [ ] React hooks

### 2. **中優先度**
- [ ] CRUD 層
- [ ] コンポーネント
- [ ] ユーティリティ関数
