from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Z.AI Configuration
    zai_api_key: str = ""
    zai_base_url: str = "https://open.bigmodel.cn/api/paas/v4"
    
    # Legacy Ollama (kept for compatibility, not used in new architecture)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "default"
    
    # System
    max_rounds: int = 3
    session_storage_path: str
    log_level: str = "INFO"
    
    # Performance
    ollama_timeout: int = 120
    ollama_max_retries: int = 3
    ollama_retry_delay: int = 2
    
    # Model parameters
    temperature: float = 0.7
    top_p: float = 0.9
    top_k: int = 40
    max_tokens: int = 2048
    context_window: int = 8192
    
    # Cost Tracking
    enable_cost_tracking: bool = True
    cost_tracking_log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Removed @lru_cache() to prevent stale settings
def get_settings() -> Settings:
    return Settings()
