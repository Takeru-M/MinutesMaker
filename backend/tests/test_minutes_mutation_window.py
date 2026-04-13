from datetime import datetime

from app.api.v1.endpoints.minutes import _is_within_minutes_mutation_window


def test_minutes_mutation_window_allows_meeting_day_and_next_two_days() -> None:
    meeting_scheduled_at = datetime(2026, 4, 10, 18, 0, 0)

    assert _is_within_minutes_mutation_window(meeting_scheduled_at, now=datetime(2026, 4, 10, 0, 0, 0))
    assert _is_within_minutes_mutation_window(meeting_scheduled_at, now=datetime(2026, 4, 11, 23, 59, 59))
    assert _is_within_minutes_mutation_window(meeting_scheduled_at, now=datetime(2026, 4, 12, 12, 0, 0))


def test_minutes_mutation_window_blocks_before_meeting_and_after_two_days() -> None:
    meeting_scheduled_at = datetime(2026, 4, 10, 18, 0, 0)

    assert not _is_within_minutes_mutation_window(meeting_scheduled_at, now=datetime(2026, 4, 9, 23, 59, 59))
    assert not _is_within_minutes_mutation_window(meeting_scheduled_at, now=datetime(2026, 4, 13, 0, 0, 0))
