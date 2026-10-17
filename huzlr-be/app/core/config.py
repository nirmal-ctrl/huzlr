from pydantic_settings import BaseSettings
from pathlib import Path

# Get the project root directory (parent of app directory)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BASE_DIR / ".env"

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = "your-super-secret-key-change-it"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # OAuth
    GOOGLE_CLIENT_ID: str = "your-google-client-id"
    GOOGLE_CLIENT_SECRET: str = "your-google-client-secret"
    GOOGLE_CALENDAR_REDIRECT_URI: str = "http://localhost:8001/api/v1/scrum-master/calendar/google/callback"
    JIRA_CLIENT_ID: str = ""
    JIRA_CLIENT_SECRET: str = ""
    JIRA_REDIRECT_URI: str = "http://localhost:3001/atlassian-callback"
    JIRA_SCOPES: str = "read:jira-work read:jira-user offline_access read:board-scope:jira-software read:board-scope.admin:jira-software read:project:jira read:sprint:jira-software"
    JIRA_SYNC_INTERVAL_SECONDS: int = 300
    JIRA_RECONCILE_INTERVAL_SECONDS: int = 86400
    JIRA_MAX_VISIBILITY_SOURCES: int = 80
    JIRA_MAX_ATTACHMENT_BYTES: int = 2 * 1024 * 1024
    JIRA_ATTACHMENT_TEXT_ENABLED: bool = True
    JIRA_WEBHOOKS_ENABLED: bool = False
    JIRA_WEBHOOK_BASE_URL: str = ""
    
    # URLs
    FRONTEND_BASE_URL: str = "http://localhost:3001"
    BACKEND_URL: str = "http://localhost:8001"

    # Mailjet
    MAILJET_API_KEY: str = ""
    MAILJET_SECRET_KEY: str = ""
    MAILJET_SENDER_EMAIL: str = "nirmal@huzlr.com"

    # Admin
    ADMIN_SECRET: str = "admin-secret-key"
    HUZL_WORKER_KEY: str = ""
    AGENT_SERVICE_KEY: str = ""

    # LiveKit Voice Agent Configurations
    LIVEKIT_API_KEY: str = ""
    LIVEKIT_API_SECRET: str = ""
    LIVEKIT_URL: str = "wss://huzl-hdzkgm0u.livekit.cloud"
    GEMINI_API_KEY: str = ""

    # Context graphs apply to every workspace/project when the global service is enabled.
    CONTEXT_ENABLED: bool = True
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = ""
    NEO4J_DATABASE: str = "neo4j"
    CONTEXT_EMBEDDINGS_ENABLED: bool = False
    CONTEXT_EXTRACTION_ENABLED: bool = False
    CONTEXT_EMBEDDING_MODEL: str = "gemini-embedding-001"
    CONTEXT_EMBEDDING_DIMENSIONS: int = 768
    CONTEXT_MODEL: str = "gemini-2.5-flash"
    CONTEXT_DELEGATION_SECRET: str = ""

    # Google Cloud Storage
    GCS_BUCKET_NAME: str = ""
    GCS_PROJECT_ID: str = ""
    GCS_DOCUMENTS_PREFIX: str = "project-documents"
    GCS_MAX_DOCUMENT_BYTES: int = 2 * 1024 * 1024

    # Vercel -> Google Cloud Workload Identity Federation. When all values are
    # set, the backend exchanges Vercel's request OIDC token for short-lived
    # service-account credentials. Local development falls back to ADC.
    GCP_PROJECT_ID: str = ""
    GCP_PROJECT_NUMBER: str = ""
    GCP_SERVICE_ACCOUNT_EMAIL: str = ""
    GCP_WORKLOAD_IDENTITY_POOL_ID: str = ""
    GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: str = ""

    class Config:
        env_file = str(ENV_FILE)
        env_file_encoding = 'utf-8'
        extra = 'ignore'  # Ignore extra fields in .env file

settings = Settings()
