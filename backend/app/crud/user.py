from sqlmodel import Session, select

from app.core.security import get_password_hash
from app.models.user import User


def get_user_by_username(db: Session, username: str) -> User | None:
    stmt = select(User).where(User.username == username)
    return db.exec(stmt).first()


def create_user(
    db: Session,
    *,
    username: str,
    password: str,
    role: str,
    full_name: str | None = None,
    is_active: bool = True,
) -> User:
    user = User(
        username=username,
        password_hash=get_password_hash(password),
        role=role,
        full_name=full_name,
        is_active=is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
