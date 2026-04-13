from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    actor_user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    actor_role_snapshot: Optional[str] = Field(default=None)
    entity_type: str = Field(nullable=False, index=True)
    entity_id: str = Field(nullable=False, index=True)
    action: str = Field(nullable=False, index=True)
    before_json: Optional[dict] = Field(default=None, sa_column=Column(JSON, nullable=True))
    after_json: Optional[dict] = Field(default=None, sa_column=Column(JSON, nullable=True))
    changed_fields: Optional[dict] = Field(default=None, sa_column=Column(JSON, nullable=True))
    result: str = Field(default="success", nullable=False, index=True)
    error_code: Optional[str] = Field(default=None)
    error_message: Optional[str] = Field(default=None)
    ip_address: Optional[str] = Field(default=None)
    user_agent: Optional[str] = Field(default=None)
    request_id: Optional[str] = Field(default=None, index=True)
    trace_id: Optional[str] = Field(default=None, index=True)
    session_id: Optional[str] = Field(default=None, index=True)
    reason: Optional[str] = Field(default=None)
    occurred_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, index=True)
