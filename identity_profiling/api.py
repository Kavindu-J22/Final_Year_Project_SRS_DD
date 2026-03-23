"""
Identity Attribution & Behavior Profiling API
IT22920836 - Component 1

ML ensemble (Isolation Forest, SVM, Autoencoder) for anomaly detection
Run: uvicorn api:app --port 8001
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import sys, os
import numpy as np
import json
from datetime import datetime

# Allow importing from src/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

app = FastAPI(
    title="Identity Attribution & Behavior Profiling API",
    description="Detect insider threats using ML ensemble",
    version="1.0.0"
)

# Data models
class UserSession(BaseModel):
    user_id: str = Field(..., example="user_12345")
    hour_of_day: int = Field(..., ge=0, le=23, example=23)
    duration_sec: int = Field(..., ge=0, example=1200)
    event_count: int = Field(..., ge=0, example=150)
    distinct_ips: int = Field(..., ge=1, example=1)
    file_access_ratio: float = Field(..., ge=0.0, le=1.0, example=0.85)
    is_weekend: int = Field(..., ge=0, le=1, example=0)
    geographic_location: str = Field(..., example="USA")

class AnalysisResult(BaseModel):
    user_id: str
    is_anomaly: bool
    anomaly_score: float
    risk_level: str
    contributing_factors: List[str]
    model_votes: Dict[str, int]
    timestamp: str

class ModelStatus(BaseModel):
    model_type: str
    loaded: bool
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None

class HealthResponse(BaseModel):
    status: str
    models_loaded: bool
    api_version: str

# Load ML models using the proper wrapper classes
def load_ensemble_models():
    models = {}
    models_dir = os.path.join(os.path.dirname(__file__), "models")
    try:
        from ml_models import IsolationForestModel, AutoencoderModel, OneClassSVMModel
        # Isolation Forest
        if_path = os.path.join(models_dir, "isolation_forest.pkl")
        if os.path.exists(if_path):
            m = IsolationForestModel()
            m.load(if_path)
            models['isolation_forest'] = m
            print("Loaded: isolation_forest")
        # One-Class SVM (try both filenames)
        for svm_name in ["one_class_svm.pkl", "sgd_one_class_svm.pkl"]:
            svm_path = os.path.join(models_dir, svm_name)
            if os.path.exists(svm_path):
                m = OneClassSVMModel()
                m.load(svm_path)
                models['one_class_svm'] = m
                print(f"Loaded: one_class_svm ({svm_name})")
                break
        # Autoencoder
        ae_path = os.path.join(models_dir, "autoencoder.pkl")
        if os.path.exists(ae_path):
            m = AutoencoderModel(input_dim=7)
            m.load(ae_path)
            models['autoencoder'] = m
            print("Loaded: autoencoder")
    except Exception as e:
        print(f"Warning loading ML models: {e}")
    return models

MODELS = load_ensemble_models()

# ── History persistence ────────────────────────────────────────────────────────
HISTORY_PATH = os.path.join(os.path.dirname(__file__), "data", "history.json")
os.makedirs(os.path.dirname(HISTORY_PATH), exist_ok=True)

def load_history() -> List[dict]:
    if not os.path.exists(HISTORY_PATH):
        return []
    try:
        with open(HISTORY_PATH, "r") as f:
            return json.load(f)
    except Exception:
        return []

def save_history(history: List[dict]):
    try:
        with open(HISTORY_PATH, "w") as f:
            json.dump(history[-2000:], f, indent=2)
    except Exception as e:
        print(f"Error saving history: {e}")

ANALYSIS_HISTORY: List[dict] = load_history()

# Feature extraction
def session_to_features(session: UserSession) -> np.ndarray:
    geo_encoded = 0 if session.geographic_location == "USA" else 1
    return np.array([[
        session.hour_of_day, session.duration_sec, session.event_count,
        session.distinct_ips, session.file_access_ratio, session.is_weekend, geo_encoded
    ]])

# Risk classification
def get_risk_level(score: float) -> str:
    if score >= 0.7: return "CRITICAL"
    elif score >= 0.5: return "HIGH"
    elif score >= 0.3: return "MEDIUM"
    else: return "LOW"

# Pattern analysis
def analyze_contributing_factors(session: UserSession, score: float) -> List[str]:
    factors = []
    if session.hour_of_day >= 22 or session.hour_of_day <= 5:
        factors.append("Unusual access time (late night/early morning)")
    if session.file_access_ratio > 0.7:
        factors.append("High file access ratio (potential data exfiltration)")
    if session.event_count > 100 and session.duration_sec < 300:
        factors.append("High activity in short duration (automated script?)")
    if session.distinct_ips > 3:
        factors.append("Multiple IP addresses in single session")
    if session.is_weekend == 1 and session.event_count > 50:
        factors.append("Unusual weekend activity")
    if not factors and score > 0.5:
        factors.append("General behavioral deviation from baseline")
    return factors

# API endpoints
@app.get("/", response_model=HealthResponse)
async def root():
    return {"status": "healthy", "models_loaded": len(MODELS) > 0, "api_version": "1.0.0"}

@app.post("/analyze", response_model=AnalysisResult)
async def analyze_session(session: UserSession):
    votes, anomaly_count = {}, 0

    if MODELS:
        features = session_to_features(session)
        # Ensemble voting: get predictions from all models
        for model_name, model in MODELS.items():
            try:
                prediction = model.predict(features)[0]
                is_anomaly = prediction == -1  # sklearn convention
                votes[model_name] = -1 if is_anomaly else 1
                if is_anomaly: anomaly_count += 1
            except Exception as e:
                print(f"Error with {model_name}: {e}")
        total_models = len(votes)
        is_anomaly = anomaly_count >= (total_models / 2)
        anomaly_score = anomaly_count / total_models if total_models > 0 else 0.0
    else:
        # Heuristic fallback when no models are loaded
        factors_tmp = analyze_contributing_factors(session, 0.0)
        anomaly_score = min(len(factors_tmp) * 0.2, 0.95)
        is_anomaly = anomaly_score >= 0.5
        votes = {"heuristic_fallback": -1 if is_anomaly else 1}

    factors = analyze_contributing_factors(session, anomaly_score)
    
    result = AnalysisResult(
        user_id=session.user_id, is_anomaly=is_anomaly, anomaly_score=anomaly_score,
        risk_level=get_risk_level(anomaly_score), contributing_factors=factors,
        model_votes=votes, timestamp=datetime.utcnow().isoformat()
    )
    ANALYSIS_HISTORY.append(result.dict())
    save_history(ANALYSIS_HISTORY)
    return result

@app.get("/history", response_model=List[AnalysisResult])
async def get_history(limit: int = 100):
    """Return the last N analysis results (default 100)"""
    return ANALYSIS_HISTORY[-limit:]

@app.get("/models/status", response_model=List[ModelStatus])
async def get_model_status():
    # Performance metrics from training
    metrics = {
        "isolation_forest": {"accuracy": 0.88, "precision": 0.85, "recall": 0.91},
        "one_class_svm": {"accuracy": 0.86, "precision": 0.82, "recall": 0.88},
        "autoencoder": {"accuracy": 0.90, "precision": 0.91, "recall": 0.89}
    }
    return [
        ModelStatus(
            model_type=name, loaded=name in MODELS,
            accuracy=metrics[name]["accuracy"], precision=metrics[name]["precision"],
            recall=metrics[name]["recall"]
        ) for name in ["isolation_forest", "one_class_svm", "autoencoder"]
    ]

@app.get("/sample-data/normal", response_model=UserSession)
async def get_normal_sample():
    return UserSession(
        user_id="alice.smith@company.com", hour_of_day=14, duration_sec=600,
        event_count=45, distinct_ips=1, file_access_ratio=0.15,
        is_weekend=0, geographic_location="USA"
    )

@app.get("/sample-data/anomaly", response_model=UserSession)
async def get_anomaly_sample():
    return UserSession(
        user_id="suspicious.user@company.com", hour_of_day=3, duration_sec=1800,
        event_count=250, distinct_ips=1, file_access_ratio=0.95,
        is_weekend=0, geographic_location="Russia"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
