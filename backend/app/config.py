from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Ollama
    ollama_base_url: str
    ollama_model: str
    
    # System
    max_rounds: int = 5
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
    
    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    return Settings()
