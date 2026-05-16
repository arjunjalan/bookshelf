import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.adapters import get_llm_adapter
from app.adapters.llm import LLMAdapter
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse
from app.services import chat as chat_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def post_chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    llm: LLMAdapter = Depends(get_llm_adapter),
):
    logger.info("Chat request from user %s", current_user.id)
    try:
        reply = chat_service.get_chat_response(
            db=db,
            user_id=current_user.id,
            message=body.message,
            history=[h.model_dump() for h in body.history],
            llm=llm,
        )
    except Exception:
        logger.error("LLM request failed for user %s", current_user.id, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Reading companion is unavailable. Please try again.",
        )
    return ChatResponse(reply=reply)
