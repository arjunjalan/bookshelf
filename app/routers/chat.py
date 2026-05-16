import json
import logging

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.adapters import get_llm_adapter
from app.adapters.llm import LLMAdapter
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.chat import ChatRequest
from app.services import chat as chat_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("")
def post_chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    llm: LLMAdapter = Depends(get_llm_adapter),
):
    logger.info("Chat request from user %s", current_user.id)
    messages = chat_service.build_messages(
        db=db,
        user_id=current_user.id,
        message=body.message,
        history=[h.model_dump() for h in body.history],
    )

    def generate():
        try:
            for chunk in chat_service.get_chat_stream(messages=messages, llm=llm):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception:
            logger.error("LLM stream failed for user %s", current_user.id, exc_info=True)
            yield f"data: {json.dumps({'error': 'Reading companion is unavailable. Please try again.'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )
