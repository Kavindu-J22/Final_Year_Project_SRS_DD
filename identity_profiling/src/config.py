
# Note: identity profiling config
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DATA_PATH = os.getenv('DATA_PATH', 'data/cert_subset_100/logon.csv')
    MODEL_DIR = os.getenv('MODEL_DIR', 'models')
    SAMPLE_SIZE = int(os.getenv('SAMPLE_SIZE', '100000'))
