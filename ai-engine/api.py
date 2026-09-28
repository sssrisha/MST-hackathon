from fastapi import FastAPI
from risk_engine import calculate_risk

app = FastAPI()


@app.get("/")
def home():
    return {
        "message": "OpenTender AI Engine Running"
    }


@app.post("/analyze")
def analyze():

    from sample_data import bids

    return calculate_risk(bids) 