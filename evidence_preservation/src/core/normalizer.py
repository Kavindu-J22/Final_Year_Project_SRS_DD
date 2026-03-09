import json

# This function handles log normalizer
class LogNormalizer:
    @staticmethod
    # This function handles normalize
    def normalize(log_entry):
        """
        Normalize a log entry to Canonical JSON format.
        - Sort keys alphabetically.
        - Remove whitespace (separators=(',', ':')).
        """
        try:
            if isinstance(log_entry, str):
                log_entry = json.loads(log_entry)
            
            canonical_json = json.dumps(
                log_entry,
                sort_keys=True,
                separators=(',', ':'),
                ensure_ascii=False
            )
            return canonical_json.encode('utf-8')
        except Exception as e:
            print(f"Error normalizing log: {e}")
            return None
