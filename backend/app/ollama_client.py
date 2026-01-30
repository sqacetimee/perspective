import httpx
import asyncio
import logging
from typing import Dict, Any, Optional
from app.config import get_settings
from app.model_config import (
    TaskType,
    get_model_for_task,
    calculate_cost,
    get_model_info
)

logger = logging.getLogger(__name__)
settings = get_settings()

class ZaiClient:
    """Async client for Z.AI GLM Models API"""
    
    def __init__(self):
        self.base_url = settings.zai_base_url
        self.api_key = settings.zai_api_key
        
        # Task-based model routing (instead of model keys)
        self.task_routing = True
        
        # Performance settings
        self.timeout = settings.ollama_timeout
        self.max_retries = settings.ollama_max_retries
        self.retry_delay = settings.ollama_retry_delay
        
        # Validate API key
        if not self.api_key:
            logger.error("Z.AI API key not configured. Set ZAI_API_KEY in .env")
    
    def _get_model_for_task(self, task_type: TaskType) -> str:
        """
        Get the optimal model for a given task type.
        
        Args:
            task_type: TaskType enum value
            
        Returns:
            Model identifier string
        """
        model_config = get_model_for_task(task_type)
        return model_config["model"]
    
    def _calculate_request_cost(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int
    ) -> float:
        """
        Calculate the cost of an API call.
        
        Args:
            model: Model identifier
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens
            
        Returns:
            Total cost in USD
        """
        return calculate_cost(model, input_tokens, output_tokens)
    
    async def health_check(self) -> bool:
        """Check if Z.AI API is reachable"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{self.base_url}/models",
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                is_healthy = response.status_code == 200
                logger.info(f"Z.AI health check: {'OK' if is_healthy else 'FAILED'}")
                return is_healthy
        except Exception as e:
            logger.error(f"Z.AI health check failed: {e}")
            return False
    
    async def generate(
        self,
        prompt: str,
        task_type: Optional[TaskType] = None,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate text using Z.AI OpenAI-compatible API.
        
        Args:
            prompt: The input prompt
            task_type: TaskType enum for automatic model routing
            model: Specific model to use (overrides task_type)
            
        Returns:
            {
                "response": str,
                "total_duration": int (nanoseconds),
                "tokens_generated": int,
                "input_tokens": int,
                "output_tokens": int,
                "model_used": str,
                "cost": float
            }
        """
        # Determine which model to use
        if model:
            model_name = model
        elif task_type:
            model_name = self._get_model_for_task(task_type)
        else:
            # Default to general task
            model_name = self._get_model_for_task(TaskType.GENERAL)
        
        # Build request payload
        payload = {
            "model": model_name,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": settings.max_tokens,
            "temperature": settings.temperature,
            "top_p": settings.top_p,
        }
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        last_error = None
        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    logger.info(f"Z.AI API request attempt {attempt + 1}/{self.max_retries} to {model_name}")
                    response = await client.post(
                        f"{self.base_url}/chat/completions",
                        json=payload,
                        headers=headers
                    )
                    response.raise_for_status()
                    data = response.json()
                    
                    # Extract response from OpenAI-compatible format
                    choices = data.get("choices", [])
                    text = choices[0].get("message", {}).get("content", "") if choices else ""
                    usage = data.get("usage", {})
                    
                    input_tokens = usage.get("prompt_tokens", 0)
                    output_tokens = usage.get("completion_tokens", 0)
                    total_tokens = input_tokens + output_tokens
                    
                    # Calculate cost
                    cost = self._calculate_request_cost(model_name, input_tokens, output_tokens)
                    
                    result = {
                        "response": text,
                        "total_duration": 0,  # Not provided by API
                        "tokens_generated": output_tokens,
                        "input_tokens": input_tokens,
                        "output_tokens": output_tokens,
                        "model_used": model_name,
                        "cost": cost
                    }
                    
                    logger.info(
                        f"Z.AI API response received (Input: {input_tokens}, "
                        f"Output: {output_tokens}, Model: {model_name}, Cost: ${cost:.6f})"
                    )
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
        
        raise RuntimeError(f"Z.AI API generation failed after {self.max_retries} attempts: {last_error}")

# Singleton instance - replaces ollama_client
zai_client = ZaiClient()
