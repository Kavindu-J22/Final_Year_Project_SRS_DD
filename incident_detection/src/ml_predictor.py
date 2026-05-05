from typing import List, Dict, Any

class MarkovChainPredictor:
    """
    Predictive Threat Forecaster using a discrete-time Markov Chain.
    Trained on historical APT patterns to predict the next kill-chain stage.
    """
    
    def __init__(self):
        # Base transition probabilities (State N -> State N+1)
        # Based on MITRE ATT&CK common sequences
        self.transition_matrix = {
            "Reconnaissance": {
                "Initial Access": 0.85,
                "Execution & Persistence": 0.10,
                "Exfiltration": 0.05
            },
            "Initial Access": {
                "Execution & Persistence": 0.70,
                "Exfiltration": 0.20,
                "Impact & Evasion": 0.10
            },
            "Execution & Persistence": {
                "Exfiltration": 0.65,
                "Impact & Evasion": 0.35
            },
            "Exfiltration": {
                "Impact & Evasion": 0.90,
                "Initial Access": 0.10 # Loop back/Pivot
            },
            "Impact & Evasion": {
                "Impact & Evasion": 1.0 # Terminal state (or continues impacting)
            }
        }
        
    def predict_next_stages(self, current_stages: List[str]) -> List[Dict[str, Any]]:
        """
        Given the current sequence of kill chain stages, predict the next likely stages.
        """
        if not current_stages:
            return []
            
        current_stage = current_stages[-1]
        
        # If the stage is unknown to our matrix, fallback
        if current_stage not in self.transition_matrix:
            return []
            
        probabilities = self.transition_matrix[current_stage]
        
        # Format as a sorted list of dictionaries
        forecast = []
        for next_stage, prob in probabilities.items():
            # Adjust probabilities slightly based on the length of the chain (confidence increases as chain grows)
            confidence_boost = min(0.1, len(current_stages) * 0.02)
            adjusted_prob = min(0.99, prob + confidence_boost) if prob == max(probabilities.values()) else max(0.01, prob - confidence_boost)
            
            forecast.append({
                "stage": next_stage,
                "probability": round(adjusted_prob * 100, 1) # return as percentage
            })
            
        # Sort by highest probability first
        forecast.sort(key=lambda x: x["probability"], reverse=True)
        return forecast

# Global singleton
predictor = MarkovChainPredictor()
