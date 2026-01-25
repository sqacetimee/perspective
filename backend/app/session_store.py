import json
import os
import aiofiles
from pathlib import Path
from typing import Optional
from uuid import UUID
from app.models import SessionData
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

class SessionStore:
    """File-based session persistence"""
    
    def __init__(self):
        self.storage_path = Path(settings.session_storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
    
    def _get_file_path(self, session_id: UUID) -> Path:
        return self.storage_path / f"{session_id}.json"
    
    async def save(self, session: SessionData) -> None:
        """Save session to disk"""
        file_path = self._get_file_path(session.session_id)
        async with aiofiles.open(file_path, 'w') as f:
            await f.write(session.model_dump_json(indent=2))
        logger.debug(f"Session {session.session_id} saved")
    
    async def load(self, session_id: UUID) -> Optional[SessionData]:
        """Load session from disk"""
        file_path = self._get_file_path(session_id)
        if not file_path.exists():
            logger.warning(f"Session {session_id} not found")
            return None
        
        async with aiofiles.open(file_path, 'r') as f:
            data = await f.read()
            session = SessionData.model_validate_json(data)
            logger.debug(f"Session {session_id} loaded")
            return session
    
    async def delete(self, session_id: UUID) -> bool:
        """Delete session from disk"""
        file_path = self._get_file_path(session_id)
        if file_path.exists():
            file_path.unlink()
            logger.info(f"Session {session_id} deleted")
            return True
        return False

# Singleton instance
session_store = SessionStore()
