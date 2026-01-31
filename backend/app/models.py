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
    EXPANSION = "EXPANSION"
    COMPRESSION = "COMPRESSION"
    SYNTHESIS = "SYNTHESIS"

class RoundOutput(BaseModel):
    round_number: int
    agent: AgentType
    content: str
    timestamp: float = Field(default_factory=lambda: datetime.now().timestamp())
    tokens_used: Optional[int] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    model_used: Optional[str] = None
    cost: Optional[float] = None
    
    class Config:
        protected_namespaces = ()

class CostTracking(BaseModel):
    total_cost: float = 0.0
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    model_costs: dict = Field(default_factory=dict)
    
    class Config:
        protected_namespaces = ()

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
    max_rounds: int = 3
    history: List[RoundOutput] = Field(default_factory=list)
    
    # Error handling
    error_message: Optional[str] = None
    retry_count: int = 0
    
    # Meta Agent Data
    selected_model: str = "glm-4.7"
    model_reasoning: Optional[str] = None
    
    # Cost tracking
    cost_tracking: CostTracking = Field(default_factory=CostTracking)
    
    class Config:
        protected_namespaces = ()

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
    cost: Optional[float] = None