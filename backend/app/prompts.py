from typing import List
from app.models import RoundOutput, AgentType

class PromptManager:
    """Manages all prompt templates and context assembly"""
    
from pathlib import Path

PROMPTS_DIR = Path(__file__).parent / "prompts"

def load_prompt(filename: str) -> str:
    """Load prompt text from file"""
    try:
        return (PROMPTS_DIR / filename).read_text(encoding="utf-8").strip()
    except Exception as e:
        # Fallback or error reporting
        return f"Error loading prompt {filename}: {str(e)}"

class PromptManager:
    """Manages all prompt templates and context assembly"""
    
    META_AGENT_TEMPLATE = load_prompt("meta_agent.txt")
    CLARIFICATION_TEMPLATE = load_prompt("clarification.txt")
    EXPANSION_SYSTEM_PROMPT = load_prompt("expansion.txt")
    COMPRESSION_SYSTEM_PROMPT = load_prompt("compression.txt")
    SYNTHESIS_SYSTEM_PROMPT = load_prompt("synthesis.txt")

    @staticmethod
    def format_clarification(user_prompt: str) -> str:
        """Generate clarification prompt"""
        return PromptManager.CLARIFICATION_TEMPLATE.format(user_prompt=user_prompt)
    
    @staticmethod
    def merge_context(user_prompt: str, answers: str) -> str:
        """Merge original prompt with clarification answers"""
        return f"""Original Question:
{user_prompt}

Additional Context (from clarification):
{answers}"""
    
    @staticmethod
    def format_agent_round(
        agent: AgentType,
        merged_context: str,
        history: List[RoundOutput],
        current_round: int
    ) -> str:
        """Format prompt for Expansion (A) or Compression (B) agent"""
        
        # Select system prompt
        if agent == AgentType.EXPANSION:
            system_prompt = PromptManager.EXPANSION_SYSTEM_PROMPT
        else:
            system_prompt = PromptManager.COMPRESSION_SYSTEM_PROMPT
        
        # Assemble full debate history
        transcript = ""
        if history:
            transcript_parts = []
            for output in history:
                transcript_parts.append(f"--- Round {output.round_number} | Agent {output.agent.value} ---\n{output.content}\n")
            transcript = "\n".join(transcript_parts)
            transcript = f"\n\nDEBATE HISTORY:\n{transcript}"
        
        return f"""[INST]
{system_prompt}

User Context (Merged with Clarification):
{merged_context}
{transcript}

This is Round {current_round}. Generate your response now.
[/INST]"""
    
    def format_meta(self, user_prompt: str) -> str:
        return self.META_AGENT_TEMPLATE.format(user_prompt=user_prompt)

    @staticmethod
    def format_synthesis(merged_context: str, history: List[RoundOutput]) -> str:
        """Format synthesis prompt with full debate transcript"""
        
        # Assemble complete debate transcript
        transcript_parts = []
        for output in history:
            transcript_parts.append(
                f"--- Round {output.round_number} | Agent {output.agent.value} ---\n{output.content}\n"
            )
        transcript = "\n".join(transcript_parts)
        
        round_count = max([o.round_number for o in history]) if history else 0
        
        system_prompt = PromptManager.SYNTHESIS_SYSTEM_PROMPT.format(round_count=round_count)
        
        return f"""[INST]
{system_prompt}

User Context:
{merged_context}

Complete Debate Transcript:
{transcript}

Generate final synthesis now.
[/INST]"""