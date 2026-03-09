
import pandas as pd
from datetime import timedelta

class SessionManager:
    """
    Research Objective: Session Reconstruction.
    Groups raw log events into user sessions based on Time and UserID.
    """
    def __init__(self, session_timeout_minutes=30):
        self.session_timeout = timedelta(minutes=session_timeout_minutes)

    def reconstruct_sessions(self, df):
        """
        Groups events into sessions.
        New session starts if time since last event > timeout.
        """
        if df.empty or 'user' not in df.columns or 'date' not in df.columns:
            return df
            
        df = df.sort_values(by=['user', 'date'])
        df['prev_time'] = df.groupby('user')['date'].shift(1)
        df['time_diff'] = df['date'] - df['prev_time']
        
        # New session if time_diff > timeout or it's the first event for user
        df['new_session'] = (df['time_diff'].isnull()) | (df['time_diff'] > self.session_timeout)
        df['session_id'] = df.groupby('user')['new_session'].cumsum()
        
        # Create global unique session ID
        df['global_session_id'] = df['user'] + "_" + df['session_id'].astype(str)
        
        # Cleanup
        df = df.drop(columns=['prev_time', 'time_diff', 'new_session', 'session_id'])
        
        print(f"[OK] Reconstructed {df['global_session_id'].nunique()} unique sessions from {len(df)} events.")
        return df
