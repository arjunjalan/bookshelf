import logging
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.chat import ChatMessage, ChatSession, MessageRole

logger = logging.getLogger(__name__)

_MAX_SESSIONS = 5


def list_sessions(db: Session, user_id: uuid.UUID) -> list[ChatSession]:
    return (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user_id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )


def create_session(db: Session, user_id: uuid.UUID, first_message: str) -> ChatSession:
    existing = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user_id)
        .order_by(ChatSession.updated_at.asc())
        .all()
    )
    while len(existing) >= _MAX_SESSIONS:
        db.delete(existing.pop(0))
    db.flush()

    session = ChatSession(user_id=user_id, title=first_message[:60].rstrip())
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_or_create_session(
    db: Session,
    user_id: uuid.UUID,
    session_id: uuid.UUID | None,
    first_message: str,
) -> ChatSession:
    if session_id is not None:
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if session is None or session.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        return session
    return create_session(db, user_id, first_message)


def get_messages(
    db: Session,
    user_id: uuid.UUID,
    session_id: uuid.UUID,
) -> list[ChatMessage]:
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if session is None or session.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    # Fetch most recent 50, then reverse to chronological for rendering/LLM context
    rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(50)
        .all()
    )
    return list(reversed(rows))


def messages_as_history(messages: list[ChatMessage]) -> list[dict]:
    return [{"role": m.role.value, "content": m.content} for m in messages]


def add_turn(
    db: Session,
    session: ChatSession,
    user_content: str,
    assistant_content: str,
) -> None:
    db.add(ChatMessage(session_id=session.id, role=MessageRole.USER, content=user_content))
    db.add(ChatMessage(session_id=session.id, role=MessageRole.ASSISTANT, content=assistant_content))
    db.query(ChatSession).filter(ChatSession.id == session.id).update({"updated_at": func.now()})
    db.commit()
