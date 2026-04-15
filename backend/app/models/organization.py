from datetime import datetime
from typing import Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class Organization(SQLModel, table=True):
    __tablename__ = "organizations"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True, nullable=False)
    slug: str = Field(index=True, unique=True, nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class OrganizationMembership(SQLModel, table=True):
    __tablename__ = "organization_memberships"
    __table_args__ = (
        UniqueConstraint("user_id", "organization_id", name="uq_org_memberships_user_org"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", nullable=False, index=True)
    organization_id: int = Field(foreign_key="organizations.id", nullable=False, index=True)
    role_id: int = Field(foreign_key="roles.id", nullable=False, index=True)
    is_primary: bool = Field(default=False, nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    assigned_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    assigned_by: Optional[int] = Field(default=None, foreign_key="user.id")