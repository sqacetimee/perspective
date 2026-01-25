from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict
from uuid import UUID
import logging
import asyncio
from datetime import datetime

from app.models import (
    SessionData, SessionState, InitRequest, ClarifyRequest, WSMessage
)
from app.session_store import session_store
from app.state_machine import orchestrator
from app.ollama_client import ollama_client
from app.config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

settings = get_settings()
app = FastAPI(title="Multi-Perspective AI Reasoning System")

# CORS configuration (adjust origins for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://roancurtis.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active WebSocket connections
active_connections: Dict[UUID, WebSocket] = {}

# =============== REST ENDPOINTS ===============

@app.get("/api/health")
async def health_check():
    """System health check"""
    ollama_healthy = await ollama_client.health_check()
    return {
        "status": "healthy" if ollama_healthy else "degraded",
        "backend": "operational",
        "ollama_connected": ollama_healthy,
        "ollama_url": settings.ollama_base_url,
        "max_rounds": settings.max_rounds
    }

@app.get("/api/diagnose")
async def active_diagnostic():
    """Active health check including inference probe"""
    report = {
        "timestamp": datetime.now().isoformat(),
        "status": "healthy",
        "checks": []
    }
    
    # 1. Ollama Probe
    try:
        probe_start = datetime.now()
        await ollama_client.generate("test")
        probe_duration = (datetime.now() - probe_start).total_seconds()
        report["checks"].append({
            "name": "ollama_inference", 
            "status": "pass", 
            "latency_ms": int(probe_duration * 1000)
        })
    except Exception as e:
        report["status"] = "degraded"
        report["checks"].append({
            "name": "ollama_inference", 
            "status": "fail", 
            "error": str(e)
        })

    # 2. Disk Space
    import shutil
    try:
        total, used, free = shutil.disk_usage(settings.session_storage_path)
        report["checks"].append({
            "name": "disk_space",
            "status": "pass",
            "free_gb": round(free / (1024**3), 2)
        })
    except Exception as e:
        report["checks"].append({"name": "disk_space", "status": "fail", "error": str(e)})

    return report

@app.post("/api/chat/init")
async def init_session(request: InitRequest, background_tasks: BackgroundTasks):
    """
    Initialize new session
    Returns: session_id and triggers background clarification generation
    """
    # Create session
    session = SessionData(
        original_user_prompt=request.message,
        max_rounds=settings.max_rounds
    )
    await session_store.save(session)
    
    logger.info(f"Session {session.session_id} created")
    
    # Start background processing
    background_tasks.add_task(process_session_background, session.session_id)
    
    return {
        "session_id": str(session.session_id),
        "status": session.state.value
    }

@app.post("/api/chat/clarify")
async def submit_clarification(request: ClarifyRequest, background_tasks: BackgroundTasks):
    """
    Submit clarification answers
    Triggers background debate processing
    """
    # Load session
    session = await session_store.load(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.state != SessionState.CLARIFICATION_PENDING:
        raise HTTPException(status_code=400, detail=f"Invalid state: {session.state}")
    
    # Update session
    session.clarification_answers = request.answers
    session.state = SessionState.CLARIFICATION_COMPLETE
    await session_store.save(session)
    
    logger.info(f"Session {session.session_id} clarification received")
    
    # Start background processing
    background_tasks.add_task(process_session_background, session.session_id)
    
    return {"status": "processing_started"}

@app.get("/api/chat/{session_id}")
async def get_session(session_id: UUID):
    """Get current session state"""
    session = await session_store.load(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return session

# =============== WEBSOCKET ===============

@app.websocket("/api/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket connection for real-time updates
    Streams: state changes, agent outputs, synthesis
    """
    await websocket.accept()
    active_connections[session_id] = websocket
    
    logger.info(f"WebSocket connected for session {session_id}")
    
    try:
        # Send initial state
        session = await session_store.load(session_id)
        if session:
            await websocket.send_json(WSMessage(
                type="state_change",
                session_id=session_id,
                state=session.state
            ).model_dump(mode='json'))
            
            # If clarification ready, send it
            if session.clarification_questions:
                await websocket.send_json(WSMessage(
                    type="agent_output",
                    session_id=session_id,
                    agent="CLARIFICATION",
                    content=session.clarification_questions
                ).model_dump(mode='json'))
        
        # Keep connection alive
        while True:
            data = await websocket.receive_text()
            # Echo pings
            if data == "ping":
                await websocket.send_text("pong")
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    finally:
        if session_id in active_connections:
            del active_connections[session_id]

async def broadcast_to_session(session_id: UUID, message: WSMessage):
    """Send message to WebSocket if connected"""
    # Convert UUID to string for dictionary lookup (WebSocket stores str keys)
    sid = str(session_id)
    if sid in active_connections:
        try:
            await active_connections[sid].send_json(message.model_dump(mode='json'))
        except Exception as e:
            logger.error(f"Failed to broadcast to {session_id}", exc_info=True)

# =============== BACKGROUND PROCESSING ===============

async def process_session_background(session_id: UUID):
    """
    Background task to process session through state machine
    Broadcasts updates via WebSocket
    """
    try:
        session = await session_store.load(session_id)
        if not session:
            logger.error(f"Session {session_id} not found for background processing")
            return
        
        logger.info(f"[{session_id}] Background processing started, state: {session.state}")
        
        # State machine loop
        while session.state not in [SessionState.COMPLETE, SessionState.ERROR]:
            
            if session.state == SessionState.CLARIFICATION_PENDING:
                # Should not happen in background task unless triggered prematurely
                logger.warning(f"[{session_id}] Background task called in PENDING state. Stopping.")
                return

            if session.state == SessionState.INIT:
                session = await orchestrator.process_init(session)
                
                # Broadcast clarification questions
                await broadcast_to_session(session_id, WSMessage(
                    type="agent_output",
                    session_id=session_id,
                    agent="CLARIFICATION",
                    content=session.clarification_questions
                ))
                
            elif session.state == SessionState.CLARIFICATION_COMPLETE:
                # Create broadcast callback for real-time output updates
                async def broadcast_output(output):
                    msg_type = "synthesis" if output.agent.value == "SYNTHESIS" else "agent_output"
                    await broadcast_to_session(session_id, WSMessage(
                        type=msg_type,
                        session_id=session_id,
                        round=output.round_number,
                        agent=output.agent,
                        content=output.content
                    ))
                
                # Start processing with callback - all rounds and synthesis will broadcast immediately
                session = await orchestrator.process_clarification(session, on_output=broadcast_output)
                
            elif session.state == SessionState.ROUND_PROCESSING:
                # Create broadcast callback for real-time output updates
                async def broadcast_output(output):
                    msg_type = "synthesis" if output.agent.value == "SYNTHESIS" else "agent_output"
                    await broadcast_to_session(session_id, WSMessage(
                        type=msg_type,
                        session_id=session_id,
                        round=output.round_number,
                        agent=output.agent,
                        content=output.content
                    ))
                
                session = await orchestrator.process_round(session, on_output=broadcast_output)
                
            elif session.state == SessionState.SYNTHESIS_PROCESSING:
                # Create broadcast callback
                async def broadcast_output(output):
                    await broadcast_to_session(session_id, WSMessage(
                        type="synthesis",
                        session_id=session_id,
                        content=output.content
                    ))
                
                session = await orchestrator.process_synthesis(session, on_output=broadcast_output)
            
            # Broadcast state change
            await broadcast_to_session(session_id, WSMessage(
                type="state_change",
                session_id=session_id,
                state=session.state
            ))
        
        logger.info(f"[{session_id}] Background processing complete, final state: {session.state}")
        
    except Exception as e:
        logger.error(f"[{session_id}] Background processing failed: {e}", exc_info=True)
        
        # Update session to ERROR state
        try:
            session = await session_store.load(session_id)
            if session:
                session.state = SessionState.ERROR
                session.error_message = str(e)
                await session_store.save(session)
                
                # Broadcast error
                await broadcast_to_session(session_id, WSMessage(
                    type="error",
                    session_id=session_id,
                    content=str(e)
                ))
        except Exception as save_error:
            logger.error(f"Failed to save error state: {save_error}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

from fastapi.middleware.cors import CORSMiddleware
