import json
import logging
import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.adapters import get_llm_adapter
from app.adapters.llm import LLMAdapter
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.chat import ChatMessageRead, ChatRequest, ChatSessionRead
from app.services import chat as chat_service
from app.services import chat_sessions as sessions_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/sessions", response_model=list[ChatSessionRead])
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return sessions_service.list_sessions(db, current_user.id)


@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageRead])
def get_session_messages(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return sessions_service.get_messages(db, current_user.id, session_id)


@router.post("")
def post_chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    llm: LLMAdapter = Depends(get_llm_adapter),
):
    logger.info("Chat request from user %s", current_user.id)

    session = sessions_service.get_or_create_session(
        db, current_user.id, body.session_id, body.message
    )
    db_messages = sessions_service.get_messages(db, current_user.id, session.id)
    history = sessions_service.messages_as_history(db_messages) if db_messages else []

    messages = chat_service.build_messages(
        db=db,
        user_id=current_user.id,
        message=body.message,
        history=history,
    )

    user_id = current_user.id
    user_message = body.message
    session_id_str = str(session.id)
    accumulated: list[str] = []

    def generate():
        try:
            for chunk in chat_service.get_chat_stream(messages=messages, llm=llm):
                accumulated.append(chunk)
                yield f"data: {json.dumps({'chunk': chunk, 'session_id': session_id_str})}\n\n"
            yield "data: [DONE]\n\n"

            assistant_text = "".join(accumulated)
            if assistant_text:
                try:
                    sessions_service.add_turn(db, session, user_message, assistant_text)
                except Exception:
                    logger.error(
                        "Failed to persist chat turn for user %s session %s",
                        user_id, session_id_str, exc_info=True,
                    )
        except Exception:
            logger.error("LLM stream failed for user %s", user_id, exc_info=True)
            yield f"data: {json.dumps({'error': 'Reading companion is unavailable. Please try again.'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )
