
# Note: test script for models
import sys
import os
import joblib
import numpy as np
from config import Config

def test_inference():
    print("Testing Model Inference...")
    
    # Check if models exist
    model_path = os.path.join("..", Config.MODEL_DIR, "isolation_forest.pkl")
    if not os.path.exists(model_path):
        print(f"Model not found at {model_path}. Skipping.")
        return

    print("Loading Isolation Forest...")
    try:
        model = joblib.load(model_path)
        
        # Create dummy data (8 features as per training)
        # hour, day, weekend, night, user, pc, activity, time_since
        dummy_data = np.array([
            [10, 1, 0, 0, 50, 20, 1, 2.0],  # Normal
            [23, 6, 1, 1, 50, 20, 1, 0.5]   # Anomaly (Night+Weekend)
        ])
        
        preds = model.predict(dummy_data)
        print(f"Predictions: {preds}")
        print("Model Test PASSED.")
        
    except Exception as e:
        print(f"Model Test FAILED: {e}")

if __name__ == "__main__":
    test_inference()
