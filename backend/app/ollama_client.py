import httpx
import asyncio
import logging
from typing import Dict, Any, Optional
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class TellusAIClient:
    """Async client for TELUS Hackathon OpenAI-compatible APIs"""
    
    def __init__(self):
        # Model endpoints and tokens from hackathon
        self.models = {
            "gemma": {
                "base_url": "https://gemma-3-27b-3ca9s.paas.ai.telus.com/v1",
                "api_key": "dc8704d41888afb2b889a8ebac81d12f",
                "model_name": "google/gemma-3-27b-it"
            },
            "qwen-coder": {
                "base_url": "https://qwen3coder30b-3ca9s.paas.ai.telus.com/v1",
                "api_key": "b12e6fdc447aedf5cfce126b721e1854",
                "model_name": "Qwen/Qwen3-Coder-30B-A3B-Instruct"
            },
            "deepseek": {
                "base_url": "https://deepseekv32-3ca9s.paas.ai.telus.com/v1",
                "api_key": "a12a7d3705b12aeb46eb4cc8d77f5446",
                "model_name": "deepseek-ai/DeepSeek-V3.2-Exp"
            },
            "gpt-oss": {
                "base_url": "https://rr-test-gpt-120-9219s.paas.ai.telus.com/v1",
                "api_key": "1df668838dee5b8410e8e21a76fd9bb9",
                "model_name": "gpt-oss:120b"
            },
            "qwen-emb": {
                "base_url": "https://qwen-emb-3ca9s.paas.ai.telus.com/v1",
                "api_key": "d14ac3d17de38782334555fcc0537969",
                "model_name": "Qwen/Qwen3-Embedding-8B"
            }
        }
        
        # Default model for different tasks
        self.default_model = "deepseek"  # Best for reasoning
        self.synthesis_model = "deepseek"  # Use same for synthesis
        
        self.timeout = settings.ollama_timeout
        self.max_retries = settings.ollama_max_retries
        self.retry_delay = settings.ollama_retry_delay
    
    async def health_check(self) -> bool:
        """Check if API is reachable"""
        try:
            model_config = self.models[self.default_model]
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{model_config['base_url']}/models",
                    headers={"Authorization": f"Bearer {model_config['api_key']}"}
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"API health check failed: {e}")
            return False
    
    async def generate(self, prompt: str, model_key: str = None) -> Dict[str, Any]:
        """
        Generate text using OpenAI-compatible completions API
        
        Returns:
            {
                "response": str,
                "total_duration": int (nanoseconds),
                "tokens_generated": int
            }
        """
        model_key = model_key or self.default_model
        model_config = self.models[model_key]
        
        payload = {
            "model": model_config["model_name"],
            "prompt": prompt,
            "max_tokens": settings.max_tokens,
            "temperature": settings.temperature,
            "top_p": settings.top_p,
        }
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {model_config['api_key']}"
        }
        
        last_error = None
        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    logger.info(f"TELUS API request attempt {attempt + 1}/{self.max_retries} to {model_key}")
                    response = await client.post(
                        f"{model_config['base_url']}/completions",
                        json=payload,
                        headers=headers
                    )
                    response.raise_for_status()
                    data = response.json()
                    
                    # Extract response from OpenAI-compatible format
                    choices = data.get("choices", [])
                    text = choices[0].get("text", "") if choices else ""
                    usage = data.get("usage", {})
                    
                    result = {
                        "response": text,
                        "total_duration": 0,  # Not provided by API
                        "tokens_generated": usage.get("completion_tokens", len(text.split()))
                    }
                    
                    logger.info(f"TELUS API response received ({result['tokens_generated']} tokens)")
                    return result
                    
            except httpx.TimeoutException as e:
                last_error = f"Timeout after {self.timeout}s"
                logger.warning(f"Attempt {attempt + 1} timeout: {e}")
                
            except httpx.HTTPStatusError as e:
                last_error = f"HTTP {e.response.status_code}: {e.response.text}"
                logger.error(f"Attempt {attempt + 1} HTTP error: {last_error}")
                if e.response.status_code >= 500:
                    pass  # Server error, retry
                else:
                    raise RuntimeError(last_error)
            
            except Exception as e:
                last_error = str(e)
                logger.error(f"Attempt {attempt + 1} failed: {e}")
            
            # Wait before retry
            if attempt < self.max_retries - 1:
                wait_time = self.retry_delay * (2 ** attempt)
                logger.info(f"Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
        
        raise RuntimeError(f"TELUS API generation failed after {self.max_retries} attempts: {last_error}")

# Singleton instance - replaces ollama_client
ollama_client = TellusAIClient()