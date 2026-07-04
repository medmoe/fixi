import os
from enum import Enum

from pydantic import SecretStr
from pydantic_settings import BaseSettings
from starlette.config import Config

current_file_dir = os.path.dirname(os.path.realpath(__file__))
env_path = os.path.join(current_file_dir, "..", "..", ".env")
test_env_path = os.path.join(current_file_dir, "..", "..", ".env.test")

config = Config(env_path)
test_config = Config(test_env_path)


class AppSettings(BaseSettings):
    APP_NAME: str = config("APP_NAME", default="FastAPI app")
    APP_DESCRIPTION: str | None = config("APP_DESCRIPTION", default=None)
    APP_VERSION: str | None = config("APP_VERSION", default=None)
    LICENSE_NAME: str | None = config("LICENSE", default=None)
    CONTACT_NAME: str | None = config("CONTACT_NAME", default=None)
    CONTACT_EMAIL: str | None = config("CONTACT_EMAIL", default=None)


class CryptSettings(BaseSettings):
    SECRET_KEY: SecretStr = config("SECRET_KEY", cast=SecretStr)
    ALGORITHM: str = config("ALGORITHM", default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = config("ACCESS_TOKEN_EXPIRE_MINUTES", default=30)
    REFRESH_TOKEN_EXPIRE_DAYS: int = config("REFRESH_TOKEN_EXPIRE_DAYS", default=7)


class DatabaseSettings(BaseSettings):
    pass


class SQLiteSettings(DatabaseSettings):
    SQLITE_URI: str = config("SQLITE_URI", default="./sql_app.db")
    SQLITE_SYNC_PREFIX: str = config("SQLITE_SYNC_PREFIX", default="sqlite:///")
    SQLITE_ASYNC_PREFIX: str = config("SQLITE_ASYNC_PREFIX", default="sqlite+aiosqlite:///")


class MySQLSettings(DatabaseSettings):
    MYSQL_USER: str = config("MYSQL_USER", default="username")
    MYSQL_PASSWORD: str = config("MYSQL_PASSWORD", default="password")
    MYSQL_SERVER: str = config("MYSQL_SERVER", default="localhost")
    MYSQL_PORT: int = config("MYSQL_PORT", default=5432)
    MYSQL_DB: str = config("MYSQL_DB", default="dbname")
    MYSQL_URI: str = f"{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_SERVER}:{MYSQL_PORT}/{MYSQL_DB}"
    MYSQL_SYNC_PREFIX: str = config("MYSQL_SYNC_PREFIX", default="mysql://")
    MYSQL_ASYNC_PREFIX: str = config("MYSQL_ASYNC_PREFIX", default="mysql+aiomysql://")
    MYSQL_URL: str | None = config("MYSQL_URL", default=None)


class PostgresSettings(DatabaseSettings):
    POSTGRES_USER: str = config("POSTGRES_USER", default="postgres")
    POSTGRES_PASSWORD: str = config("POSTGRES_PASSWORD", default="postgres")
    POSTGRES_SERVER: str = config("POSTGRES_SERVER", default="localhost")
    POSTGRES_PORT: int = config("POSTGRES_PORT", default=5432)
    POSTGRES_DB: str = config("POSTGRES_DB", default="postgres")
    POSTGRES_SYNC_PREFIX: str = config("POSTGRES_SYNC_PREFIX", default="postgresql://")
    POSTGRES_ASYNC_PREFIX: str = config("POSTGRES_ASYNC_PREFIX", default="postgresql+asyncpg://")
    POSTGRES_URI: str = f"{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}:{POSTGRES_PORT}/{POSTGRES_DB}"
    POSTGRES_URL: str | None = config("POSTGRES_URL", default=None)


class FirstUserSettings(BaseSettings):
    ADMIN_NAME: str = config("ADMIN_NAME", default="admin")
    ADMIN_EMAIL: str = config("ADMIN_EMAIL", default="admin@admin.com")
    ADMIN_USERNAME: str = config("ADMIN_USERNAME", default="admin")
    ADMIN_PASSWORD: str = config("ADMIN_PASSWORD", default="!Ch4ng3Th1sP4ssW0rd!")


class TestSettings(BaseSettings):
    TEST_POSTGRES_USER: str = test_config("TEST_POSTGRES_USER", default="postgres")
    TEST_POSTGRES_PASSWORD: str = test_config("TEST_POSTGRES_PASSWORD", default="postgres")
    TEST_POSTGRES_SERVER: str = test_config("TEST_POSTGRES_SERVER", default="localhost")
    TEST_POSTGRES_PORT: int = test_config("TEST_POSTGRES_PORT", default=5432)
    TEST_POSTGRES_DB: str = test_config("TEST_POSTGRES_DB", default="test_db")
    TEST_POSTGRES_SYNC_PREFIX: str = test_config("TEST_POSTGRES_SYNC_PREFIX", default="postgresql://")
    TEST_POSTGRES_ASYNC_PREFIX: str = test_config("TEST_POSTGRES_ASYNC_PREFIX", default="postgresql+asyncpg://")
    TEST_POSTGRES_ASYNC_URI: str = f"{TEST_POSTGRES_USER}:{TEST_POSTGRES_PASSWORD}@{TEST_POSTGRES_SERVER}:{TEST_POSTGRES_PORT}/{TEST_POSTGRES_DB}"
    TEST_POSTGRES_URL: str | None = test_config("TEST_POSTGRES_URL", default=None)
    # REDIS
    TEST_REDIS_URI: str = test_config("REDIS_URI", default="redis://test-redis:6379")

class RedisCacheSettings(BaseSettings):
    REDIS_CACHE_HOST: str = config("REDIS_CACHE_HOST", default="localhost")
    REDIS_CACHE_PORT: int = config("REDIS_CACHE_PORT", default=6379)
    REDIS_CACHE_URL: str = f"redis://{REDIS_CACHE_HOST}:{REDIS_CACHE_PORT}"


class MinIOSettings(BaseSettings):
    APP_S3_ENDPOINT: str = config("APP_S3_ENDPOINT", default="localhost:9000")
    APP_S3_ACCESS_KEY: str = config("APP_S3_ACCESS_KEY", default="minioadmin")
    APP_S3_SECRET_KEY: str = config("APP_S3_SECRET_KEY", default="minioadmin")
    APP_S3_BUCKET_UPLOADS: str = config("APP_S3_BUCKET_UPLOADS", default="app-bucket")


class ClientSideCacheSettings(BaseSettings):
    CLIENT_CACHE_MAX_AGE: int = config("CLIENT_CACHE_MAX_AGE", default=60)


class RedisQueueSettings(BaseSettings):
    REDIS_QUEUE_HOST: str = config("REDIS_QUEUE_HOST", default="localhost")
    REDIS_QUEUE_PORT: int = config("REDIS_QUEUE_PORT", default=6379)


class RedisRateLimiterSettings(BaseSettings):
    REDIS_RATE_LIMIT_HOST: str = config("REDIS_RATE_LIMIT_HOST", default="localhost")
    REDIS_RATE_LIMIT_PORT: int = config("REDIS_RATE_LIMIT_PORT", default=6379)
    REDIS_RATE_LIMIT_URL: str = f"redis://{REDIS_RATE_LIMIT_HOST}:{REDIS_RATE_LIMIT_PORT}"


class NotificationSettings(BaseSettings):
    FCM_ENABLED: bool = config("FCM_ENABLED", default=False)
    FCM_TOPIC_PREFIX: str = config("FCM_TOPIC_PREFIX", default="user-")
    FCM_SERVICE_ACCOUNT_JSON: str | None = config("FCM_SERVICE_ACCOUNT_JSON", default=None)


class DefaultRateLimitSettings(BaseSettings):
    DEFAULT_RATE_LIMIT_LIMIT: int = config("DEFAULT_RATE_LIMIT_LIMIT", default=10)
    DEFAULT_RATE_LIMIT_PERIOD: int = config("DEFAULT_RATE_LIMIT_PERIOD", default=3600)


class CRUDAdminSettings(BaseSettings):
    CRUD_ADMIN_ENABLED: bool = config("CRUD_ADMIN_ENABLED", default=True)
    CRUD_ADMIN_MOUNT_PATH: str = config("CRUD_ADMIN_MOUNT_PATH", default="/admin")

    CRUD_ADMIN_ALLOWED_IPS_LIST: list[str] | None = None
    CRUD_ADMIN_ALLOWED_NETWORKS_LIST: list[str] | None = None
    CRUD_ADMIN_MAX_SESSIONS: int = config("CRUD_ADMIN_MAX_SESSIONS", default=10)
    CRUD_ADMIN_SESSION_TIMEOUT: int = config("CRUD_ADMIN_SESSION_TIMEOUT", default=1440)
    SESSION_SECURE_COOKIES: bool = config("SESSION_SECURE_COOKIES", default=True)

    CRUD_ADMIN_TRACK_EVENTS: bool = config("CRUD_ADMIN_TRACK_EVENTS", default=True)
    CRUD_ADMIN_TRACK_SESSIONS: bool = config("CRUD_ADMIN_TRACK_SESSIONS", default=True)

    CRUD_ADMIN_REDIS_ENABLED: bool = config("CRUD_ADMIN_REDIS_ENABLED", default=False)
    CRUD_ADMIN_REDIS_HOST: str = config("CRUD_ADMIN_REDIS_HOST", default="localhost")
    CRUD_ADMIN_REDIS_PORT: int = config("CRUD_ADMIN_REDIS_PORT", default=6379)
    CRUD_ADMIN_REDIS_DB: int = config("CRUD_ADMIN_REDIS_DB", default=0)
    CRUD_ADMIN_REDIS_PASSWORD: str | None = config("CRUD_ADMIN_REDIS_PASSWORD", default="None")
    CRUD_ADMIN_REDIS_SSL: bool = config("CRUD_ADMIN_REDIS_SSL", default=False)


class EnvironmentOption(Enum):
    LOCAL = "local"
    STAGING = "staging"
    PRODUCTION = "production"
    TEST = "test"


class EnvironmentSettings(BaseSettings):
    ENVIRONMENT: EnvironmentOption = config("ENVIRONMENT", default=EnvironmentOption.LOCAL)


class DevSettings(BaseSettings):
    debug: bool = True
    allowed_origins: list[str] = ["*"]


class StagingSettings(BaseSettings):
    debug: bool = False


class ProdSettings(BaseSettings):
    debug: bool = False
    allowed_origins: list[str] = []


class Settings(
    AppSettings,
    CRUDAdminSettings,
    ClientSideCacheSettings,
    CryptSettings,
    DefaultRateLimitSettings,
    DevSettings,
    EnvironmentSettings,
    FirstUserSettings,
    MinIOSettings,
    NotificationSettings,
    PostgresSettings,
    ProdSettings,
    RedisCacheSettings,
    RedisQueueSettings,
    RedisRateLimiterSettings,
    SQLiteSettings,
    StagingSettings,
    TestSettings,
):
    pass


settings = Settings()
