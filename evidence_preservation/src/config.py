
# This function handles evidence config
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    AWS_ACCESS_KEY = os.getenv('AWS_ACCESS_KEY', 'test_key')
    AWS_SECRET_KEY = os.getenv('AWS_SECRET_KEY', 'test_secret')
    KEY_PATH = os.getenv('KEY_PATH', 'keys')
    LEDGER_FILE = os.getenv('LEDGER_FILE', 'ledger.jsonl')
