"""Pytest configuration and fixtures for QA agent tests."""
from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from sqlmodel import Session


@pytest.fixture
def mock_session():
    """Mock SQLModel session for testing."""
    session = MagicMock(spec=Session)
    return session


@pytest.fixture
def mock_qdrant_client():
    """Mock Qdrant vector search client."""
    client = MagicMock()
    client.search.return_value = []
    return client


@pytest.fixture
def mock_settings():
    """Mock app settings for testing."""
    settings = MagicMock()
    settings.openai_api_key = "test-key"
    settings.rag_retrieval_top_k = 5
    settings.rag_score_threshold = 0.5
    return settings


@pytest.fixture
def qa_test_state():
    """Base QAState for testing."""
    return {
        "session": MagicMock(spec=Session),
        "meeting_id": 42,
        "user_id": 1,
        "question": "What are the action items?",
        "resolved_intent": "lookup",
        "resolved_scope": "global",
        "scope_expanded": False,
    }
