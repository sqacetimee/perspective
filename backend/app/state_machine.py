import logging
from typing import Dict, Any
from app.models import SessionData, SessionState, AgentType, RoundOutput
from app.prompts import PromptManager
from app.ollama_client import ollama_client
from app.session_store import session_store

logger = logging.getLogger(__name__)

class StateMachineOrchestrator:
    """Core state machine managing debate workflow"""
    
    def __init__(self):
        self.prompts = PromptManager()
    
    async def process_init(self, session: SessionData) -> SessionData:
        """
        State: INIT
        Action: Generate clarification questions
        Next State: CLARIFICATION_PENDING
        """
        logger.info(f"[{session.session_id}] Processing INIT")
        
        try:
            # Generate clarification prompt
            prompt = self.prompts.format_clarification(session.original_user_prompt)
            
            # Call Ollama
            result = await ollama_client.generate(prompt)
            
            # Store clarification questions
            session.clarification_questions = result["response"]
            session.state = SessionState.CLARIFICATION_PENDING
            
            # Save progress
            await session_store.save(session)
            
            logger.info(f"[{session.session_id}] Clarification questions generated")
            return session
            
        except Exception as e:
            logger.error(f"[{session.session_id}] INIT failed: {e}")
            session.state = SessionState.ERROR
            session.error_message = str(e)
            await session_store.save(session)
            raise
    
    async def process_clarification(self, session: SessionData, on_output=None) -> SessionData:
        """
        State: CLARIFICATION_PENDING
        Action: Merge user prompt with clarification answers
        Next State: ROUND_PROCESSING (start Round 1)
        """
        logger.info(f"[{session.session_id}] Processing CLARIFICATION")
        
        # Merge context
        session.merged_user_prompt = self.prompts.merge_context(
            session.original_user_prompt,
            session.clarification_answers
        )
        session.state = SessionState.CLARIFICATION_COMPLETE
        session.current_round = 1
        
        await session_store.save(session)
        
        # Immediately start Round 1 with callback
        return await self.process_round(session, on_output=on_output)
    
    async def process_round(self, session: SessionData, on_output=None) -> SessionData:
        """
        State: ROUND_PROCESSING
        Action: Run Expansion (A) then Compression (B) for current round
        Next State: ROUND_PROCESSING (next round) OR SYNTHESIS_PROCESSING
        
        Args:
            on_output: Optional callback(output: RoundOutput) called after each agent finishes
        """
        round_num = session.current_round
        logger.info(f"[{session.session_id}] Processing Round {round_num}")
        
        session.state = SessionState.ROUND_PROCESSING
        await session_store.save(session)
        
        try:
            # Step 1: Expansion Agent (A)
            logger.info(f"[{session.session_id}] Round {round_num} - Agent A (Expansion)")
            prompt_a = self.prompts.format_agent_round(
                AgentType.EXPANSION,
                session.merged_user_prompt,
                session.history,
                round_num
            )
            result_a = await ollama_client.generate(prompt_a)
            
            # Store Agent A output
            output_a = RoundOutput(
                round_number=round_num,
                agent=AgentType.EXPANSION,
                content=result_a["response"],
                tokens_used=result_a["tokens_generated"]
            )
            session.history.append(output_a)
            await session_store.save(session)
            
            # Broadcast Agent A output immediately
            if on_output:
                await on_output(output_a)
            
            # Step 2: Compression Agent (B)
            logger.info(f"[{session.session_id}] Round {round_num} - Agent B (Compression)")
            prompt_b = self.prompts.format_agent_round(
                AgentType.COMPRESSION,
                session.merged_user_prompt,
                session.history,
                round_num
            )
            result_b = await ollama_client.generate(prompt_b)
            
            # Store Agent B output
            output_b = RoundOutput(
                round_number=round_num,
                agent=AgentType.COMPRESSION,
                content=result_b["response"],
                tokens_used=result_b["tokens_generated"]
            )
            session.history.append(output_b)
            await session_store.save(session)
            
            # Broadcast Agent B output immediately
            if on_output:
                await on_output(output_b)
            
            # Check if we should continue or synthesize
            if round_num >= session.max_rounds:
                logger.info(f"[{session.session_id}] Completed {session.max_rounds} rounds, moving to synthesis")
                return await self.process_synthesis(session, on_output)
            else:
                # Continue to next round
                session.current_round += 1
                await session_store.save(session)
                logger.info(f"[{session.session_id}] Round {round_num} complete, continuing to Round {session.current_round}")
                return await self.process_round(session, on_output)
                
        except Exception as e:
            logger.error(f"[{session.session_id}] Round {round_num} failed: {e}")
            session.state = SessionState.ERROR
            session.error_message = str(e)
            await session_store.save(session)
            raise
    
    async def process_synthesis(self, session: SessionData, on_output=None) -> SessionData:
        """
        State: SYNTHESIS_PROCESSING
        Action: Generate final synthesis from debate history
        Next State: COMPLETE
        """
        logger.info(f"[{session.session_id}] Processing SYNTHESIS")
        
        session.state = SessionState.SYNTHESIS_PROCESSING
        await session_store.save(session)
        
        try:
            # Generate synthesis prompt
            prompt = self.prompts.format_synthesis(
                session.merged_user_prompt,
                session.history
            )
            
            # Call Ollama
            result = await ollama_client.generate(prompt)
            
            # Store synthesis as final output
            synthesis = RoundOutput(
                round_number=0,  # Special marker
                agent=AgentType.SYNTHESIS,
                content=result["response"],
                tokens_used=result["tokens_generated"]
            )
            session.history.append(synthesis)
            session.state = SessionState.COMPLETE
            
            await session_store.save(session)
            
            # Broadcast synthesis immediately
            if on_output:
                await on_output(synthesis)
            
            logger.info(f"[{session.session_id}] Synthesis complete")
            return session
            
        except Exception as e:
            logger.error(f"[{session.session_id}] Synthesis failed: {e}")
            session.state = SessionState.ERROR
            session.error_message = str(e)
            await session_store.save(session)
            raise

# Singleton instance
orchestrator = StateMachineOrchestrator()
