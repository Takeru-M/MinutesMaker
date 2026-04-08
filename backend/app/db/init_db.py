import logging
import time
from sqlmodel import Session, SQLModel

from app.core.config import settings
from app.crud.user import create_user, get_user_by_username
from app.db.session import engine

logger = logging.getLogger(__name__)


def init_db() -> None:
    """
    データベースを初期化し、デフォルトユーザーを作成
    """
    max_retries = 5
    retry_delay = 2  # seconds

    for attempt in range(max_retries):
        try:
            # テーブルを作成
            SQLModel.metadata.create_all(engine)
            logger.info("✓ Database tables created successfully")

            with Session(engine) as db:
                # デフォルトユーザーを作成
                user = get_user_by_username(db, settings.default_user_username)
                if user is None:
                    create_user(
                        db,
                        username=settings.default_user_username,
                        password=settings.default_user_password,
                        role="user",
                        full_name="Default User",
                    )
                    logger.info(f"✓ Created default user: {settings.default_user_username}")

                # デフォルト管理者を作成
                admin = get_user_by_username(db, settings.default_admin_username)
                if admin is None:
                    create_user(
                        db,
                        username=settings.default_admin_username,
                        password=settings.default_admin_password,
                        role="admin",
                        full_name="Default Admin",
                    )
                    logger.info(f"✓ Created default admin: {settings.default_admin_username}")

            logger.info("✓ Database initialization completed successfully")
            return

        except Exception as e:
            attempt_num = attempt + 1
            if attempt_num < max_retries:
                logger.warning(
                    f"✗ Database connection failed (attempt {attempt_num}/{max_retries}): {e}"
                )
                logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                logger.error(
                    f"✗ Failed to initialize database after {max_retries} attempts: {e}"
                )
                raise
