import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.routers import auth, books, reading_logs  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.database import get_engine

    with get_engine().connect() as conn:
        conn.execute(text("SELECT 1"))
    logger.info("Database connection OK")
    yield


app = FastAPI(title="Bookshelf API", lifespan=lifespan)

_cors_origins = os.environ.get(
    "CORS_ORIGINS", "http://localhost:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(books.router)
app.include_router(reading_logs.router)


@app.get("/health")
def health():
    return {"status": "ok"}
