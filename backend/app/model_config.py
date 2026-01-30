"""
Model Configuration and Pricing for Z.AI GLM Models

This module defines all available GLM models, their pricing tiers,
and provides utilities for cost tracking and model routing.
"""

from typing import Dict, Any, Optional
from enum import Enum

class ModelTier(str, Enum):
    """Model cost tiers for routing decisions"""
    FREE = "FREE"
    CHEAP = "CHEAP"
    STANDARD = "STANDARD"
    PREMIUM = "PREMIUM"

class TaskType(str, Enum):
    """Task types for model routing"""
    CLARIFICATION = "CLARIFICATION"
    DEBATE = "DEBATE"
    SYNTHESIS = "SYNTHESIS"
    CODE = "CODE"
    CREATIVE = "CREATIVE"
    GENERAL = "GENERAL"

# Task-specific model routing configuration
TASK_MODEL_MAPPING = {
    TaskType.CLARIFICATION: {
        "model": "glm-4.7-flash",
        "tier": ModelTier.FREE,
        "input_cost": 0.0,
        "output_cost": 0.0,
        "reason": "Free model for initial questions and context gathering"
    },
    TaskType.DEBATE: {
        "model": "glm-4-32b-0414-128k",
        "tier": ModelTier.CHEAP,
        "input_cost": 0.1,
        "output_cost": 0.1,
        "reason": "Extremely cheap model for reasoning rounds ($0.10 per 1M tokens)"
    },
    TaskType.SYNTHESIS: {
        "model": "glm-4.7",
        "tier": ModelTier.PREMIUM,
        "input_cost": 0.6,
        "output_cost": 2.2,
        "reason": "Premium model for highest quality final output"
    },
    TaskType.CODE: {
        "model": "glm-4.6",
        "tier": ModelTier.STANDARD,
        "input_cost": 0.6,
        "output_cost": 2.2,
        "reason": "Standard model optimized for coding tasks"
    },
    TaskType.CREATIVE: {
        "model": "glm-4.5",
        "tier": ModelTier.STANDARD,
        "input_cost": 0.6,
        "output_cost": 2.2,
        "reason": "Standard model for creative writing and brainstorming"
    },
    TaskType.GENERAL: {
        "model": "glm-4.7-flashx",
        "tier": ModelTier.CHEAP,
        "input_cost": 0.07,
        "output_cost": 0.4,
        "reason": "Balanced cheap model for general tasks"
    }
}

# Complete pricing catalog for all GLM models
PRICING_CATALOG = {
    "text": {
        "glm-4.7": {
            "input": 0.6,
            "output": 2.2,
            "cached_input": 0.11,
            "cached_storage": "Limited-time Free",
            "tier": ModelTier.PREMIUM
        },
        "glm-4.7-flashx": {
            "input": 0.07,
            "output": 0.4,
            "cached_input": 0.01,
            "cached_storage": "Limited-time Free",
            "tier": ModelTier.CHEAP
        },
        "glm-4.6": {
            "input": 0.6,
            "output": 2.2,
            "cached_input": 0.11,
            "cached_storage": "Limited-time Free",
            "tier": ModelTier.STANDARD
        },
        "glm-4.6v": {
            "input": 0.3,
            "output": 0.9,
            "cached_input": 0.05,
            "cached_storage": "Limited-time Free",
            "tier": ModelTier.STANDARD
        },
        "glm-4.6v-flashx": {
            "input": 0.04,
            "output": 0.4,
            "cached_input": 0.004,
            "cached_storage": "Limited-time Free",
            "tier": ModelTier.CHEAP
        },
        "glm-4.5": {
            "input": 0.6,
            "output": 2.2,
            "cached_input": 0.11,
            "cached_storage": "Limited-time Free",
            "tier": ModelTier.STANDARD
        },
        "glm-4.5v": {
            "input": 0.6,
            "output": 1.8,
            "cached_input": 0.11,
            "cached_storage": "Limited-time Free",
            "tier": ModelTier.STANDARD
        },
        "glm-4.5-x": {
            "input": 2.2,
            "output": 8.9,
            "cached_input": 0.45,
            "cached_storage": "Limited-time Free",
            "tier": ModelTier.PREMIUM
        },
        "glm-4.5-air": {
            "input": 0.2,
            "output": 1.1,
            "cached_input": 0.03,
            "cached_storage": "Limited-time Free",
            "tier": ModelTier.CHEAP
        },
        "glm-4.5-airx": {
            "input": 1.1,
            "output": 4.5,
            "cached_input": 0.22,
            "cached_storage": "Limited-time Free",
            "tier": ModelTier.PREMIUM
        },
        "glm-4-32b-0414-128k": {
            "input": 0.1,
            "output": 0.1,
            "cached_input": 0.0,
            "cached_storage": "-",
            "tier": ModelTier.CHEAP
        },
        "glm-4.7-flash": {
            "input": 0.0,
            "output": 0.0,
            "cached_input": 0.0,
            "cached_storage": "Free",
            "tier": ModelTier.FREE
        },
        "glm-4.6v-flash": {
            "input": 0.0,
            "output": 0.0,
            "cached_input": 0.0,
            "cached_storage": "Free",
            "tier": ModelTier.FREE
        },
        "glm-4.5-flash": {
            "input": 0.0,
            "output": 0.0,
            "cached_input": 0.0,
            "cached_storage": "Free",
            "tier": ModelTier.FREE
        }
    },
    "image": {
        "glm-image": 0.015,
        "cogview-4": 0.01
    },
    "video": {
        "cogvideox-3": 0.2,
        "viduq1-text": 0.4,
        "viduq1-image": 0.4,
        "viduq1-start-end": 0.4,
        "vidu2-image": 0.2,
        "vidu2-start-end": 0.2,
        "vidu2-reference": 0.4
    },
    "audio": {
        "glm-asr-2512": {
            "price": 0.03,
            "unit": "MTok",
            "equivalent": "Approximately $0.0024/minute"
        }
    },
    "tools": {
        "web_search": {
            "price": 0.01,
            "unit": "use"
        }
    },
    "agents": {
        "glm_slide_poster_agent": {
            "price": 0.7,
            "unit": "MTok",
            "note": "beta"
        },
        "general_purpose_translation": {
            "price": 3.0,
            "unit": "MTok"
        },
        "popular_effects_video_templates": {
            "price": 0.2,
            "unit": "video"
        }
    }
}

def get_model_for_task(task: TaskType) -> Dict[str, Any]:
    """
    Get the optimal model configuration for a given task type.
    
    Args:
        task: TaskType enum value
        
    Returns:
        Dictionary containing model name, tier, costs, and reasoning
    """
    return TASK_MODEL_MAPPING.get(task, TASK_MODEL_MAPPING[TaskType.GENERAL])

def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """
    Calculate the cost of an API call.
    
    Args:
        model: Model identifier
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens
        
    Returns:
        Total cost in USD
    """
    model_info = PRICING_CATALOG.get("text", {}).get(model, {})
    
    if not model_info:
        return 0.0
    
    input_cost = model_info.get("input", 0.0)
    output_cost = model_info.get("output", 0.0)
    
    # Prices are per 1M tokens
    total_cost = (input_tokens / 1_000_000) * input_cost + (output_tokens / 1_000_000) * output_cost
    
    return round(total_cost, 6)

def get_model_info(model: str) -> Optional[Dict[str, Any]]:
    """
    Get detailed information about a specific model.
    
    Args:
        model: Model identifier
        
    Returns:
        Dictionary with model details or None if not found
    """
    return PRICING_CATALOG.get("text", {}).get(model)

def list_models_by_tier(tier: ModelTier) -> list:
    """
    List all models of a specific pricing tier.
    
    Args:
        tier: ModelTier enum value
        
    Returns:
        List of model identifiers
    """
    models = []
    for model_name, model_info in PRICING_CATALOG.get("text", {}).items():
        if model_info.get("tier") == tier:
            models.append(model_name)
    return sorted(models)

def get_all_models() -> Dict[str, Dict[str, Any]]:
    """
    Get all available text models with their configurations.
    
    Returns:
        Dictionary mapping model names to their configurations
    """
    return PRICING_CATALOG.get("text", {})
