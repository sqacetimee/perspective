from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
from uuid import UUID, uuid4
from datetime import datetime

class SessionState(str, Enum):
    INIT = "INIT"
    CLARIFICATION_PENDING = "CLARIFICATION_PENDING"
    CLARIFICATION_COMPLETE = "CLARIFICATION_COMPLETE"
    ROUND_PROCESSING = "ROUND_PROCESSING"
    SYNTHESIS_PROCESSING = "SYNTHESIS_PROCESSING"
    COMPLETE = "COMPLETE"
    ERROR = "ERROR"

class AgentType(str, Enum):
    CLARIFICATION = "CLARIFICATION"
    EXPANSION = "A"
    COMPRESSION = "B"
    SYNTHESIS = "SYNTHESIS"

class RoundOutput(BaseModel):
    round_number: int
    agent: AgentType
    content: str
    timestamp: float = Field(default_factory=lambda: datetime.now().timestamp())
    tokens_used: Optional[int] = None

class SessionData(BaseModel):
    session_id: UUID = Field(default_factory=uuid4)
    state: SessionState = SessionState.INIT
    created_at: float = Field(default_factory=lambda: datetime.now().timestamp())
    
    # User context
    original_user_prompt: str
    clarification_questions: Optional[str] = None
    clarification_answers: Optional[str] = None
    merged_user_prompt: Optional[str] = None
    
    # Debate state
    current_round: int = 0
    max_rounds: int = 5
    history: List[RoundOutput] = []
    
    # Error handling
    error_message: Optional[str] = None
    retry_count: int = 0

class InitRequest(BaseModel):
    message: str

class ClarifyRequest(BaseModel):
    session_id: UUID
    answers: str

class WSMessage(BaseModel):
    type: str  # "state_change" | "agent_output" | "synthesis" | "error"
    session_id: UUID
    content: Optional[str] = None
    round: Optional[int] = None
    agent: Optional[AgentType] = None
    state: Optional[SessionState] = None
    timestamp: float = Field(default_factory=lambda: datetime.now().timestamp())
