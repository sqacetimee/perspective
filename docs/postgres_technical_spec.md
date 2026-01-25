# Multi-Perspective AI: PostgreSQL Integration Technical Specification

## 1. Executive Summary

This document provides a technical specification for integrating PostgreSQL into the Multi-Perspective AI Reasoning System. The goal is to persist complete conversation records—including user prompts, clarification exchanges, agent debate rounds, and final synthesis—after each chat session concludes. This enables analytics, audit trails, user history, and future model training.

---

## 2. System Context

### 2.1 Current Architecture

The backend is a FastAPI application with the following key components:

| Component | File | Purpose |
|-----------|------|---------|
| API Layer | `main.py` | REST endpoints, WebSocket handling |
| State Machine | `state_machine.py` | Orchestrates the debate workflow |
| Session Store | `session_store.py` | Persists session data (currently file-based JSON) |
| Models | `models.py` | Pydantic data structures |
| AI Client | `ollama_client.py` | Communicates with LLM endpoints |

### 2.2 Data Flow

1. **User submits prompt** → `POST /api/chat/init`
2. **Clarification generated** → State: `CLARIFICATION_PENDING`
3. **User answers** → `POST /api/chat/clarify`
4. **Debate rounds execute** → State: `ROUND_PROCESSING` (Agent A → Agent B, repeated)
5. **Synthesis generated** → State: `SYNTHESIS_PROCESSING`
6. **Session complete** → State: `COMPLETE` ← **THIS IS THE TRIGGER POINT**

---

## 3. Database Schema Design

### 3.1 Core Tables

```sql
-- Primary session record
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(32) NOT NULL,  -- INIT, COMPLETE, ERROR, etc.
    
    -- User context
    original_prompt TEXT NOT NULL,
    clarification_questions TEXT,
    clarification_answers TEXT,
    merged_prompt TEXT,
    
    -- Final output
    final_synthesis TEXT,
    
    -- Metadata
    total_tokens_used INTEGER DEFAULT 0,
    error_message TEXT,
    
    -- Future: user association
    -- user_id UUID REFERENCES users(id)
);

-- Individual agent outputs
CREATE TABLE debate_rounds (
    id SERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    agent_type VARCHAR(16) NOT NULL,  -- 'A' (Expansion), 'B' (Compression), 'SYNTHESIS'
    content TEXT NOT NULL,
    tokens_used INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(session_id, round_number, agent_type)
);

-- Indexes for common queries
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_created ON sessions(created_at DESC);
CREATE INDEX idx_rounds_session ON debate_rounds(session_id);
```

### 3.2 Schema Rationale

- **UUID for session_id**: Matches existing Pydantic model, avoids sequential ID guessing.
- **Separate `debate_rounds` table**: Normalizes the 1:N relationship between sessions and outputs.
- **`agent_type` as VARCHAR**: Flexible for future agent types without schema migration.
- **CASCADE delete**: Cleaning up a session removes all associated rounds.

---

## 4. Integration Points

### 4.1 Trigger Location

The database write should occur in `state_machine.py` within the `process_synthesis` method, immediately after:

```python
session.state = SessionState.COMPLETE
await session_store.save(session)
```

Insert here:
```python
await session_store.sync_to_database(session)
```

### 4.2 Alternative: Event-Driven Architecture

For larger scale, consider emitting an event when state becomes `COMPLETE`, consumed by a separate worker:

```python
# In main.py background processing
if session.state == SessionState.COMPLETE:
    await event_bus.publish("session.complete", session.session_id)
```

A background consumer then handles the database write asynchronously, decoupling the user response from database latency.

---

## 5. Implementation Components

### 5.1 New Files

| File | Purpose |
|------|---------|
| `backend/app/database.py` | SQLAlchemy engine, session factory, ORM models |
| `backend/app/db_models.py` | (Optional) Separate ORM model definitions |

### 5.2 Modified Files

| File | Changes |
|------|---------|
| `session_store.py` | Add `sync_to_database(session)` method |
| `state_machine.py` | Call `sync_to_database` after `COMPLETE` |
| `config.py` | Add `DATABASE_URL` setting |
| `requirements.txt` | Add `sqlalchemy`, `psycopg2-binary`, `asyncpg` |

### 5.3 database.py Skeleton

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import get_settings

settings = get_settings()
DATABASE_URL = settings.database_url.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

---

## 6. Data Mapping

### 6.1 Pydantic → ORM Conversion

The `sync_to_database` method must convert `SessionData` (Pydantic) to ORM models:

```python
async def sync_to_database(self, session: SessionData) -> None:
    async with AsyncSessionLocal() as db:
        # Upsert session
        db_session = SessionModel(
            id=session.session_id,
            status=session.state.value,
            original_prompt=session.original_user_prompt,
            clarification_questions=session.clarification_questions,
            clarification_answers=session.clarification_answers,
            merged_prompt=session.merged_user_prompt,
            completed_at=datetime.now() if session.state == SessionState.COMPLETE else None,
        )
        
        # Extract synthesis from history
        synthesis = next((r for r in session.history if r.agent == AgentType.SYNTHESIS), None)
        if synthesis:
            db_session.final_synthesis = synthesis.content
        
        db_session.total_tokens_used = sum(r.tokens_used or 0 for r in session.history)
        
        await db.merge(db_session)
        
        # Insert rounds
        for output in session.history:
            round_record = DebateRoundModel(
                session_id=session.session_id,
                round_number=output.round_number,
                agent_type=output.agent.value,
                content=output.content,
                tokens_used=output.tokens_used,
            )
            await db.merge(round_record)
        
        await db.commit()
```

---

## 7. Configuration

### 7.1 Environment Variables

Add to `.env`:
```
DATABASE_URL=postgresql://perspective:YOUR_PASSWORD@localhost:5432/perspective_db
```

### 7.2 config.py Addition

```python
class Settings(BaseSettings):
    # ... existing fields ...
    database_url: str = "postgresql://localhost/perspective_db"
```

---

## 8. Migration Strategy

### 8.1 Initial Setup

```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql -c "CREATE USER perspective WITH PASSWORD 'secure_password';"
sudo -u postgres psql -c "CREATE DATABASE perspective_db OWNER perspective;"

# Apply schema
psql -h localhost -U perspective -d perspective_db -f schema.sql
```

### 8.2 Future Migrations

Consider using **Alembic** for version-controlled schema migrations:
```bash
pip install alembic
alembic init migrations
```

---

## 9. Testing Strategy

1. **Unit Tests**: Mock database, verify `sync_to_database` constructs correct ORM objects.
2. **Integration Tests**: Use a test PostgreSQL instance, run full debate, verify data persists.
3. **Manual Verification**:
   ```bash
   psql -h localhost -U perspective -d perspective_db
   SELECT id, status, LEFT(original_prompt, 50) FROM sessions ORDER BY created_at DESC LIMIT 5;
   SELECT session_id, round_number, agent_type FROM debate_rounds WHERE session_id = 'UUID';
   ```

---

## 10. Future Considerations

- **User Authentication**: Add `user_id` column to sessions for multi-user support.
- **Feedback Loop**: Add `user_rating` column for RLHF training data collection.
- **Analytics Views**: Create materialized views for dashboard metrics.
- **Backup Strategy**: Configure `pg_dump` cron job for daily backups.
- **Connection Pooling**: Use `asyncpg` with connection pooling for production scale.

---

## 11. Open Questions

1. Should we store the raw agent prompts (input to LLM) in addition to outputs?
2. Do we need soft-delete (archive) vs hard-delete?
3. What is the data retention policy?
4. Should we encrypt sensitive user prompts at rest?

---

*Document Version: 1.0 | Author: AI Assistant | Date: 2026-01-25*
