from contextlib import asynccontextmanager
import os
from urllib.parse import urlsplit

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from models import Bid, Tender, User
from routes import auth, bids, tenders, workflow
from services.security import validate_security_config

DEFAULT_CORS_ORIGINS = ("http://localhost:5173", "http://127.0.0.1:5173")


def get_cors_origins() -> list[str]:
    configured = os.getenv("CORS_ORIGINS")
    origins = (
        [origin.strip() for origin in configured.split(",") if origin.strip()]
        if configured is not None
        else list(DEFAULT_CORS_ORIGINS)
    )
    if not origins:
        raise RuntimeError("CORS_ORIGINS must contain at least one explicit origin")
    for origin in origins:
        parsed = urlsplit(origin)
        if (
            origin == "*"
            or parsed.scheme not in {"http", "https"}
            or not parsed.netloc
            or parsed.path
            or parsed.query
            or parsed.fragment
            or parsed.username
            or parsed.password
        ):
            raise RuntimeError("CORS_ORIGINS must contain explicit HTTP(S) origins without paths")
    return origins


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_security_config()
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="OpenTender API",
    description="AI-powered blockchain-based tender platform",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600,
)

app.include_router(auth.router)
app.include_router(tenders.router)
app.include_router(bids.router)
app.include_router(workflow.router)

@app.get("/")
def home():
    return {
        "message": "Welcome to OpenTender",
        "status": "Backend is running"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}