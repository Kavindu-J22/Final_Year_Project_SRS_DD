"""
Event Correlator
================
Links related events across different sources (Network <-> Endpoint).
"""

from elasticsearch import Elasticsearch
import pandas as pd

# Method to event correlator
class EventCorrelator:
    def __init__(self, es_host='localhost', es_port=9200):
        self.es = Elasticsearch([{'host': es_host, 'port': es_port, 'scheme': 'http'}])
        self.index = "forensic-timeline-v1"

    def find_related_events(self, entity_value: str, entity_type: str = 'ip') -> pd.DataFrame:
        """
        Find all events related to a specific entity (IP, User, Hostname).
        This connects the dots between different log sources.
        """
        if entity_type == 'ip':
            query = {
                "bool": {
                    "should": [
                        {"term": {"src_ip.keyword": entity_value}},
                        {"term": {"dest_ip.keyword": entity_value}},
                        {"term": {"c-ip.keyword": entity_value}}
                    ],
                    "minimum_should_match": 1
                }
            }
        elif entity_type == 'user':
            query = {
                "bool": {
                    "should": [
                        {"term": {"user.keyword": entity_value}},
                        {"term": {"cs-username.keyword": entity_value}}
                    ],
                    "minimum_should_match": 1
                }
            }
        else:
            return pd.DataFrame()

        resp = self.es.search(index=self.index, query=query, size=500, sort=[{"@timestamp": "asc"}])
        
        events = []
        for hit in resp['hits']['hits']:
            events.append(hit['_source'])
            
        return pd.DataFrame(events)

    def trace_attack_path(self, suspect_ip: str) -> dict:
        """
        High-level logic to trace an attack path:
        1. Find Network logs involving the IP.
        2. Check for Web access (IIS logs).
        3. Correlate with Endpoint logs at similar times.
        """
        related = self.find_related_events(suspect_ip, 'ip')
        
        if related.empty:
            return {"status": "No events found"}

        categories = related['event_category'].value_counts().to_dict() if 'event_category' in related else {}
        
        endpoints = related[related['event_category'] == 'Endpoint']['host'].unique().tolist() if 'host' in related else []

        return {
            "entity": suspect_ip,
            "total_events": len(related),
            "category_breakdown": categories,
            "touched_endpoints": endpoints,
            "timeline_start": related['@timestamp'].min() if '@timestamp' in related else None,
            "timeline_end": related['@timestamp'].max() if '@timestamp' in related else None
        }
