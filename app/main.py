import logging

from dotenv import load_dotenv
from fastapi import FastAPI
from sqlalchemy import text

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Bookshelf API")


@app.on_event("startup")
def check_db() -> None:
    from app.database import engine

    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    logger.info("Database connection OK")


@app.get("/health")
def health():
    return {"status": "ok"}
