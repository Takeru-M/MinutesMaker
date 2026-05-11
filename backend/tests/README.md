# QA エージェント テスト実行ガイド

テストコードが `backend/tests/test_qa_agent.py` に実装されました。

## クイックスタート

### 1. 環境準備（初回のみ）

```bash
cd backend

# 開発用依存パッケージのインストール
pip install -r requirements-dev.txt
```

### 2. テスト実行

```bash
# 全テストを実行
pytest tests/test_qa_agent.py -v

# 特定クラスのテストのみ実行
pytest tests/test_qa_agent.py::TestClassifyNode -v

# 特定のテストメソッドを実行
pytest tests/test_qa_agent.py::TestClassifyNode::test_classify_node_basic -v

# カバレッジレポート付きで実行
pytest tests/test_qa_agent.py --cov=app.services.rag.graph --cov-report=html

# 詳細表示
pytest tests/test_qa_agent.py -vv --tb=long
```

## テスト構成

### 実装済みテストクラス

| クラス                    | ノード                  | テスト数 | 説明                                       |
| ------------------------- | ----------------------- | -------- | ------------------------------------------ |
| `TestClassifyNode`        | `_classify_node`        | 2        | 質問の分類（意図・スコープ）               |
| `TestRetrieveNode`        | `_retrieve_node`        | 2        | ベクトル検索（インテント別制限・キー検証） |
| `TestRerankerNode`        | `_rerank_node`          | 2        | リランク・引用構築                         |
| `TestShouldExpandScope`   | `_should_expand_scope`  | 4        | スコープ拡張判定（全4分岐）                |
| `TestAnswerNode`          | `_answer_node`          | 1        | 回答生成                                   |
| `TestFallbackAnswer`      | `_fallback_answer`      | 2        | フォールバック処理                         |
| `TestAnswerQuestionGraph` | `answer_question_graph` | 3        | 統合フロー                                 |

**合計: 16 テストケース**

### ファイル構成

```
backend/
├── requirements-dev.txt          # テスト用依存パッケージ（新規）
├── tests/
│   ├── conftest.py               # Pytest 設定・共通 fixture（新規）
│   ├── test_qa_agent.py          # QA エージェント テスト（新規）
│   ├── test_health.py            # 既存: ヘルスチェック
│   └── test_minutes_mutation_window.py  # 既存: 議事録ウィンドウ
└── app/
    └── services/
        └── rag/
            └── graph.py          # テスト対象: QA エージェント
```

## テスト設計の特徴

### モック戦略

外部依存性（API、DB、LangGraph）をモック化して**単体テストを独立実行**：

```python
@patch("app.services.rag.qa.classify_question")
@patch("app.services.rag.graph.get_qdrant_client")
def test_example(self, mock_qdrant, mock_classify):
    mock_classify.return_value = ("lookup", "global")
    # ... テスト実装
```

### テスト範囲

- ✅ ノード個別処理
- ✅ エッジ・条件分岐
- ✅ フォールバック処理
- ✅ エラーハンドリング
- ⏳ 統合テスト（別ファイルで実装推奨）
- ⏳ E2E テスト（本物の DB/キャッシュ使用）

## 既知の制限事項と拡張予定

### 現在のテストでカバーしていない項目

1. **統合テスト（Integration）**
   - 複数ノードが連携するシナリオ
   - 実際のグラフ実行フロー

2. **ワーカータスク** (`app/workers/tasks.py`)
   - `run_assistant_qa_job`
   - `run_meeting_ingest_job`
   - `run_global_ingest_job`

3. **エッジケース**
   - 空の検索結果
   - 言語混在質問
   - 特殊文字・長い質問

4. **パフォーマンス**
   - ノード処理時間計測
   - キャッシュヒット率

### 推奨される拡張

次のステップで統合テストを実装：

```bash
# backend/tests/test_qa_agent_integration.py を作成
pytest tests/test_qa_agent_integration.py -v -m integration
```

## トラブルシューティング

### エラー: `ModuleNotFoundError: No module named 'pytest'`

```bash
# 解決方法
pip install -r requirements-dev.txt
```

### エラー: `ImportError: cannot import name 'classify_question'`

```bash
# 確認方法
python -c "from app.services.rag import qa; print(dir(qa))"
```

### テストが見つからない

```bash
# pytest の収集状況を確認
pytest tests/test_qa_agent.py --collect-only
```

## CI/CD への統合例

### GitHub Actions

```yaml
name: Run QA Agent Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: "3.13"
      - run: pip install -r backend/requirements-dev.txt
      - run: pytest backend/tests/test_qa_agent.py -v --cov
```

## 参考資料

- **プロジェクト**: [MinutesMaker](../README.md)
- **テスト戦略**: [TEST_STRATEGY.md](../TEST_STRATEGY.md)
- **実装ファイル**: `backend/app/services/rag/graph.py`
- **Pytest**: https://docs.pytest.org/
- **unittest.mock**: https://docs.python.org/3/library/unittest.mock.html
