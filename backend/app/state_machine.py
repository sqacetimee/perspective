import logging
from typing import Dict, Any, Optional
from app.models import SessionData, SessionState, AgentType, RoundOutput
from app.prompts import PromptManager
from app.ollama_client import zai_client
from app.session_store import session_store
from app.model_config import TaskType

logger = logging.getLogger(__name__)

class StateMachineOrchestrator:
    """Core state machine managing debate workflow with Z.AI model routing"""
    
    def __init__(self):
        self.prompts = PromptManager()
    
    def _track_cost(self, session: SessionData, result: Dict[str, Any]) -> None:
        """
        Track API costs for a session.
        
        Args:
            session: Current session data
            result: API response with cost information
        """
        cost = result.get("cost", 0.0)
        input_tokens = result.get("input_tokens", 0)
        output_tokens = result.get("output_tokens", 0)
        model = result.get("model_used", "unknown")
        
        # Update session cost tracking
        session.cost_tracking.total_cost += cost
        session.cost_tracking.total_input_tokens += input_tokens
        session.cost_tracking.total_output_tokens += output_tokens
        
        # Track per-model costs
        if model not in session.cost_tracking.model_costs:
            session.cost_tracking.model_costs[model] = {
                "cost": 0.0,
                "input_tokens": 0,
                "output_tokens": 0,
                "calls": 0
            }
        
        session.cost_tracking.model_costs[model]["cost"] += cost
        session.cost_tracking.model_costs[model]["input_tokens"] += input_tokens
        session.cost_tracking.model_costs[model]["output_tokens"] += output_tokens
        session.cost_tracking.model_costs[model]["calls"] += 1
        
        logger.info(
            f"[{session.session_id}] Cost tracking - Model: {model}, "
            f"Call cost: ${cost:.6f}, Total session cost: ${session.cost_tracking.total_cost:.6f}"
        )
    
    async def process_init(self, session: SessionData) -> SessionData:
        """
        State: INIT
        Action: Run CLARIFICATION AGENT using FREE model
        Next State: CLARIFICATION_PENDING or CLARIFICATION_COMPLETE
        """
        logger.info(f"[{session.session_id}] Processing INIT")
        
        try:
            # Clarification Agent (Uses FREE GLM-4.7-Flash model)
            logger.info(f"[{session.session_id}] Running Clarification Agent (FREE model)...")
            prompt = self.prompts.format_clarification(session.original_user_prompt)
            
            # Use FREE model for clarification
            result = await zai_client.generate(prompt, task_type=TaskType.CLARIFICATION)
            
            # Track cost
            self._track_cost(session, result)
            
            # Store clarification questions
            session.clarification_questions = result["response"]
            session.selected_model = result["model_used"]
            session.model_reasoning = "Auto-selected for clarification task"
            
            # Smart Auto-Skip Logic
            if session.clarification_questions and "NO CLARIFICATION NEEDED" in session.clarification_questions:
                logger.info(f"[{session.session_id}] Auto-skipping clarification (Sufficient context)")
                session.clarification_answers = "None (Clarification skipped - context sufficient)"
                session.state = SessionState.CLARIFICATION_COMPLETE
            else:
                session.state = SessionState.CLARIFICATION_PENDING
            
            # Save progress
            await session_store.save(session)
            
            logger.info(f"[{session.session_id}] Init processing done. State: {session.state}")
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
        if session.clarification_answers:
            session.merged_user_prompt = self.prompts.merge_context(
                session.original_user_prompt,
                session.clarification_answers
            )
        else:
            session.merged_user_prompt = session.original_user_prompt
        
        session.state = SessionState.CLARIFICATION_COMPLETE
        session.current_round = 1
        
        await session_store.save(session)
        
        # Immediately start Round 1 with callback
        return await self.process_round(session, on_output=on_output)
    
    async def process_round(self, session: SessionData, on_output=None) -> SessionData:
        """
        State: ROUND_PROCESSING
        Action: Run Expansion (A) then Compression (B) for current round using CHEAP model
        Next State: ROUND_PROCESSING (next round) OR SYNTHESIS_PROCESSING
        
        Args:
            on_output: Optional callback(output: RoundOutput) called after each agent finishes
        """
        round_num = session.current_round
        logger.info(f"[{session.session_id}] Processing Round {round_num}")
        
        session.state = SessionState.ROUND_PROCESSING
        await session_store.save(session)
        
        try:
            # Use merged prompt or fall back to original
            merged_context = session.merged_user_prompt or session.original_user_prompt
            
            # Step 1: Expansion Agent (A)
            logger.info(f"[{session.session_id}] Round {round_num} - Agent A (Expansion) - CHEAP model")
            prompt_a = self.prompts.format_agent_round(
                AgentType.EXPANSION,
                merged_context,
                session.history,
                round_num
            )
            result_a = await zai_client.generate(prompt_a, task_type=TaskType.DEBATE)
            
            # Track cost
            self._track_cost(session, result_a)
            
            # Store Agent A output
            output_a = RoundOutput(
                round_number=round_num,
                agent=AgentType.EXPANSION,
                content=result_a["response"],
                tokens_used=result_a["tokens_generated"],
                input_tokens=result_a["input_tokens"],
                output_tokens=result_a["output_tokens"],
                model_used=result_a["model_used"],
                cost=result_a["cost"]
            )
            session.history.append(output_a)
            await session_store.save(session)
            
            # Broadcast Agent A output immediately
            if on_output:
                await on_output(output_a)
            
            # Step 2: Compression Agent (B)
            logger.info(f"[{session.session_id}] Round {round_num} - Agent B (Compression) - CHEAP model")
            prompt_b = self.prompts.format_agent_round(
                AgentType.COMPRESSION,
                merged_context,
                session.history,
                round_num
            )
            result_b = await zai_client.generate(prompt_b, task_type=TaskType.DEBATE)
            
            # Track cost
            self._track_cost(session, result_b)
            
            # Store Agent B output
            output_b = RoundOutput(
                round_number=round_num,
                agent=AgentType.COMPRESSION,
                content=result_b["response"],
                tokens_used=result_b["tokens_generated"],
                input_tokens=result_b["input_tokens"],
                output_tokens=result_b["output_tokens"],
                model_used=result_b["model_used"],
                cost=result_b["cost"]
            )
            session.history.append(output_b)
            await session_store.save(session)
            
            # Broadcast Agent B output immediately
            if on_output:
                await on_output(output_b)
            
            # Check if we should continue or synthesize
            # Calculate total agent outputs so far
            total_outputs = len(session.history)
            
            # Each round has 2 agents (A and B), so divide by 2
            total_rounds = total_outputs // 2
            
            if total_rounds >= session.max_rounds:
                logger.info(f"[{session.session_id}] Completed {session.max_rounds} rounds ({total_rounds} total outputs), moving to synthesis")
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
        Action: Generate final synthesis from debate history using PREMIUM model
        Next State: COMPLETE
        """
        logger.info(f"[{session.session_id}] Processing SYNTHESIS")
        
        session.state = SessionState.SYNTHESIS_PROCESSING
        await session_store.save(session)
        
        try:
            # Use merged prompt or fall back to original
            merged_context = session.merged_user_prompt or session.original_user_prompt
            
            # Generate synthesis prompt
            prompt = self.prompts.format_synthesis(
                merged_context,
                session.history
            )
            
            # Call Z.AI with PREMIUM model
            result = await zai_client.generate(prompt, task_type=TaskType.SYNTHESIS)
            
            # Track cost
            self._track_cost(session, result)
            
            # Store synthesis as final output
            synthesis = RoundOutput(
                round_number=0,  # Special marker
                agent=AgentType.SYNTHESIS,
                content=result["response"],
                tokens_used=result["tokens_generated"],
                input_tokens=result["input_tokens"],
                output_tokens=result["output_tokens"],
                model_used=result["model_used"],
                cost=result["cost"]
            )
            session.history.append(synthesis)
            session.state = SessionState.COMPLETE
            
            await session_store.save(session)
            
            # Broadcast synthesis immediately
            if on_output:
                await on_output(synthesis)
            
            # Log final cost summary
            logger.info(
                f"[{session.session_id}] Session complete - Total cost: ${session.cost_tracking.total_cost:.6f}, "
                f"Input tokens: {session.cost_tracking.total_input_tokens}, "
                f"Output tokens: {session.cost_tracking.total_output_tokens}"
            )
            
            return session
            
        except Exception as e:
            logger.error(f"[{session.session_id}] Synthesis failed: {e}")
            session.state = SessionState.ERROR
            session.error_message = str(e)
            await session_store.save(session)
            raise

# Singleton instance
orchestrator = StateMachineOrchestrator()
