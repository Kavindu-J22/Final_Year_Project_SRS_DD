
# Method to test timeline api
import unittest
from unittest.mock import MagicMock
from timeline_generator import TimelineGenerator
from correlator import EventCorrelator

class TestTimelineComponents(unittest.TestCase):
    
    def test_timeline_generation(self):
        print("\nTesting Timeline Generator...")
        generator = TimelineGenerator()
        generator.es = MagicMock()
        
        # Mock response
        generator.es.search.return_value = {
            "hits": {
                "hits": [
                    {
                        "_id": "1",
                        "_source": {
                            "@timestamp": "2023-01-01T10:00:00Z",
                            "event_category": "Network",
                            "src_ip": "10.0.0.1"
                        }
                    }
                ]
            }
        }
        
        df = generator.build_timeline()
        self.assertFalse(df.empty)
        print("Timeline Generator OK")
        
    def test_correlation(self):
        print("\nTesting Correlation...")
        correlator = EventCorrelator()
        correlator.es = MagicMock()
        
        correlator.es.search.return_value = {
            "hits": { "hits": [] }
        }
        
        res = correlator.trace_attack_path("1.2.3.4")
        self.assertIn("entity", res)
        print("Correlation Engine OK")

if __name__ == '__main__':
    unittest.main()
