
# Method to load timeline config
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    ES_HOST = os.getenv('ES_HOST', 'localhost')
    ES_PORT = int(os.getenv('ES_PORT', '9200'))
    INDEX_NAME = os.getenv('INDEX_NAME', 'forensic-timeline-v1')
