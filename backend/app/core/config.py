import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


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


settings = Settings()
