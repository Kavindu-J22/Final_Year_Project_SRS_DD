
# Method to timeline grouper
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import DBSCAN
import joblib
import os
from config import Config

class LogClusterModel:
    def __init__(self, eps=0.5, min_samples=5):
        self.eps = eps
        self.min_samples = min_samples
        self.vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
        self.model = DBSCAN(eps=self.eps, min_samples=self.min_samples, metric='cosine')
        
    # Method to train model
    def train(self, log_messages):
        """
        Train clustering model on log messages.
        Returns labels where -1 are 'unique/anomalous' events and others are clusters.
        """
        if log_messages is None or len(log_messages) == 0:
            return []
            
        # Text to Vector
        X = self.vectorizer.fit_transform(log_messages)
        
        # Clustering
        # We use DBSCAN because it doesn't need to know the number of clusters (K)
        # and it has a concept of 'Outliers' (Noise) which is perfect for forensics.
        labels = self.model.fit_predict(X)
        return labels

    # Method to save model
    def save_model(self, model_name="log_cluster_dbscan.pkl"):
        """Save the vectorizer and model."""
        save_path = os.path.join(Config.MODEL_DIR if hasattr(Config, 'MODEL_DIR') else '.', model_name)
        # DBSCAN is instance-based, so we mainly save the vectorizer for transforming future data
        # But for DBSCAN we usually re-run on the batch. 
        # However, to satisfy the requirement of "Saved Model", we save the config and vectorizer.
        
        artifacts = {
            "vectorizer": self.vectorizer,
            "params": {"eps": self.eps, "min_samples": self.min_samples}
        }
        joblib.dump(artifacts, save_path)
        print(f"ML Model saved to {save_path}")
