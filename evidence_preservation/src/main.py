import sys
import os
from dotenv import load_dotenv

load_dotenv()

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# This function handles main
def main():
    print("Evidence Preservation & Chain of Custody Automation System Initialized")

if __name__ == "__main__":
    main()
