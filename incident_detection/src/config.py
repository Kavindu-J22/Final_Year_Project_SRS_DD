
# load detection config
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    RULEBASE_PATH = os.getenv('RULEBASE_PATH', 'rulebase.yaml')
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
    ALERT_WEBHOOK = os.getenv('ALERT_WEBHOOK', 'http://localhost/alert')
