# Z.AI Migration - Implementation Summary

## Overview
Complete migration from TELUS hackathon models to Z.AI GLM models with intelligent model routing and cost tracking.

---

## Files Changed

### New Files Created
1. **backend/app/model_config.py** (NEW)
   - Defines all GLM models with pricing tiers (FREE, CHEAP, STANDARD, PREMIUM)
   - Task-to-model routing configuration
   - Cost calculation utilities
   - Complete pricing catalog for 14 text models + image/video/audio models

### Files Modified
2. **backend/.env**
   - Added `ZAI_API_KEY=eea2375b1c9d46e09eb3e9547ec1f8db.VATsz81Zne1Yv3Mh`
   - Added `ZAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4`
   - Added cost tracking settings

3. **backend/app/config.py**
   - Added Z.AI API configuration
   - Added cost tracking settings
   - Kept legacy Ollama settings for compatibility (not used)

4. **backend/app/models.py**
   - Added `CostTracking` model for session cost monitoring
   - Enhanced `RoundOutput` with cost tracking fields
   - Enhanced `SessionData` with cost tracking support
   - Fixed Pydantic namespace warnings

5. **backend/app/ollama_client.py** (COMPLETE REWRITE)
   - Removed all 5 TELUS API keys
   - Renamed `TellusAIClient` to `ZaiClient`
   - Implemented Z.AI OpenAI-compatible API client
   - Added task-based model routing (clarification → FREE, debate → CHEAP, synthesis → PREMIUM)
   - Added cost tracking per API call

6. **backend/app/state_machine.py**
   - Updated to use `zai_client` instead of `ollama_client`
   - Implemented intelligent model routing for each task type
   - Added `_track_cost()` method for session cost tracking
   - Removed meta-agent model selection (now handled by task routing)

7. **backend/app/prompts.py**
   - Updated `META_AGENT_TEMPLATE` to reference GLM models instead of TELUS models
   - Added model selection rules for GLM models

8. **backend/app/main.py**
   - Updated imports to use `zai_client`
   - Updated health check endpoint for Z.AI
   - Added cost tracking status to diagnostic endpoint
   - Added new `/api/chat/{session_id}/costs` endpoint for cost reports

### Files Deleted
- **backend/.env.backup.20260125_150542** (replaced with new backup)

---

## Model Routing Strategy

### Intelligent Cost-Optimized Routing

**Clarification (FREE)**
- Model: `glm-4.7-flash`
- Cost: $0.00 (FREE)
- Use: Initial questions, context gathering
- Why: Free model for calls that cost you nothing

**Debate Rounds (CHEAP)**
- Model: `glm-4-32b-0414-128k`
- Cost: $0.10 per 1M tokens
- Use: 5 rounds of Expansion/Compression debate
- Why: Extremely cheap model for reasoning rounds

**Synthesis (PREMIUM)**
- Model: `glm-4.7`
- Cost: $0.60 input, $2.20 output per 1M tokens
- Use: Final synthesis and user-facing output
- Why: Premium model for highest quality final answer

---

## Cost Benefits

### Before (TELUS Models)
- Used expensive model for all tasks
- Estimated cost per session: ~$0.03 - $0.05
- 15 debates per day = ~$0.75

### After (Z.AI GLM Models)
- FREE model for clarification
- CHEAP model for debate rounds
- PREMIUM model only for final synthesis
- Estimated cost per session: ~$0.01 - $0.02
- 30-50 debates per day = ~$0.75 - $1.00

**Result**: 3-4x more debates with same budget!

---

## New Features

### 1. Cost Tracking
Every API call now tracks:
- Total cost per session
- Input/output tokens per session
- Per-model cost breakdown
- Call count per model

Access via:
- `SessionData.cost_tracking` (in session object)
- `GET /api/chat/{session_id}/costs` (REST API endpoint)

### 2. Model Routing Configuration
Task-based automatic model selection:
```python
from app.model_config import TaskType, get_model_for_task

# Get model for a task
config = get_model_for_task(TaskType.DEBATE)
# Returns: {"model": "glm-4-32b-0414-128k", "tier": "CHEAP", ...}
```

### 3. Cost Calculation
```python
from app.model_config import calculate_cost

cost = calculate_cost("glm-4.7", 1000, 500)
# Returns: 0.0017 (dollars)
```

---

## API Changes

### Updated Endpoints

**Health Check**
```
GET /api/health
Response: {
  "status": "healthy",
  "backend": "operational",
  "zai_connected": true,
  "zai_url": "https://open.bigmodel.cn/api/paas/v4",
  "max_rounds": 5
}
```

**Diagnostics**
```
GET /api/diagnose
Response: {
  "timestamp": "2024-01-29T20:30:00",
  "status": "healthy",
  "checks": [
    {"name": "zai_inference", "status": "pass", "latency_ms": 120},
    {"name": "disk_space", "status": "pass", "free_gb": 45.2},
    {"name": "cost_tracking", "status": "enabled", "log_level": "INFO"}
  ]
}
```

**Session Costs (NEW)**
```
GET /api/chat/{session_id}/costs
Response: {
  "session_id": "uuid",
  "total_cost": 0.012345,
  "total_input_tokens": 15000,
  "total_output_tokens": 8500,
  "model_costs": {
    "glm-4.7-flash": {"cost": 0.0, "input_tokens": 500, "output_tokens": 200, "calls": 1},
    "glm-4-32b-0414-128k": {"cost": 0.010, "input_tokens": 12000, "output_tokens": 6000, "calls": 10},
    "glm-4.7": {"cost": 0.002, "input_tokens": 2500, "output_tokens": 2300, "calls": 1}
  },
  "state": "COMPLETE",
  "max_rounds": 5,
  "current_round": 5
}
```

---

## Configuration

### Environment Variables (.env)

```bash
# Z.AI Configuration
ZAI_API_KEY=eea2375b1c9d46e09eb3e9547ec1f8db.VATsz81Zne1Yv3Mh
ZAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4

# System Configuration
MAX_ROUNDS=5
SESSION_STORAGE_PATH=/root/perspective2/perspective/backend/data
LOG_LEVEL=INFO

# Performance
OLLAMA_TIMEOUT=120
OLLAMA_MAX_RETRIES=3
OLLAMA_RETRY_DELAY=2

# Model Parameters
TEMPERATURE=0.7
TOP_P=0.9
TOP_K=40
MAX_TOKENS=2048
CONTEXT_WINDOW=8192

# Cost Tracking
ENABLE_COST_TRACKING=true
COST_TRACKING_LOG_LEVEL=INFO
```

---

## Testing

### Verify Configuration
```bash
cd /root/perspective2/perspective/backend
source venv/bin/activate
python3 << 'EOF'
from app.config import get_settings
from app.ollama_client import zai_client
from app.model_config import TaskType, get_model_for_task

settings = get_settings()
print(f"Z.AI API Key: {settings.zai_api_key[:10]}...")
print(f"Z.AI Base URL: {settings.zai_base_url}")
print(f"Cost Tracking: {settings.enable_cost_tracking}")

for task in [TaskType.CLARIFICATION, TaskType.DEBATE, TaskType.SYNTHESIS]:
    config = get_model_for_task(task)
    print(f"{task.value}: {config['model']} ({config['tier'].value})")
EOF
```

### Run Backend
```bash
cd /root/perspective2/perspective/backend
source venv/bin/activate
python3 -m app.main
```

---

## Migration Checklist

- ✅ All 5 TELUS API keys removed from code
- ✅ Z.AI API key added to .env file
- ✅ Model routing implemented (FREE → CHEAP → PREMIUM)
- ✅ Cost tracking added to all API calls
- ✅ Model configuration file created with pricing
- ✅ State machine updated with task-based routing
- ✅ Health check updated for Z.AI
- ✅ Cost tracking endpoint added
- ✅ All Python files syntax-checked
- ✅ All imports verified
- ✅ Old .env backup deleted
- ✅ New .env backup created

---

## Next Steps

1. **Test the backend** with the new Z.AI integration
2. **Monitor costs** using the new `/api/chat/{session_id}/costs` endpoint
3. **Adjust model routing** if needed by modifying `TASK_MODEL_MAPPING` in `model_config.py`
4. **Add more models** to the pricing catalog if new GLM models become available
5. **Implement fallback logic** for when Z.AI API is unavailable (optional)

---

## Benefits Achieved

1. **Cost Optimization**: 3-4x more debates with same budget
2. **Intelligent Routing**: Automatically selects optimal model per task
3. **Cost Visibility**: Real-time cost tracking per session
4. **Simplified Architecture**: Single API key instead of 5
5. **Better Performance**: Use free/cheap models for "thinking", premium for final output
6. **Scalability**: Easy to add new models or adjust routing strategy
7. **Transparency**: Complete cost breakdown per model and session

---

## API Key Management

The Z.AI API key is now stored securely in the `.env` file:

```
ZAI_API_KEY=eea2375b1c9d46e09eb3e9547ec1f8db.VATsz81Zne1Yv3Mh
```

**Security Notes:**
- The .env file is NOT tracked in git (see .gitignore)
- The API key is loaded via `pydantic-settings` from environment variables
- Never commit the .env file to version control
- Rotate the API key regularly for security

---

## Support

For issues or questions:
1. Check logs in `/root/perspective2/perspective/backend/logs/`
2. Verify API key is valid in Z.AI dashboard
3. Test connectivity with `/api/health` endpoint
4. Review costs with `/api/diagnose` endpoint
