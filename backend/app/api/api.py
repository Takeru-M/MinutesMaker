from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.agendas import router as agendas_router
from app.api.v1.endpoints.guide import router as guide_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.meeting_qa import router as meeting_qa_router
from app.api.v1.endpoints.meetings import router as meetings_router
from app.api.v1.endpoints.minutes import router as minutes_router
from app.api.v1.endpoints.notices import router as notices_router
from app.api.v1.endpoints.repository import router as repository_router

api_router = APIRouter()
api_router.include_router(health_router, prefix="/api/v1", tags=["health"])
api_router.include_router(auth_router, prefix="/api/v1")
api_router.include_router(agendas_router, prefix="/api/v1")
api_router.include_router(repository_router, prefix="/api/v1")
api_router.include_router(guide_router, prefix="/api/v1")
api_router.include_router(meetings_router, prefix="/api/v1")
api_router.include_router(meeting_qa_router, prefix="/api/v1")
api_router.include_router(minutes_router, prefix="/api/v1")
api_router.include_router(notices_router, prefix="/api/v1")
