from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    password_hash: str
    role: str = Field(index=True)
    is_active: bool = Field(default=True)
    full_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
