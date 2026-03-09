"""
Data Loader for CERT Insider Threat Dataset
============================================
Loads and preprocesses the real CERT dataset (3.5M+ records).
"""

import os
import pandas as pd
import numpy as np
from typing import Tuple
from sklearn.preprocessing import LabelEncoder
from config import Config
from src.session_manager import SessionManager

np.random.seed(42)

# Note: data loader implementation
class DataLoader:
    """Load and preprocess CERT Insider Threat dataset."""
    
    def __init__(self, file_path=None):
        self.file_path = file_path or Config.DATA_PATH
        self.df = None
        self.label_encoders = {}
        self.session_manager = SessionManager()
    
    def load(self, sample_size: int = None) -> pd.DataFrame:
        """
        Load logon data.
        
        Args:
            sample_size: If set, randomly sample this many records
        """
        path = os.path.join(self.data_dir, "logon.csv")
        
        print(f"Loading {path}...")
        self.df = pd.read_csv(path)
        
        total = len(self.df)
        print(f"  Total records: {total:,}")
        
        if sample_size and sample_size < total:
            self.df = self.df.sample(n=sample_size, random_state=42)
            print(f"  Sampled: {sample_size:,} records")
        
        # 5. Session Reconstruction (Research Objective)
        self.df = self.session_manager.reconstruct_sessions(self.df)
        
        return self.df
    
    def preprocess(self) -> pd.DataFrame:
        """Extract features from raw data."""
        df = self.df.copy()
        
        df['date'] = pd.to_datetime(df['date'], format='%m/%d/%Y %H:%M:%S')
        
        df['hour'] = df['date'].dt.hour
        df['day_of_week'] = df['date'].dt.dayofweek
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        df['is_night'] = df['hour'].isin([0,1,2,3,4,5,22,23]).astype(int)
        
        self.label_encoders['user'] = LabelEncoder()
        self.label_encoders['pc'] = LabelEncoder()
        
        df['user_encoded'] = self.label_encoders['user'].fit_transform(df['user'])
        df['pc_encoded'] = self.label_encoders['pc'].fit_transform(df['pc'])
        df['activity_encoded'] = (df['activity'] == 'Logon').astype(int)
        
        df = df.sort_values(['user', 'date']).reset_index(drop=True)
        df['prev_date'] = df.groupby('user')['date'].shift(1)
        df['time_since_last'] = (df['date'] - df['prev_date']).dt.total_seconds() / 3600
        df['time_since_last'] = df['time_since_last'].fillna(0).clip(upper=168)
        
        self.df = df
        print(f"  Features extracted: {len(df)} records")
        print(f"  Unique users: {df['user'].nunique()}")
        print(f"  Unique PCs: {df['pc'].nunique()}")
        
        return df
    
    def get_features(self) -> Tuple[np.ndarray, list]:
        """Extract feature matrix."""
        feature_cols = [
            'hour', 'day_of_week', 'is_weekend', 'is_night',
            'user_encoded', 'pc_encoded', 'activity_encoded', 'time_since_last'
        ]
        
        X = self.df[feature_cols].values
        return X, feature_cols

if __name__ == "__main__":
    loader = DataLoader("data/cert_subset_100")
    loader.load(sample_size=50000)
    loader.preprocess()
    X, cols = loader.get_features()
    print(f"\nFeatures shape: {X.shape}")
