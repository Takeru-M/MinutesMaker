from datetime import datetime
from typing import Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class Role(SQLModel, table=True):
    __tablename__ = "roles"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True, nullable=False)
    description: Optional[str] = Field(default=None)
    is_active: bool = Field(default=True, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class Permission(SQLModel, table=True):
    __tablename__ = "permissions"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True, nullable=False)
    resource_type: str = Field(index=True, nullable=False)
    action: str = Field(index=True, nullable=False)
    description: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class UserRole(SQLModel, table=True):
    __tablename__ = "user_roles"
    __table_args__ = (UniqueConstraint("user_id", "role_id", name="uq_user_roles_user_role"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", nullable=False, index=True)
    role_id: int = Field(foreign_key="roles.id", nullable=False, index=True)
    assigned_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    assigned_by: Optional[int] = Field(default=None, foreign_key="user.id")


class RolePermission(SQLModel, table=True):
    __tablename__ = "role_permissions"
    __table_args__ = (
        UniqueConstraint("role_id", "permission_id", name="uq_role_permissions_role_permission"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    role_id: int = Field(foreign_key="roles.id", nullable=False, index=True)
    permission_id: int = Field(foreign_key="permissions.id", nullable=False, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
