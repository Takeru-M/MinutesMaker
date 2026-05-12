"""Tests for QA agent graph and related functionality."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from sqlmodel import Session

from app.services.rag import graph, qa as qa_service


class TestClassifyNode:
    """Tests for question classification node."""

    @patch("app.services.rag.qa.classify_question")
    def test_classify_node_basic(self, mock_classify):
        """Test basic classification."""
        mock_classify.return_value = ("lookup", "global")

        state = {
            "question": "What are the action items?",
            "meeting_id": None,
        }

        result = graph._classify_node(state)

        assert result["resolved_intent"] == "lookup"
        assert result["resolved_scope"] == "global"
        assert result["scope_expanded"] is False
        assert "started_at" in result
        mock_classify.assert_called_once_with("What are the action items?", None)

    @patch("app.services.rag.qa.classify_question")
    def test_classify_node_meeting_specific(self, mock_classify):
        """Test classification with meeting context."""
        mock_classify.return_value = ("context", "meeting_only")

        state = {
            "question": "What happened in this meeting?",
            "meeting_id": 42,
        }

        result = graph._classify_node(state)

        assert result["resolved_intent"] == "context"
        assert result["resolved_scope"] == "meeting_only"
        mock_classify.assert_called_once_with("What happened in this meeting?", 42)


class TestRetrieveNode:
    """Tests for retrieval node."""

    @patch("app.services.rag.graph.settings")
    @patch("app.services.rag.qa._embed_question")
    @patch("app.services.rag.graph.get_qdrant_client")
    def test_retrieve_node_lookup_intent(self, mock_qdrant, mock_embed, mock_settings):
        """Test retrieval with lookup intent uses higher limit."""
        mock_settings.openai_api_key = "test-key"
        mock_settings.rag_retrieval_top_k = 5
        mock_embed.return_value = [0.1, 0.2, 0.3]
        # collection_exists must return True so the retrieval path is exercised
        mock_qdrant.return_value.collection_exists.return_value = True
        mock_points = MagicMock()
        mock_points.points = []
        mock_qdrant.return_value.query_points.return_value = mock_points

        state = {
            "question": "What is X?",
            "meeting_id": None,
            "resolved_intent": "lookup",
            "resolved_scope": "global",
        }

        result = graph._retrieve_node(state)

        assert "retrieval" in result
        assert result["retrieval"].query_vector == [0.1, 0.2, 0.3]
        assert result["retrieval"].retrieval_limit == 12  # max(5, 12)
        mock_qdrant.return_value.query_points.assert_called_once()

    @patch("app.services.rag.graph.settings")
    @patch("app.services.rag.graph.get_qdrant_client")
    def test_retrieve_node_no_api_key(self, mock_qdrant, mock_settings):
        """Test retrieval fails without API key."""
        mock_settings.openai_api_key = None
        mock_qdrant.return_value.search = MagicMock()

        state = {
            "question": "What is X?",
            "meeting_id": None,
            "resolved_intent": "lookup",
            "resolved_scope": "global",
        }

        with pytest.raises(ValueError, match="OPENAI_API_KEY"):
            graph._retrieve_node(state)


class TestRerankerNode:
    """Tests for reranking and citation building."""

    @patch("app.services.rag.graph.settings")
    @patch("app.services.rag.graph.list_chunks_by_ids")
    @patch("app.services.rag.qa._rerank_hits")
    @patch("app.services.rag.qa._build_related_sources")
    def test_rerank_node_filters_by_score(self, mock_build_related, mock_rerank, mock_list_chunks, mock_settings):
        """Test reranking filters hits by score threshold."""
        from app.services.rag.qa import Citation, ScoredHit
        from app.services.rag.graph import RetrievalState

        mock_settings.rag_score_threshold = 0.5
        mock_build_related.return_value = []

        # Mock reranked hits
        mock_hit1 = MagicMock()
        mock_hit1.payload = {"chunk_id": 1, "source_type": "minutes", "source_entity_id": 10, "chunk_index": 0}
        mock_hit1.score = 0.8

        mock_hit2 = MagicMock()
        mock_hit2.payload = {"chunk_id": 2, "source_type": "agenda", "source_entity_id": 20, "chunk_index": 1}
        mock_hit2.score = 0.3

        mock_rerank.return_value = [
            ScoredHit(hit=mock_hit1, rerank_score=0.8),
            ScoredHit(hit=mock_hit2, rerank_score=0.3),
        ]

        # Mock chunks
        mock_chunk1 = MagicMock()
        mock_chunk1.id = 1
        mock_chunk1.chunk_text = "Action item content"
        mock_list_chunks.return_value = [mock_chunk1]

        session = MagicMock(spec=Session)
        state = {
            "session": session,
            "retrieval": RetrievalState(
                search_result=[mock_hit1, mock_hit2],
                query_vector=[0.1, 0.2],
                retrieval_limit=10,
            ),
            "resolved_intent": "lookup",
        }

        result = graph._rerank_node(state)

        assert len(result["citations"]) == 1  # Only high-score hit
        assert result["citations"][0].chunk_id == 1
        assert result["citations"][0].score == 0.8

    @patch("app.services.rag.graph.settings")
    @patch("app.services.rag.graph.list_chunks_by_ids")
    @patch("app.services.rag.qa._rerank_hits")
    @patch("app.services.rag.qa._build_related_sources")
    def test_rerank_node_handles_missing_chunks(self, mock_build_related, mock_rerank, mock_list_chunks, mock_settings):
        """Test reranking handles missing chunks gracefully."""
        from app.services.rag.qa import ScoredHit
        from app.services.rag.graph import RetrievalState

        mock_settings.rag_score_threshold = 0.5
        mock_build_related.return_value = []

        mock_hit = MagicMock()
        mock_hit.payload = {"chunk_id": 999, "source_type": "minutes", "source_entity_id": 10, "chunk_index": 0}

        mock_rerank.return_value = [ScoredHit(hit=mock_hit, rerank_score=0.8)]
        mock_list_chunks.return_value = []  # No chunks found

        session = MagicMock(spec=Session)
        state = {
            "session": session,
            "retrieval": RetrievalState(
                search_result=[mock_hit],
                query_vector=[0.1, 0.2],
                retrieval_limit=10,
            ),
            "resolved_intent": "lookup",
        }

        result = graph._rerank_node(state)

        assert len(result["citations"]) == 0
        assert len(result["context_blocks"]) == 0


class TestShouldExpandScope:
    """Tests for scope expansion decision logic."""

    def test_should_expand_scope_already_expanded(self):
        """Scope already expanded, skip expansion."""
        state = {
            "scope_expanded": True,
            "resolved_scope": "meeting_only",
        }
        result = graph._should_expand_scope(state)
        assert result == "answer"

    def test_should_expand_scope_has_citations(self):
        """Found citations, proceed to answer without expansion."""
        state = {
            "scope_expanded": False,
            "citations": [MagicMock()],
            "resolved_scope": "meeting_only",
        }
        result = graph._should_expand_scope(state)
        assert result == "answer"

    def test_should_expand_scope_already_global(self):
        """Already global scope, no expansion needed."""
        state = {
            "scope_expanded": False,
            "citations": [],
            "resolved_scope": "global",
        }
        result = graph._should_expand_scope(state)
        assert result == "answer"

    def test_should_expand_scope_meeting_only_no_results(self):
        """No results in meeting scope, expand to global."""
        state = {
            "scope_expanded": False,
            "citations": [],
            "resolved_scope": "meeting_only",
        }
        result = graph._should_expand_scope(state)
        assert result == "expand"


class TestAnswerNode:
    """Tests for answer building node."""

    @patch("app.services.rag.qa.build_answer")
    def test_answer_node_builds_result(self, mock_build_answer):
        """Test answer node builds and returns result."""
        mock_result = MagicMock(spec=qa_service.AnswerResult)
        mock_result.answer = "The action items are..."
        mock_result.confidence = 0.9
        mock_result.model_name = "gpt-4"
        mock_build_answer.return_value = mock_result

        session = MagicMock(spec=Session)
        state = {
            "session": session,
            "meeting_id": 42,
            "user_id": 1,
            "question": "What are the action items?",
            "resolved_intent": "lookup",
            "resolved_scope": "global",
            "citations": [],
            "context_blocks": [],
            "related_sources": [],
            "started_at": 1000.0,
        }

        result = graph._answer_node(state)

        assert result["answer_result"] == mock_result
        mock_build_answer.assert_called_once()


class TestFallbackAnswer:
    """Tests for fallback answer path when LangGraph unavailable."""

    @patch("app.services.rag.graph.settings")
    @patch("app.services.rag.qa.build_answer")
    @patch("app.services.rag.graph.get_qdrant_client")
    @patch("app.services.rag.qa._rerank_hits")
    @patch("app.crud.meeting_knowledge.list_chunks_by_ids")
    @patch("app.services.rag.qa._embed_question")
    @patch("app.services.rag.qa.classify_question")
    @patch("app.services.rag.qa._build_related_sources")
    def test_fallback_answer_basic_flow(
        self,
        mock_build_related,
        mock_classify,
        mock_embed,
        mock_list_chunks,
        mock_rerank,
        mock_qdrant,
        mock_build_answer,
        mock_settings,
    ):
        """Test fallback answer flow when LangGraph unavailable."""
        from app.services.rag.qa import ScoredHit

        mock_settings.rag_retrieval_top_k = 5
        mock_settings.rag_score_threshold = 0.5
        mock_build_related.return_value = []

        mock_classify.return_value = ("lookup", "meeting_only")
        mock_embed.return_value = [0.1, 0.2]
        mock_hit = MagicMock()
        mock_hit.payload = {"chunk_id": 1, "source_type": "minutes", "source_entity_id": 10, "chunk_index": 0}
        mock_qdrant.return_value.search.return_value = [mock_hit]
        mock_rerank.return_value = [ScoredHit(hit=mock_hit, rerank_score=0.8)]

        mock_chunk = MagicMock()
        mock_chunk.id = 1
        mock_chunk.chunk_text = "Meeting content"
        mock_list_chunks.return_value = [mock_chunk]

        mock_result = MagicMock(spec=qa_service.AnswerResult)
        mock_build_answer.return_value = mock_result

        session = MagicMock(spec=Session)

        result = graph._fallback_answer(session, meeting_id=42, user_id=1, question="What is X?")

        assert result == mock_result
        mock_classify.assert_called_once_with("What is X?", 42)

    @patch("app.services.rag.graph.settings")
    @patch("app.services.rag.qa.build_answer")
    @patch("app.services.rag.graph.get_qdrant_client")
    @patch("app.services.rag.qa._rerank_hits")
    @patch("app.crud.meeting_knowledge.list_chunks_by_ids")
    @patch("app.services.rag.qa._embed_question")
    @patch("app.services.rag.qa.classify_question")
    @patch("app.services.rag.qa._build_related_sources")
    def test_fallback_answer_scope_expansion(
        self,
        mock_build_related,
        mock_classify,
        mock_embed,
        mock_list_chunks,
        mock_rerank,
        mock_qdrant,
        mock_build_answer,
        mock_settings,
    ):
        """Test fallback expands scope when meeting-scoped search has no results."""
        mock_settings.rag_retrieval_top_k = 5
        mock_settings.rag_score_threshold = 0.5
        mock_build_related.return_value = []

        mock_classify.return_value = ("lookup", "meeting_only")
        mock_embed.return_value = [0.1, 0.2]

        # collection_exists → True so retrieval runs
        mock_qdrant.return_value.collection_exists.return_value = True
        mock_points = MagicMock()
        mock_points.points = []
        mock_qdrant.return_value.query_points.return_value = mock_points

        # Reranking returns empty → triggers scope expansion → second query_points call
        mock_rerank.return_value = []

        mock_list_chunks.return_value = []

        mock_result = MagicMock(spec=qa_service.AnswerResult)
        mock_build_answer.return_value = mock_result

        session = MagicMock(spec=Session)

        result = graph._fallback_answer(session, meeting_id=42, user_id=1, question="What is X?")

        assert result == mock_result
        # Should call query_points twice: once for meeting_only, once for global scope expansion
        assert mock_qdrant.return_value.query_points.call_count == 2


class TestAnswerQuestionGraph:
    """Integration tests for complete QA flow."""

    def test_answer_question_graph_langgraph_available(self):
        """Test uses LangGraph when available."""
        mock_graph_instance = MagicMock()
        mock_result = MagicMock(spec=qa_service.AnswerResult)
        mock_result.answer = "Test answer"
        mock_graph_instance.invoke.return_value = {"answer_result": mock_result}

        session = MagicMock(spec=Session)

        # Patch _GRAPH at module level
        with patch.object(graph, "_GRAPH", mock_graph_instance):
            result = graph.answer_question_graph(session, meeting_id=42, user_id=1, question="Test?")

        assert result == mock_result
        mock_graph_instance.invoke.assert_called_once()

    @patch("app.services.rag.graph._fallback_answer")
    def test_answer_question_graph_langgraph_unavailable(self, mock_fallback):
        """Test uses fallback when LangGraph unavailable."""
        mock_result = MagicMock(spec=qa_service.AnswerResult)
        mock_result.answer = "Fallback answer"
        mock_fallback.return_value = mock_result

        session = MagicMock(spec=Session)

        # Patch _GRAPH to None
        with patch.object(graph, "_GRAPH", None):
            result = graph.answer_question_graph(session, meeting_id=42, user_id=1, question="Test?")

        assert result == mock_result
        mock_fallback.assert_called_once_with(
            session, meeting_id=42, user_id=1, question="Test?"
        )

    def test_answer_question_graph_missing_result(self):
        """Test raises error when graph returns no answer."""
        mock_graph_instance = MagicMock()
        mock_graph_instance.invoke.return_value = {"answer_result": None}

        session = MagicMock(spec=Session)

        with patch.object(graph, "_GRAPH", mock_graph_instance):
            with pytest.raises(ValueError, match="Failed to build answer"):
                graph.answer_question_graph(session, meeting_id=42, user_id=1, question="Test?")
