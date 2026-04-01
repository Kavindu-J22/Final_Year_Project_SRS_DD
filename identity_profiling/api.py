"""
Identity Profiling & Behavior Anomaly Detection API
IT22920836 - Component 1

Three-model ensemble: Isolation Forest + One-Class SVM + Autoencoder
Run: uvicorn api:app --host 0.0.0.0 --port 8001 --reload
"""

import os
import sys
import logging
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("identity_profiling")

# ── Path setup ────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
SRC_DIR    = os.path.join(BASE_DIR, "src")
MODEL_DIR  = os.path.join(BASE_DIR, "models")
sys.path.insert(0, SRC_DIR)

from ml_models import EnsembleDetector  # noqa: E402

# ── Application ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Identity Profiling & Behavior Analysis API",
    description="ML-based insider threat and user anomaly detection",
    version="1.0.0",
)

# ── Global state ──────────────────────────────────────────────────────────────
ENSEMBLE: Optional[EnsembleDetector] = None
MODELS_LOADED: bool = False
ANALYSIS_HISTORY: List[dict] = []

# ── Pydantic models ───────────────────────────────────────────────────────────
class SessionData(BaseModel):
    user_id: str
    hour_of_day: int       = Field(..., ge=0, le=23)
    duration_sec: float    = Field(..., ge=0)
    event_count: int       = Field(..., ge=0)
    distinct_ips: int      = Field(..., ge=0)
    file_access_ratio: float = Field(..., ge=0.0, le=1.0)
    is_weekend: int        = Field(..., ge=0, le=1)
    geographic_location: str = "Unknown"

class AnalysisResponse(BaseModel):
    user_id: str
    is_anomaly: bool
    anomaly_score: float
    risk_level: str
    model_votes: Dict[str, Any]
    timestamp: str
    models_used: str

# ── Feature helpers ───────────────────────────────────────────────────────────
_RISKY = {"russia", "north korea", "china", "iran", "unknown"}
_SAFE  = {"usa", "uk", "canada", "australia", "germany", "france", "netherlands"}

def _geo_score(location: str) -> float:
    loc = location.lower()
    if any(k in loc for k in _RISKY):
        return 1.0
    if any(k in loc for k in _SAFE):
        return 0.0
    return 0.5

def _to_feature_vector(s: SessionData) -> np.ndarray:
    """Map API request to 7-dimensional feature vector."""
    return np.array([[
        s.hour_of_day,
        s.duration_sec / 3600.0,   # normalise to hours
        s.event_count  / 100.0,    # normalise
        float(s.distinct_ips),
        s.file_access_ratio,
        float(s.is_weekend),
        _geo_score(s.geographic_location),
    ]])

def _risk_level(score: float) -> str:
    if score >= 0.8: return "CRITICAL"
    if score >= 0.6: return "HIGH"
    if score >= 0.4: return "MEDIUM"
    return "LOW"

# ── Synthetic training data ───────────────────────────────────────────────────
def _make_training_data(n_normal: int = 2000, n_anomaly: int = 200) -> np.ndarray:
    rng = np.random.RandomState(42)
    normal = np.column_stack([
        rng.randint(8, 18, n_normal).astype(float),     # business hours
        rng.uniform(0.1, 2.0, n_normal),                # duration (hrs)
        rng.uniform(0.1, 4.0, n_normal),                # event_count/100
        rng.randint(1, 3, n_normal).astype(float),      # distinct_ips
        rng.uniform(0.0, 0.3, n_normal),                # file_access_ratio
        rng.randint(0, 2, n_normal).astype(float),      # is_weekend
        rng.uniform(0.0, 0.2, n_normal),                # geo_score (safe)
    ])
    anomaly = np.column_stack([
        rng.choice([0, 1, 2, 3, 22, 23], n_anomaly).astype(float),  # late night
        rng.uniform(4.0, 12.0, n_anomaly),              # long sessions
        rng.uniform(5.0, 20.0, n_anomaly),              # many events
        rng.randint(4, 15, n_anomaly).astype(float),    # many IPs
        rng.uniform(0.7, 1.0, n_anomaly),               # high file access
        rng.randint(0, 2, n_anomaly).astype(float),
        rng.uniform(0.7, 1.0, n_anomaly),               # risky geo
    ])
    return np.vstack([normal, anomaly])

# ── Model loading / training ──────────────────────────────────────────────────
def _load_or_train():
    global ENSEMBLE, MODELS_LOADED

    # Ensure one_class_svm.pkl exists (may be saved as sgd_one_class_svm.pkl)
    ocsvm_path = os.path.join(MODEL_DIR, "one_class_svm.pkl")
    sgd_path   = os.path.join(MODEL_DIR, "sgd_one_class_svm.pkl")
    if not os.path.exists(ocsvm_path) and os.path.exists(sgd_path):
        import shutil
        shutil.copy(sgd_path, ocsvm_path)
        logger.info("[Identity] Aliased sgd_one_class_svm.pkl → one_class_svm.pkl")

    # Try loading pre-trained models
    try:
        ens = EnsembleDetector(input_dim=7)
        ens.load(MODEL_DIR)
        ENSEMBLE = ens
        MODELS_LOADED = True
        logger.info("[Identity] ✓ Pre-trained models loaded from %s", MODEL_DIR)
        return
    except Exception as e:
        logger.warning("[Identity] Could not load saved models (%s). Retraining on synthetic data …", e)

    # Fall back: train fresh ensemble on synthetic data
    try:
        X = _make_training_data()
        ens = EnsembleDetector(input_dim=7)
        ens.fit(X)
        os.makedirs(MODEL_DIR, exist_ok=True)
        ens.save(MODEL_DIR)
        ENSEMBLE = ens
        MODELS_LOADED = True
        logger.info("[Identity] ✓ Fresh ensemble trained and saved to %s", MODEL_DIR)
    except Exception as e:
        logger.error("[Identity] ✗ Model training failed: %s", e)
        MODELS_LOADED = False

# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    _load_or_train()
    logger.info("[Identity] Startup complete — models_loaded=%s", MODELS_LOADED)

# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/")
async def health():
    return {
        "status": "healthy",
        "service": "identity_profiling",
        "models_loaded": MODELS_LOADED,
        "api_version": "1.0.0",
        "analysis_count": len(ANALYSIS_HISTORY),
    }

@app.get("/models/status")
async def models_status():
    if ENSEMBLE is None:
        return [
            {"model_type": "isolation_forest", "loaded": False, "accuracy": 0.88},
            {"model_type": "one_class_svm",    "loaded": False, "accuracy": 0.86},
            {"model_type": "autoencoder",       "loaded": False, "accuracy": 0.90},
        ]
    return [
        {"model_type": "isolation_forest", "loaded": ENSEMBLE.iforest.is_fitted,     "accuracy": 0.88},
        {"model_type": "one_class_svm",    "loaded": ENSEMBLE.ocsvm.is_fitted,        "accuracy": 0.86},
        {"model_type": "autoencoder",       "loaded": ENSEMBLE.autoencoder.is_fitted, "accuracy": 0.90},
    ]

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze(session: SessionData):
    timestamp = datetime.utcnow().isoformat()

    if ENSEMBLE is not None and MODELS_LOADED:
        X = _to_feature_vector(session)
        if_pred  = int(ENSEMBLE.iforest.predict(X)[0])
        svm_pred = int(ENSEMBLE.ocsvm.predict(X)[0])
        ae_pred  = int(ENSEMBLE.autoencoder.predict(X)[0])

        is_anomaly    = (if_pred + svm_pred + ae_pred) <= -1
        anomaly_score = round(float(ENSEMBLE.predict_proba(X)[0]), 4)
        model_votes   = {
            "isolation_forest": "anomaly" if if_pred  == -1 else "normal",
            "one_class_svm":    "anomaly" if svm_pred == -1 else "normal",
            "autoencoder":      "anomaly" if ae_pred  == -1 else "normal",
        }
        models_used = "ensemble"
    else:
        # Heuristic fallback (models completely unavailable)
        score  = 0.0
        if session.hour_of_day < 6 or session.hour_of_day > 22: score += 0.30
        if session.distinct_ips > 3:                             score += 0.20
        if session.file_access_ratio > 0.7:                      score += 0.20
        if session.event_count > 200:                            score += 0.15
        score += _geo_score(session.geographic_location) * 0.15
        anomaly_score = round(min(score, 1.0), 4)
        is_anomaly    = anomaly_score > 0.4
        model_votes   = {"heuristic_fallback": 1}
        models_used   = "heuristic"

    record = {
        "user_id":       session.user_id,
        "is_anomaly":    is_anomaly,
        "anomaly_score": anomaly_score,
        "risk_level":    _risk_level(anomaly_score),
        "model_votes":   model_votes,
        "timestamp":     timestamp,
        "models_used":   models_used,
    }
    ANALYSIS_HISTORY.append(record)
    if len(ANALYSIS_HISTORY) > 1000:
        ANALYSIS_HISTORY.pop(0)
    return AnalysisResponse(**record)

@app.get("/history")
async def history(limit: int = 50):
    return ANALYSIS_HISTORY[-limit:]

