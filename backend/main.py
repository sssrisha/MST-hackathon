from fastapi import FastAPI

app = FastAPI(
    title="OpenTender API",
    description="AI-powered blockchain-based tender platform",
    version="1.0.0"
)

@app.get("/")
def home():
    return {
        "message": "Welcome to OpenTender",
        "status": "Backend is running"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}