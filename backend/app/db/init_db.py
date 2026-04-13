import logging
import time
from sqlalchemy import inspect, text
from sqlmodel import Session, SQLModel

from app.core.config import settings
from app.core.constants import ROLE_ADMIN, ROLE_USER
from app.crud.user import create_user, get_user_by_username
from app.db.session import engine
from app.db.seeds import (
    seed_contents,
    seed_default_user_role_assignments,
    seed_notices,
    seed_roles_and_permissions,
    seed_sample_agendas,
    seed_sample_users,
)
from app.db import base  # noqa: F401

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
            _ensure_mysql_utf8mb4()
            _ensure_schema_compatibility()
            logger.info("✓ Database tables created successfully")

            with Session(engine) as db:
                # デフォルトユーザーを作成
                user = get_user_by_username(db, settings.default_user_username)
                if user is None:
                    create_user(
                        db,
                        username=settings.default_user_username,
                        password=settings.default_user_password,
                        role=ROLE_USER,
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
                        role=ROLE_ADMIN,
                        full_name="Default Admin",
                    )
                    logger.info(f"✓ Created default admin: {settings.default_admin_username}")

                # 動作確認用のサンプルユーザーを作成
                seed_sample_users(db)
                logger.info("✓ Seeded sample users")

                # ロール・権限の初期データを作成
                seed_roles_and_permissions(db)
                logger.info("✓ Seeded roles and permissions")

                # 既存ユーザーとロールを紐付け
                seed_default_user_role_assignments(db)
                logger.info("✓ Seeded user role assignments")

                # 議案閲覧用のサンプルデータを作成
                seed_sample_agendas(db)
                logger.info("✓ Seeded sample agendas")

                # お知らせ閲覧用のサンプルデータを作成
                seed_notices(db)
                logger.info("✓ Seeded notices")

                # 資料置き場・利用方法コンテンツ用のサンプルデータを作成
                seed_contents(db)
                logger.info("✓ Seeded contents")

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


def _ensure_schema_compatibility() -> None:
    """
    既存DBが create_all のみで運用されていた場合に不足カラムを補完する。
    （Alembic未適用環境の互換対応）
    """
    with engine.begin() as conn:
        inspector = inspect(conn)
        table_names = set(inspector.get_table_names())

        if "meetings" in table_names:
            meeting_columns = {col["name"] for col in inspector.get_columns("meetings")}
            if "meeting_type" not in meeting_columns:
                conn.execute(
                    text(
                        "ALTER TABLE meetings "
                        "ADD COLUMN meeting_type VARCHAR(50) NOT NULL DEFAULT 'large'"
                    )
                )

        if "agendas" in table_names:
            agenda_columns = {col["name"] for col in inspector.get_columns("agendas")}

            if "meeting_date" not in agenda_columns:
                conn.execute(text("ALTER TABLE agendas ADD COLUMN meeting_date DATE NULL"))
            if "meeting_type" not in agenda_columns:
                conn.execute(
                    text(
                        "ALTER TABLE agendas "
                        "ADD COLUMN meeting_type VARCHAR(50) NOT NULL DEFAULT 'large'"
                    )
                )
            if "responsible" not in agenda_columns:
                conn.execute(text("ALTER TABLE agendas ADD COLUMN responsible VARCHAR(255) NULL"))
            if "agenda_types" not in agenda_columns:
                conn.execute(text("ALTER TABLE agendas ADD COLUMN agenda_types JSON NULL"))
                conn.execute(text("UPDATE agendas SET agenda_types = JSON_ARRAY() WHERE agenda_types IS NULL"))
                conn.execute(text("ALTER TABLE agendas MODIFY COLUMN agenda_types JSON NOT NULL"))
            if "voting_items" not in agenda_columns:
                conn.execute(text("ALTER TABLE agendas ADD COLUMN voting_items TEXT NULL"))
            if "pdf_s3_key" not in agenda_columns:
                conn.execute(text("ALTER TABLE agendas ADD COLUMN pdf_s3_key VARCHAR(255) NULL"))
            if "pdf_url" not in agenda_columns:
                conn.execute(text("ALTER TABLE agendas ADD COLUMN pdf_url VARCHAR(1024) NULL"))

            conn.execute(
                text(
                    """
                    UPDATE agendas a
                    INNER JOIN meetings m ON m.id = a.meeting_id
                    SET a.meeting_date = DATE(m.scheduled_at),
                        a.meeting_type = COALESCE(a.meeting_type, m.meeting_type)
                    WHERE a.meeting_date IS NULL
                    """
                )
            )
            conn.execute(
                text(
                    "UPDATE agendas SET responsible = description "
                    "WHERE responsible IS NULL AND description IS NOT NULL"
                )
            )

        if "minutes" in table_names:
            minutes_columns = {col["name"] for col in inspector.get_columns("minutes")}

            if "content_type" not in minutes_columns:
                conn.execute(
                    text(
                        "ALTER TABLE minutes "
                        "ADD COLUMN content_type VARCHAR(50) NOT NULL DEFAULT 'text'"
                    )
                )
            if "pdf_s3_key" not in minutes_columns:
                conn.execute(text("ALTER TABLE minutes ADD COLUMN pdf_s3_key VARCHAR(255) NULL"))
            if "pdf_url" not in minutes_columns:
                conn.execute(text("ALTER TABLE minutes ADD COLUMN pdf_url VARCHAR(1024) NULL"))

            unique_constraints = {uc.get("name") for uc in inspector.get_unique_constraints("minutes")}
            if "uq_minutes_scope_entity" in unique_constraints:
                conn.execute(text("ALTER TABLE minutes DROP INDEX uq_minutes_scope_entity"))

            minute_indexes = {idx.get("name") for idx in inspector.get_indexes("minutes")}
            if "ix_minutes_content_type" not in minute_indexes:
                conn.execute(text("CREATE INDEX ix_minutes_content_type ON minutes (content_type)"))


def _ensure_mysql_utf8mb4() -> None:
    """MySQLの文字コード・照合順序をutf8mb4へ揃える。"""
    with engine.begin() as conn:
        inspector = inspect(conn)
        table_names = inspector.get_table_names()

        db_name = conn.execute(text("SELECT DATABASE()")).scalar()
        if db_name:
            conn.execute(
                text(
                    f"ALTER DATABASE `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
            )

        for table_name in table_names:
            conn.execute(
                text(
                    f"ALTER TABLE `{table_name}` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
            )
