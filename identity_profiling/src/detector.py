"""
Detector - Inference Module
============================
Loads trained models and performs real-time anomaly detection.
"""

import os
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from dataclasses import dataclass

try:
    from ml_models import EnsembleDetector
    from data_loader import DataLoader
except ImportError:
    from src.ml_models import EnsembleDetector
    from src.data_loader import DataLoader

@dataclass
# Note: anomaly result implementation
class AnomalyResult:
    """Result of anomaly detection."""
    is_anomaly: bool
    probability: float
    predictions: Dict[str, int]
    
    def to_dict(self) -> Dict:
        return {
            'is_anomaly': self.is_anomaly,
            'probability': self.probability,
            'predictions': self.predictions
        }

# Note: anomaly detector implementation
class AnomalyDetector:
    """
    Production anomaly detector using ensemble of ML models.
    """
    
    def __init__(self, model_dir: str = "models"):
        self.model_dir = model_dir
        self.ensemble = None
        self.feature_cols = [
            'hour', 'day_of_week', 'is_weekend',
            'user_encoded', 'pc_encoded', 'activity_encoded',
            'time_since_last'
        ]
    
    def load_models(self) -> bool:
        """Load trained models from disk."""
        try:
            self.ensemble = EnsembleDetector(input_dim=len(self.feature_cols))
            self.ensemble.load(self.model_dir)
            print(" Models loaded successfully!")
            return True
        except Exception as e:
            print(f" Failed to load models: {e}")
            return False
    
    def predict_single(self, features: np.ndarray) -> AnomalyResult:
        """Predict on a single sample."""
        X = features.reshape(1, -1)
        
        pred = self.ensemble.predict(X)[0]
        prob = self.ensemble.predict_proba(X)[0]
        
        preds = {
            'isolation_forest': int(self.ensemble.iforest.predict(X)[0]),
            'one_class_svm': int(self.ensemble.ocsvm.predict(X)[0]),
            'autoencoder': int(self.ensemble.autoencoder.predict(X)[0])
        }
        
        return AnomalyResult(
            is_anomaly=(pred == -1),
            probability=prob,
            predictions=preds
        )
    
    def predict_batch(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Predict on batch.
        Returns: (predictions, probabilities)
        """
        preds = self.ensemble.predict(X)
        probs = self.ensemble.predict_proba(X)
        return preds, probs
    
    def analyze_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add anomaly predictions to dataframe."""
        X = df[self.feature_cols].values
        preds, probs = self.predict_batch(X)
        
        df = df.copy()
        df['predicted_anomaly'] = (preds == -1).astype(int)
        df['anomaly_probability'] = probs
        
        return df
    
    def evaluate(self, y_true: np.ndarray, y_pred: np.ndarray) -> Dict:
        """Calculate evaluation metrics."""
        y_pred_binary = (y_pred == -1).astype(int)
        
        tp = np.sum((y_true == 1) & (y_pred_binary == 1))
        fp = np.sum((y_true == 0) & (y_pred_binary == 1))
        fn = np.sum((y_true == 1) & (y_pred_binary == 0))
        tn = np.sum((y_true == 0) & (y_pred_binary == 0))
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
        accuracy = (tp + tn) / (tp + tn + fp + fn)
        
        return {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1_score': f1,
            'true_positives': int(tp),
            'false_positives': int(fp),
            'false_negatives': int(fn),
            'true_negatives': int(tn)
        }

if __name__ == "__main__":
    detector = AnomalyDetector("models")
    
    if detector.load_models():
        X_test = np.random.randn(10, 7)
        X_test[0] = [3, 6, 1, 0, 0, 1, 0]
        
        preds, probs = detector.predict_batch(X_test)
        print(f"\nPredictions: {preds}")
        print(f"Probabilities: {probs}")
