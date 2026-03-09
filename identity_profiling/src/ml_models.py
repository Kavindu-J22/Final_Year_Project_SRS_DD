"""
ML Models for Anomaly Detection
================================
Implements three ML approaches:
1. Isolation Forest
2. One-Class SVM
3. Autoencoder (Neural Network)

Author: T. R. Hettiarachchi (IT22920836)
"""

import os
import numpy as np
import joblib
from typing import Dict, Tuple, Optional
from sklearn.ensemble import IsolationForest
from sklearn.svm import OneClassSVM
from sklearn.preprocessing import StandardScaler

# Note: isolation forest model implementation
class IsolationForestModel:
    """
    Isolation Forest for anomaly detection.
    
    How it works:
    - Randomly selects a feature and splits data
    - Anomalies are isolated faster (fewer splits needed)
    - Path length determines anomaly score
    """
    
    def __init__(self, contamination: float = 0.05, n_estimators: int = 100):
        self.model = IsolationForest(
            contamination=contamination,
            n_estimators=n_estimators,
            random_state=42,
            n_jobs=-1
        )
        self.scaler = StandardScaler()
        self.is_fitted = False
    
    # Note: fit implementation
    def fit(self, X: np.ndarray) -> 'IsolationForestModel':
        """Train the model on normal data."""
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled)
        self.is_fitted = True
        print(f"Isolation Forest trained on {len(X)} samples")
        return self
    
    # Note: predict implementation
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Predict anomalies. Returns 1 for normal, -1 for anomaly."""
        X_scaled = self.scaler.transform(X)
        return self.model.predict(X_scaled)
    
    # Note: score implementation
    def score(self, X: np.ndarray) -> np.ndarray:
        """Get anomaly scores. Lower = more anomalous."""
        X_scaled = self.scaler.transform(X)
        return self.model.decision_function(X_scaled)
    
    # Note: save implementation
    def save(self, path: str):
        """Save model to disk."""
        joblib.dump({'model': self.model, 'scaler': self.scaler}, path)
        print(f"Saved to {path}")
    
    # Note: load implementation
    def load(self, path: str):
        """Load model from disk."""
        data = joblib.load(path)
        self.model = data['model']
        self.scaler = data['scaler']
        self.is_fitted = True

# Note: one class s v m model implementation
class OneClassSVMModel:
    """
    One-Class SVM for anomaly detection.
    
    How it works:
    - Learns a boundary around normal data in high-dim space
    - Uses RBF kernel to map to infinite dimensions
    - Points outside boundary are anomalies
    """
    
    def __init__(self, nu: float = 0.05, kernel: str = 'rbf'):
        self.model = OneClassSVM(
            nu=nu,
            kernel=kernel,
            gamma='scale'
        )
        self.scaler = StandardScaler()
        self.is_fitted = False
    
    # Note: fit implementation
    def fit(self, X: np.ndarray) -> 'OneClassSVMModel':
        """Train on normal data. Uses sampling if data > 50K (SVM is slow)."""
        if len(X) > 50000:
            print(f"  (Sampling 50K from {len(X)} for SVM - O(n^2) complexity)")
            indices = np.random.choice(len(X), 50000, replace=False)
            X = X[indices]
        
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled)
        self.is_fitted = True
        print(f"One-Class SVM trained on {len(X)} samples")
        return self
    
    # Note: predict implementation
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Predict: 1=normal, -1=anomaly."""
        X_scaled = self.scaler.transform(X)
        return self.model.predict(X_scaled)
    
    # Note: score implementation
    def score(self, X: np.ndarray) -> np.ndarray:
        """Anomaly score. Lower = more anomalous."""
        X_scaled = self.scaler.transform(X)
        return self.model.decision_function(X_scaled)
    
    # Note: save implementation
    def save(self, path: str):
        joblib.dump({'model': self.model, 'scaler': self.scaler}, path)
        print(f"Saved to {path}")
    
    # Note: load implementation
    def load(self, path: str):
        data = joblib.load(path)
        self.model = data['model']
        self.scaler = data['scaler']
        self.is_fitted = True

# Note: autoencoder model implementation
class AutoencoderModel:
    """
    Autoencoder-like Neural Network for anomaly detection.
    Uses sklearn MLPRegressor for reconstruction.
    
    How it works:
    - Trains to reconstruct input features
    - High reconstruction error = anomaly
    """
    
    def __init__(self, input_dim: int, encoding_dim: int = 4):
        from sklearn.neural_network import MLPRegressor
        
        self.input_dim = input_dim
        self.encoding_dim = encoding_dim
        self.model = MLPRegressor(
            hidden_layer_sizes=(16, encoding_dim, 16),
            activation='relu',
            solver='adam',
            max_iter=200,
            random_state=42,
            early_stopping=True
        )
        self.scaler = StandardScaler()
        self.threshold = None
        self.is_fitted = False
    
    # Note: fit implementation
    def fit(self, X: np.ndarray, epochs: int = 50, batch_size: int = 32) -> 'AutoencoderModel':
        """Train autoencoder."""
        X_scaled = self.scaler.fit_transform(X)
        
        self.model.fit(X_scaled, X_scaled)
        
        errors = self._reconstruction_error(X_scaled)
        self.threshold = np.percentile(errors, 95)
        
        self.is_fitted = True
        print(f"Autoencoder trained. Threshold: {self.threshold:.4f}")
        return self
    
    # Note: reconstruction error implementation
    def _reconstruction_error(self, X: np.ndarray) -> np.ndarray:
        """Calculate mean squared reconstruction error."""
        X_pred = self.model.predict(X)
        return np.mean(np.square(X - X_pred), axis=1)
    
    # Note: predict implementation
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Predict: 1=normal, -1=anomaly."""
        X_scaled = self.scaler.transform(X)
        errors = self._reconstruction_error(X_scaled)
        return np.where(errors > self.threshold, -1, 1)
    
    # Note: score implementation
    def score(self, X: np.ndarray) -> np.ndarray:
        """Anomaly score (negative error for consistency)."""
        X_scaled = self.scaler.transform(X)
        errors = self._reconstruction_error(X_scaled)
        return -errors
    
    # Note: save implementation
    def save(self, path: str):
        joblib.dump({
            'model': self.model,
            'scaler': self.scaler,
            'threshold': self.threshold,
            'input_dim': self.input_dim,
            'encoding_dim': self.encoding_dim
        }, path)
        print(f"Saved to {path}")
    
    # Note: load implementation
    def load(self, path: str):
        data = joblib.load(path)
        self.model = data['model']
        self.scaler = data['scaler']
        self.threshold = data['threshold']
        self.input_dim = data['input_dim']
        self.encoding_dim = data['encoding_dim']
        self.is_fitted = True

# Note: ensemble detector implementation
class EnsembleDetector:
    """
    Ensemble of all three models with voting.
    """
    
    def __init__(self, input_dim: int = 7):
        self.iforest = IsolationForestModel()
        self.ocsvm = OneClassSVMModel()
        self.autoencoder = AutoencoderModel(input_dim)
        self.is_fitted = False
    
    # Note: fit implementation
    def fit(self, X: np.ndarray) -> 'EnsembleDetector':
        """Train all models."""
        print("\n" + "=" * 40)
        print("Training Ensemble Models")
        print("=" * 40)
        
        self.iforest.fit(X)
        self.ocsvm.fit(X)
        self.autoencoder.fit(X)
        
        self.is_fitted = True
        print("\n All models trained!")
        return self
    
    # Note: predict implementation
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Ensemble voting. -1 if majority say anomaly."""
        pred_if = self.iforest.predict(X)
        pred_svm = self.ocsvm.predict(X)
        pred_ae = self.autoencoder.predict(X)
        
        votes = pred_if + pred_svm + pred_ae
        
        return np.where(votes <= -1, -1, 1)
    
    # Note: predict proba implementation
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Get anomaly probability (0-1)."""
        pred_if = (self.iforest.predict(X) == -1).astype(float)
        pred_svm = (self.ocsvm.predict(X) == -1).astype(float)
        pred_ae = (self.autoencoder.predict(X) == -1).astype(float)
        
        return (pred_if + pred_svm + pred_ae) / 3
    
    # Note: save implementation
    def save(self, model_dir: str):
        """Save all models."""
        os.makedirs(model_dir, exist_ok=True)
        self.iforest.save(os.path.join(model_dir, "isolation_forest.pkl"))
        self.ocsvm.save(os.path.join(model_dir, "one_class_svm.pkl"))
        self.autoencoder.save(os.path.join(model_dir, "autoencoder.pkl"))
    
    # Note: load implementation
    def load(self, model_dir: str):
        """Load all models."""
        self.iforest.load(os.path.join(model_dir, "isolation_forest.pkl"))
        self.ocsvm.load(os.path.join(model_dir, "one_class_svm.pkl"))
        self.autoencoder.load(os.path.join(model_dir, "autoencoder.pkl"))
        self.is_fitted = True

if __name__ == "__main__":
    np.random.seed(42)
    X_train = np.random.randn(1000, 7)
    X_test = np.random.randn(100, 7)
    X_test[0] = [10, 10, 10, 10, 10, 10, 10]
    
    ensemble = EnsembleDetector(input_dim=7)
    ensemble.fit(X_train)
    
    preds = ensemble.predict(X_test)
    probs = ensemble.predict_proba(X_test)
    
    print(f"\nTest predictions: {preds[:10]}")
    print(f"Anomaly probs: {probs[:10]}")
