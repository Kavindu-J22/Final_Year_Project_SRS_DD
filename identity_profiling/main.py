"""
Main Training Script
====================
Trains ML models on FULL CERT Insider Threat dataset (3.5M records).
"""

import os
import sys
import numpy as np
import joblib

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from data_loader import DataLoader
from ml_models import EnsembleDetector

# Note: train implementation
def train(sample_size: int = None):
    """
    Train all models.
    
    Args:
        sample_size: If None, train on ALL data
    """
    print("\n" + "=" * 60)
    print("  IDENTITY PROFILING - ML TRAINING")
    print("  Dataset: CERT Insider Threat")
    print("=" * 60 + "\n")
    
    loader = DataLoader("data/cert_subset_100")
    loader.load(sample_size=sample_size)
    df = loader.preprocess()
    X, feature_cols = loader.get_features()
    
    print(f"\nTraining on {len(X):,} samples with {len(feature_cols)} features")
    print("This may take several minutes...\n")
    
    ensemble = EnsembleDetector(input_dim=len(feature_cols))
    ensemble.fit(X)
    
    os.makedirs("models", exist_ok=True)
    ensemble.save("models")
    
    joblib.dump(loader.label_encoders, "models/label_encoders.pkl")
    
    preds = ensemble.predict(X)
    anomalies = (preds == -1).sum()
    
    print("\n" + "=" * 40)
    print("TRAINING RESULTS")
    print("=" * 40)
    print(f"  Total samples: {len(X):,}")
    print(f"  Anomalies detected: {anomalies:,} ({100*anomalies/len(X):.2f}%)")
    
    print("\n" + "=" * 40)
    print("SAMPLE PREDICTIONS (Dummy Data)")
    print("=" * 40)
    
    sample_predictions(ensemble, feature_cols)
    
    print("\n Training complete!")
    return ensemble

# Note: sample predictions implementation
def sample_predictions(ensemble, feature_cols):
    """
    Demonstrate predictions with dummy/sample data.
    """
    
    dummy_samples = [
        [9, 1, 0, 0, 100, 50, 1, 2.0],
        [14, 3, 0, 0, 200, 75, 1, 4.0],
        [3, 6, 1, 1, 100, 50, 1, 48.0],
        [0, 2, 0, 1, 300, 100, 1, 24.0],
        [10, 4, 0, 0, 150, 80, 1, 168.0],
    ]
    
    descriptions = [
        "Normal: Weekday 9 AM login",
        "Normal: Weekday 2 PM login", 
        "Suspicious: Weekend 3 AM login",
        "Suspicious: Midnight login",
        "Suspicious: 168 hours since last event"
    ]
    
    X_dummy = np.array(dummy_samples)
    preds = ensemble.predict(X_dummy)
    probs = ensemble.predict_proba(X_dummy)
    
    print("\n{:<40} {:>10} {:>10}".format("Description", "Pred", "Prob"))
    print("-" * 60)
    
    for desc, pred, prob in zip(descriptions, preds, probs):
        result = "ANOMALY" if pred == -1 else "Normal"
        print(f"{desc:<40} {result:>10} {prob:>10.2%}")

if __name__ == "__main__":
    train(sample_size=None)
