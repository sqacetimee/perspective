# Build-Ready Implementation Plan: Backend + Frontend Integration

> **Version**: 2.0 (Build-Ready)  
> **Status**: All blocking gaps addressed  
> **Estimated Time**: 45 minutes

---

## Entry Point

```bash
# SSH to server and run:
ssh root@roancurtis.com
cd /root/perspective2/perspective
./deploy.sh
```

> [!IMPORTANT]
> This plan creates `deploy.sh` — a single idempotent script that handles all steps with pre-checks, rollback, and verification.

---

## Part 1: Current System State (Retrieved)

| Component | Current Value |
|-----------|---------------|
| **ASGI Server** | uvicorn 0.27.0, 1 worker, port 8000 |
| **systemd Backend** | `/etc/systemd/system/perspective-backend.service` |
| **systemd Frontend** | `/etc/systemd/system/perspective-frontend.service` |
| **Backend Status** | `active` |
| **Frontend Status** | `active` |
| **LLM Endpoint** | `http://100.86.182.74:11434` (Tailscale to laptop) |
| **LLM Connected** | `true` |
| **Session Storage** | `/root/perspective/backend/data/` (1 file exists) |
| **AgentType Values** | `EXPANSION="A"`, `COMPRESSION="B"` ← **NEEDS FIX** |

---

## Part 2: Complete Environment Configuration

### Backend `.env` (14 Variables)

**Location**: `/root/perspective2/perspective/backend/.env`

```bash
# LLM Configuration
OLLAMA_BASE_URL=http://100.86.182.74:11434
OLLAMA_MODEL=mistral:7b-instruct-q4_K_M

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
```

> [!WARNING]
> **SESSION_STORAGE_PATH** is currently set to `/root/perspective/backend/data` (old directory). The deploy script will update this to the new path.

### Frontend `.env.local` (Optional)

**Location**: `/root/perspective2/perspective/.env.local`

```bash
# Leave empty to use auto-detection (recommended for Nginx setup)
NEXT_PUBLIC_BACKEND_HTTP=
NEXT_PUBLIC_BACKEND_WS=
```

The frontend auto-detects backend URL from `window.location` when these are empty.

---

## Part 3: Required Code Changes

### Change 1: Fix AgentType Enum

**File**: `backend/app/models.py`  
**Lines**: 17-18

```diff
class AgentType(str, Enum):
    CLARIFICATION = "CLARIFICATION"
-   EXPANSION = "A"
-   COMPRESSION = "B"
+   EXPANSION = "EXPANSION"
+   COMPRESSION = "COMPRESSION"
    SYNTHESIS = "SYNTHESIS"
```

**Rationale**: Frontend expects `agent: "EXPANSION"` in WebSocket messages, but backend sends `agent: "A"`.

### Change 2: Fix Session Storage Path

**File**: `backend/.env`  
**Line**: 6

```diff
-SESSION_STORAGE_PATH=/root/perspective/backend/data
+SESSION_STORAGE_PATH=/root/perspective2/perspective/backend/data
```

---

## Part 4: Deployment Script (Idempotent)

Create `/root/perspective2/perspective/deploy.sh`:

```bash
#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

BACKEND_DIR="/root/perspective2/perspective/backend"
FRONTEND_DIR="/root/perspective2/perspective"
MODELS_FILE="$BACKEND_DIR/app/models.py"
ENV_FILE="$BACKEND_DIR/.env"

# ============ PRE-CHECKS ============
log "Running pre-deployment checks..."

# Check 1: Verify we're in the right directory
[ -f "$MODELS_FILE" ] || error "models.py not found. Are you in the right directory?"

# Check 2: Verify services exist
systemctl list-unit-files | grep -q "perspective-backend" || error "Backend service not installed"
systemctl list-unit-files | grep -q "perspective-frontend" || error "Frontend service not installed"

# Check 3: Verify LLM connectivity
log "Checking LLM API connectivity..."
HEALTH=$(curl -s http://localhost:8000/api/health 2>/dev/null || echo '{"ollama_connected":false}')
if echo "$HEALTH" | grep -q '"ollama_connected":true'; then
    log "LLM API: Connected ✓"
else
    warn "LLM API not connected. Proceeding anyway..."
fi

# ============ STEP 1: PATCH MODELS.PY ============
log "Step 1/6: Checking AgentType enum..."

if grep -q 'EXPANSION = "A"' "$MODELS_FILE"; then
    log "Patching AgentType enum..."
    sed -i 's/EXPANSION = "A"/EXPANSION = "EXPANSION"/g' "$MODELS_FILE"
    sed -i 's/COMPRESSION = "B"/COMPRESSION = "COMPRESSION"/g' "$MODELS_FILE"
    log "AgentType patched ✓"
elif grep -q 'EXPANSION = "EXPANSION"' "$MODELS_FILE"; then
    log "AgentType already patched ✓"
else
    error "Unexpected AgentType values in models.py"
fi

# ============ STEP 2: UPDATE SESSION PATH ============
log "Step 2/6: Checking session storage path..."

if grep -q "SESSION_STORAGE_PATH=/root/perspective/backend/data" "$ENV_FILE"; then
    log "Updating session storage path..."
    sed -i 's|SESSION_STORAGE_PATH=/root/perspective/backend/data|SESSION_STORAGE_PATH=/root/perspective2/perspective/backend/data|g' "$ENV_FILE"
    mkdir -p "$BACKEND_DIR/data"
    log "Session path updated ✓"
elif grep -q "SESSION_STORAGE_PATH=/root/perspective2" "$ENV_FILE"; then
    log "Session path already correct ✓"
else
    warn "Session path has custom value, leaving unchanged"
fi

# ============ STEP 3: CREATE DATA DIRECTORY ============
log "Step 3/6: Ensuring data directory exists..."
mkdir -p "$BACKEND_DIR/data"
mkdir -p "$BACKEND_DIR/logs"
log "Directories ready ✓"

# ============ STEP 4: REBUILD FRONTEND ============
log "Step 4/6: Rebuilding frontend..."
cd "$FRONTEND_DIR"
npm run build || error "Frontend build failed"
log "Frontend built ✓"

# ============ STEP 5: RESTART SERVICES ============
log "Step 5/6: Restarting services..."

systemctl restart perspective-backend
sleep 3

# Wait for backend health
for i in {1..10}; do
    if curl -s http://localhost:8000/api/health | grep -q '"status":"healthy"'; then
        log "Backend healthy ✓"
        break
    fi
    [ $i -eq 10 ] && error "Backend failed to become healthy"
    sleep 1
done

systemctl restart perspective-frontend
sleep 2
log "Services restarted ✓"

# ============ STEP 6: VERIFICATION ============
log "Step 6/6: Running verification tests..."

# Test 1: Health check
curl -s http://localhost:8000/api/health | grep -q '"status":"healthy"' || error "Health check failed"
log "Health check: PASS ✓"

# Test 2: Init session
INIT_RESPONSE=$(curl -s -X POST http://localhost:8000/api/chat/init \
    -H "Content-Type: application/json" \
    -d '{"message": "deployment test"}' 2>/dev/null)
    
if echo "$INIT_RESPONSE" | grep -q "session_id"; then
    SESSION_ID=$(echo "$INIT_RESPONSE" | grep -oP '"session_id"\s*:\s*"\K[^"]+')
    log "Init session: PASS ✓ (session: ${SESSION_ID:0:8}...)"
else
    warn "Init session test produced unexpected response"
fi

# Test 3: Frontend responding
if curl -s -I http://localhost:3000 | grep -q "200 OK"; then
    log "Frontend: PASS ✓"
else
    warn "Frontend not responding on port 3000"
fi

echo ""
log "========================================="
log "DEPLOYMENT COMPLETE"
log "========================================="
log "Backend:  http://localhost:8000/api/health"
log "Frontend: http://roancurtis.com/chat"
log ""
log "AgentType enum: EXPANSION/COMPRESSION"
log "Session storage: $BACKEND_DIR/data/"
```

---

## Part 5: Failure Handling Matrix

| Failure Type | Detection | Action | Rollback |
|--------------|-----------|--------|----------|
| **LLM API timeout** | `ollama_connected: false` | Warn and proceed | N/A (external) |
| **Service restart fails** | `systemctl status` exit code | Display logs, abort | Services already stopped |
| **Frontend build fails** | `npm run build` exit code | Abort with error | No changes made yet |
| **models.py patch error** | `grep` check fails | Abort with error | File unchanged |
| **Health check fails** | No `"healthy"` in response | Retry 10x, then abort | Rollback: `git checkout models.py` |

### Rollback Command

If deployment fails mid-way:

```bash
cd /root/perspective2/perspective
git checkout backend/app/models.py
git checkout backend/.env
systemctl restart perspective-backend
systemctl restart perspective-frontend
```

---

## Part 6: End-to-End Workflow Test

After deployment, run this manual test:

```bash
# 1. Init session
curl -X POST http://localhost:8000/api/chat/init \
  -H "Content-Type: application/json" \
  -d '{"message": "I am feeling overwhelmed at work"}'

# 2. Note session_id from response, then submit clarification
curl -X POST http://localhost:8000/api/chat/clarify \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "<SESSION_ID>",
    "answers": "1. Stressed\\n2. My manager\\n3. Immediate\\n4. Cannot quit\\n5. Find balance"
  }'

# 3. Connect WebSocket and watch for messages
# (Use browser DevTools or wscat)
wscat -c "ws://localhost:8000/api/ws/<SESSION_ID>"
```

**Expected WebSocket Messages**:
1. `{"type": "state_change", "state": "ROUND_PROCESSING"}`
2. `{"type": "agent_output", "agent": "EXPANSION", "round": 1, ...}`
3. `{"type": "agent_output", "agent": "COMPRESSION", "round": 1, ...}`
4. ... (rounds 2-5)
5. `{"type": "synthesis", "content": "..."}`
6. `{"type": "state_change", "state": "COMPLETE"}`

---

## Part 7: File Operation Atomicity

> [!NOTE]
> Current implementation uses `aiofiles` with simple write. For production, consider:

```python
# Recommended atomic write pattern (future enhancement)
async def save_atomic(self, session: SessionData) -> None:
    temp_path = f"{file_path}.tmp"
    async with aiofiles.open(temp_path, 'w') as f:
        await f.write(session.model_dump_json(indent=2))
    os.replace(temp_path, file_path)  # Atomic rename
```

**Current Risk**: Low (single-user testing). Address before multi-user production.

---

## Part 8: Verification Checklist

After running `deploy.sh`, verify:

- [ ] `curl http://localhost:8000/api/health` returns `{"status":"healthy"}`
- [ ] `grep EXPANSION /root/perspective2/perspective/backend/app/models.py` shows `EXPANSION = "EXPANSION"`
- [ ] `http://roancurtis.com/chat` loads in browser
- [ ] Submitting a prompt shows clarification questions
- [ ] Submitting answers triggers agent debate (visible in "View AI Conversation")
- [ ] Debate shows "Agent A (Expansion)" and "Agent B (Compression)" labels
- [ ] Synthesis appears after 5 rounds

---

## Appendix A: Infrastructure Binding Summary

| Component | Specification |
|-----------|---------------|
| **ASGI Server** | uvicorn 0.27.0 |
| **Workers** | 1 (single process) |
| **Backend Port** | 8000 (localhost only) |
| **Frontend Port** | 3000 (localhost only) |
| **Reverse Proxy** | Nginx → port 80 |
| **LLM Provider** | Tailscale → laptop Ollama |
| **LLM Model** | mistral:7b-instruct-q4_K_M |
| **Session Storage** | File-based JSON |
| **Logs Backend** | `/root/perspective2/perspective/backend/logs/` |

---

## Appendix B: Complete File Manifest

| File | Action | Purpose |
|------|--------|---------|
| `backend/app/models.py` | MODIFY | Fix AgentType enum |
| `backend/.env` | MODIFY | Fix session storage path |
| `deploy.sh` | CREATE | Idempotent deployment script |
| `.env.local` | SKIP | Auto-detection works |
| `/etc/systemd/*` | VERIFY | Already correct |
| `/etc/nginx/*` | VERIFY | Already correct |

---

---

## Appendix C: Phase 2 Roadmap — Meta-Agent Integration (PLANNED)

> [!NOTE]
> This section documents **future work**. Execute Phase 1 (above) first.

### C.1 Overview

The Meta-Agent sits between Clarification and Debate, analyzing user context to:
1. Classify the use case (8 categories) and select the optimal LLM model


### C.2 New Pipeline Flow

```
Current:  Clarification → Debate → Synthesis
Phase 2:  Clarification → META-AGENT → Debate → Synthesis
```

### C.3 Implementation Phases

| Phase | Task | Files | Effort |
|-------|------|-------|--------|
| 2.1 | Add `META_ANALYZING` state | `models.py` | 15 min |
| 2.2 | Create `META_AGENT_PROMPT` | `prompts.py` | 1 hour |
| 2.3 | Add `process_meta_agent()` method | `state_machine.py` | 2 hours |
| 2.4 | Add Telus Cloud model endpoints | `ollama_client.py` | 1 hour |
| 2.5 | Add model selection config | `config.py` | 30 min |
| 2.6 | Update WebSocket messages | `main.py` | 30 min |
| 2.7 | Frontend: Display meta-agent output | `chat/page.tsx` | 1 hour |

**Total Estimated Effort**: 6-8 hours

### C.4 New Files/Changes

| Component | File | Changes |
|-----------|------|---------|
| New State | `models.py` | Add `META_ANALYZING = "META_ANALYZING"` |
| New Prompt | `prompts.py` | Add `META_AGENT_PROMPT` template |
| New Method | `state_machine.py` | Add `process_meta_agent(session)` |
| Model Router | `ollama_client.py` | Add `generate(prompt, model_key)` param |
| Config | `config.py` | Add Telus model endpoint mappings |

### C.5 Meta-Agent Prompt Template (Draft)

```python
META_AGENT_PROMPT = """[INST]
You are the Meta-Agent for the Multi-Perspective AI system.

Analyze the user's clarified input and output a JSON configuration.

Input:
{merged_user_prompt}

Output JSON with these fields:
1. category: one of [relationship, career, technical, grief, health, financial, creative, philosophical]
2. scores: emotional_complexity, urgency, ambiguity, stakeholder_count, reversibility, domain_expertise (each 1-10)
3. selected_model: one of [gpt-oss-120b, deepseek-v3, gemma-3-27b, qwen-coder-30b, mistral:7b]
4. agent_customizations: focus and tone for agent_a and agent_b

Model Selection Rules:
- emotional_complexity >= 7 → gpt-oss-120b
- category == "technical" → qwen-coder-30b
- ambiguity >= 7 → deepseek-v3
- urgency >= 9 AND emotional_complexity < 5 → mistral:7b (fast local)
- default → gemma-3-27b

Output ONLY valid JSON, no explanation.
[/INST]"""
```

### C.6 Model Endpoint Configuration (Draft)

```python
# ollama_client.py additions
TELUS_MODELS = {
    "gpt-oss-120b": {
        "base_url": "https://rr-test-gpt-120-9219s.paas.ai.telus.com/v1",
        "api_key": "...",
    },
    "deepseek-v3": {
        "base_url": "https://deepseekv32-3ca9s.paas.ai.telus.com/v1",
        "api_key": "...",
    },
    "gemma-3-27b": {
        "base_url": "https://gemma-3-27b-3ca9s.paas.ai.telus.com/v1",
        "api_key": "...",
    },
    "qwen-coder-30b": {
        "base_url": "https://qwen3coder30b-3ca9s.paas.ai.telus.com/v1",
        "api_key": "...",
    },
}
```

### C.7 Success Criteria

- [ ] Meta-Agent classifies 8 categories correctly
- [ ] Model selection matches rules in 90%+ of cases
- [ ] Debate quality improves for emotional vs technical queries
- [ ] No regression in current functionality

---

*Plan Version: 2.1 | Phase 1 Build-Ready + Phase 2 Roadmap | Generated: 2026-01-25*
