# QA エージェント テスト戦略

## 概要

MinutesMaker の QA エージェント（LangGraph 実装）のテストアプローチと実装ガイド。

## テスト対象と構成

### テスト対象コンポーネント

- **グラフノード** (`app/services/rag/graph.py`)
  - `_classify_node`: 質問の意図・スコープ分類
  - `_retrieve_node`: ベクトル検索（Qdrant）
  - `_rerank_node`: 検索結果のリランク・引用構築
  - `_answer_node`: 最終回答生成
  - `_should_expand_scope`: スコープ拡張判定

- **フォールバック処理**
  - `_fallback_answer`: LangGraph 未インストール時の処理
  - スコープ自動拡張ロジック（会議スコープ → グローバルスコープ）

- **統合フロー**
  - `answer_question_graph`: エンドツーエンド実行

### テストツール

```toml
# pyproject.toml または requirements-dev.txt に追加
pytest = "^7.4"
pytest-asyncio = "^0.21"
pytest-mock = "^3.11"
```

## テストの分類と実行

### 1. 単位テスト（Unit Tests）

**ファイル**: `backend/tests/test_qa_agent.py`

各ノードを個別にテスト。外部依存性（Qdrant、OpenAI、DB）はモック化。

```bash
# 特定クラスのテストを実行
pytest backend/tests/test_qa_agent.py::TestClassifyNode -v

# 特定のテストメソッドを実行
pytest backend/tests/test_qa_agent.py::TestClassifyNode::test_classify_node_basic -v

# 全テストを実行
pytest backend/tests/test_qa_agent.py -v
```

#### テスト対象

| テストクラス              | 対象               | テストケース                               |
| ------------------------- | ------------------ | ------------------------------------------ |
| `TestClassifyNode`        | 意図・スコープ分類 | 基本分類、会議固有分類                     |
| `TestRetrieveNode`        | ベクトル検索       | インテント別の検索制限、API キー検証       |
| `TestRerankerNode`        | リランク・引用構築 | スコア閾値フィルタリング、欠落チャンク処理 |
| `TestShouldExpandScope`   | スコープ拡張判定   | 4つの条件分岐テスト                        |
| `TestAnswerNode`          | 回答生成           | 結果の構築と返却                           |
| `TestFallbackAnswer`      | フォールバック処理 | 基本フロー、スコープ拡張                   |
| `TestAnswerQuestionGraph` | 統合フロー         | LangGraph 使用/未使用、エラーハンドリング  |

### 2. 統合テスト（Integration Tests）

**実装例** (別ファイルで作成推奨):

```python
# backend/tests/test_qa_agent_integration.py
@pytest.mark.integration
class TestQAAgentIntegration:
    def test_qa_agent_full_flow_meeting_scoped(self, db_session, qdrant_client):
        """会議スコープの質問から回答まで."""
        pass

    def test_qa_agent_scope_expansion(self, db_session, qdrant_client):
        """スコープ拡張フローのテスト."""
        pass
```

**実行方法**:

```bash
pytest backend/tests/test_qa_agent_integration.py -v -m integration
```

### 3. ワーカータスクテスト

**実装例** (別ファイルで作成推奨):

```python
# backend/tests/test_workers.py
from app.workers.tasks import run_assistant_qa_job

@patch("app.services.rag.graph.answer_question_graph")
def test_run_assistant_qa_job(mock_graph, db_session):
    """QA ジョブの正常実行."""
    mock_result = MagicMock()
    mock_graph.return_value = mock_result

    result = run_assistant_qa_job(
        meeting_id=42,
        user_id=1,
        question="What happened?"
    )

    assert result["question"] == "What happened?"
```

## テスト実行手順

### セットアップ

1. **テスト環境準備**:

   ```bash
   cd /Users/matsushimatakeru/Engineer/Works/MinutesMaker

   # 仮想環境有効化
   source .venv/bin/activate

   # 必要なテストパッケージをインストール
   # （現在 requirements.txt に pytest が含まれていないため）
   pip install pytest pytest-mock
   ```

   または、`requirements-dev.txt` に以下を追加して管理：

   ```txt
   -r requirements.txt
   pytest==7.4.3
   pytest-mock==3.12.0
   pytest-asyncio==0.21.1
   pytest-cov==4.1.0
   ```

   インストール：

   ```bash
   pip install -r requirements-dev.txt
   ```

2. **環境変数設定** (テスト用):
   ```bash
   export OPENAI_API_KEY="test-key"  # テスト実行には実際のキーは不要
   export TESTING=true
   ```

### 実行コマンド

```bash
# 全テスト実行
pytest backend/tests/test_qa_agent.py -v

# カバレッジ付きで実行
pytest backend/tests/test_qa_agent.py --cov=app.services.rag --cov-report=html

# 特定の条件でフィルター
pytest backend/tests/test_qa_agent.py -k "classify" -v

# ストップ・ファースト（最初の失敗で停止）
pytest backend/tests/test_qa_agent.py -x

# 詳細出力
pytest backend/tests/test_qa_agent.py -vv --tb=short
```

## テスト設計の考え方

### 1. モック戦略

**外部依存性**:

- `Qdrant`: ベクトル検索クライアント
- `OpenAI API`: 分類・埋め込み処理
- `SQLModel Session`: データベース
- `LangGraph`: グラフ実行エンジン

**パッチ対象**:

```python
@patch("app.services.rag.qa.classify_question")
@patch("app.services.rag.qa._embed_question")
@patch("app.services.rag.graph.get_qdrant_client")
@patch("app.crud.meeting_knowledge.list_chunks_by_ids")
```

### 2. テスト対象のレベル分け

| レベル       | スコープ   | モック方針                             |
| ------------ | ---------- | -------------------------------------- |
| **ユニット** | 単一ノード | 外部 API/DB は全モック                 |
| **統合**     | 複数ノード | グラフ構造は実行、外部API/DBはモック   |
| **E2E**      | 全フロー   | 本物の DB/キャッシュ使用（オプション） |

### 3. エラーケースのテスト

```python
# API キー未設定
@patch.dict("app.services.rag.graph.settings.__dict__", {"openai_api_key": None})
def test_retrieve_node_no_api_key(self):
    with pytest.raises(ValueError, match="OPENAI_API_KEY"):
        graph._retrieve_node(state)

# グラフ実行失敗
def test_answer_question_graph_missing_result(self):
    with pytest.raises(ValueError, match="Failed to build answer"):
        graph.answer_question_graph(...)
```

## カバレッジ目標

| ファイル                    | ターゲット | 現在 |
| --------------------------- | ---------- | ---- |
| `app/services/rag/graph.py` | 90%        | -    |
| ノード関数                  | 100%       | -    |
| 条件分岐                    | 100%       | -    |

**カバレッジ確認**:

```bash
pytest backend/tests/test_qa_agent.py --cov=app.services.rag.graph --cov-report=term-missing
```

## トラブルシューティング

### テスト失敗時の確認項目

1. **Import エラー**

   ```bash
   # モジュールパスの確認
   python -c "from app.services.rag import graph; print(graph.__file__)"
   ```

2. **モック未適用**

   ```python
   # @patch デコレータの順序確認（下から上へ逆順で注入）
   @patch("outer")     # 3番目の引数
   @patch("middle")    # 2番目の引数
   @patch("inner")     # 1番目の引数
   def test(self, inner_mock, middle_mock, outer_mock):
       pass
   ```

3. **fixture 不足**
   ```bash
   # conftest.py を作成してセッション・設定を共有
   pytest backend/tests/conftest.py
   ```

## 推奨される追加テスト（今後の実装）

- [ ] **パフォーマンステスト**: ノード処理時間測定
- [ ] **プロンプト検証**: 分類・回答生成の実際の出力テスト
- [ ] **再現性テスト**: 同じ質問で同じ回答が返されるか
- [ ] **エッジケース**: 空のコンテキスト、言語混在、特殊文字
- [ ] **キャッシュヒット率**: RAG 検索のキャッシュ有効性

## 参考資料

- [pytest 公式ドキュメント](https://docs.pytest.org/)
- [LangGraph テスト例](https://python.langchain.com/docs/langgraph/how-tos/test-stream)
- プロジェクト: `app/services/rag/graph.py`、`app/services/rag/qa.py`
