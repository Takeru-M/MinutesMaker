import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


def _load_dotenv_files() -> None:
    """Load env files from common run locations without overriding already-set vars."""
    backend_dir = Path(__file__).resolve().parents[2]
    project_root = backend_dir.parent

    candidates = [
        backend_dir / ".env",
        project_root / ".env",
    ]

    for dotenv_path in candidates:
        if dotenv_path.exists():
            load_dotenv(dotenv_path=dotenv_path, override=False)


_load_dotenv_files()


def _getenv_any(*keys: str, default: str = "") -> str:
    for key in keys:
        value = os.getenv(key)
        if value is not None and value.strip() != "":
            return value
        lower_value = os.getenv(key.lower())
        if lower_value is not None and lower_value.strip() != "":
            return lower_value
    return default


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "MinutesMaker Backend")
    app_env: str = os.getenv("APP_ENV", "development")
    database_url: str = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://app_user:app_password@db:3306/minutesmaker",
    )
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    refresh_token_expire_minutes: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES", "10080"))
    access_cookie_name: str = os.getenv("ACCESS_COOKIE_NAME", "access_token")
    refresh_cookie_name: str = os.getenv("REFRESH_COOKIE_NAME", "refresh_token")
    cookie_secure: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    cookie_samesite: str = os.getenv("COOKIE_SAMESITE", "lax")

    default_user_username: str = os.getenv("DEFAULT_USER_USERNAME", "user01")
    default_user_password: str = os.getenv("DEFAULT_USER_PASSWORD", "password123")
    default_admin_username: str = os.getenv("DEFAULT_ADMIN_USERNAME", "admin01")
    default_admin_password: str = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")

    aws_region: str = _getenv_any("AWS_REGION")
    aws_s3_bucket: str = _getenv_any("AWS_S3_BUCKET", "S3_BUCKET", "AWS_BUCKET_NAME")
    aws_access_key_id: str = _getenv_any("AWS_ACCESS_KEY_ID")
    aws_secret_access_key: str = _getenv_any("AWS_SECRET_ACCESS_KEY")
    aws_s3_endpoint_url: str = _getenv_any("AWS_S3_ENDPOINT_URL", "S3_ENDPOINT_URL")
    aws_s3_public_base_url: str = _getenv_any("AWS_S3_PUBLIC_BASE_URL", "S3_PUBLIC_BASE_URL")
    aws_s3_presigned_expires_seconds: int = int(os.getenv("AWS_S3_PRESIGNED_EXPIRES_SECONDS", "3600"))

    llm_provider: str = os.getenv("LLM_PROVIDER", "openai")
    llm_model: str = os.getenv("LLM_MODEL", "gpt-4.1-mini")
    openai_api_key: str = _getenv_any("OPENAI_API_KEY")

    embedding_model: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    vector_store_provider: str = os.getenv("VECTOR_STORE_PROVIDER", "qdrant")
    qdrant_url: str = os.getenv("QDRANT_URL", "http://qdrant:6333")
    qdrant_api_key: str = _getenv_any("QDRANT_API_KEY")
    qdrant_collection_prefix: str = os.getenv("QDRANT_COLLECTION_PREFIX", "minutesmaker")

    rag_chunk_size: int = int(os.getenv("RAG_CHUNK_SIZE", "1000"))
    rag_chunk_overlap: int = int(os.getenv("RAG_CHUNK_OVERLAP", "150"))
    rag_retrieval_top_k: int = int(os.getenv("RAG_RETRIEVAL_TOP_K", "6"))
    rag_score_threshold: float = float(os.getenv("RAG_SCORE_THRESHOLD", "0.2"))


settings = Settings()
