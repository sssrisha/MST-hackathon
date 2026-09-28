from contextlib import asynccontextmanager

from fastapi import FastAPI

from database import Base, engine
from models import Bid, Tender, User
from routes import auth, bids, tenders
from services.security import validate_security_config


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

app.include_router(auth.router)
app.include_router(tenders.router)
app.include_router(bids.router)

@app.get("/")
def home():
    return {
        "message": "Welcome to OpenTender",
        "status": "Backend is running"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}