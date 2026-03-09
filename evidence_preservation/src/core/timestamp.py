import requests
import hashlib
import base64
from asn1crypto import tsp, algos

# This function handles timestamp manager
class TimestampManager:
    def __init__(self, tsa_url='http://timestamp.digicert.com'):
        self.tsa_url = tsa_url

    # This function handles get timestamp token
    def get_timestamp_token(self, data_hash_hex):
        """
        Get a trusted timestamp token for the given hash using RFC 3161.
        :param data_hash_hex: Hex string of the SHA-256 hash.
        :return: Base64 encoded string of the TimeStampResp.
        """
        print(f"Requesting timestamp for hash from {self.tsa_url}...")
        
        try:
            data_hash_bytes = bytes.fromhex(data_hash_hex)
            
            message_imprint = tsp.MessageImprint({
                'hash_algorithm': algos.DigestAlgorithm({'algorithm': 'sha256'}),
                'hashed_message': data_hash_bytes
            })
            
            import os
            nonce = int.from_bytes(os.urandom(16), 'big')
            
            request = tsp.TimeStampReq({
                'version': 'v1',
                'message_imprint': message_imprint,
                'cert_req': True,
                'nonce': nonce
            })
            
            request_der = request.dump()
            
            headers = {'Content-Type': 'application/timestamp-query'}
            response = requests.post(self.tsa_url, data=request_der, headers=headers)
            
            if response.status_code != 200:
                print(f"Error: TSA returned status code {response.status_code}")
                return None
                
            response_der = response.content
            
            return base64.b64encode(response_der).decode('utf-8')
            
        except Exception as e:
            print(f"Error getting timestamp: {e}")
            return None

    # This function handles verify timestamp token
    def verify_timestamp_token(self, token_b64, original_hash_hex):
        """
        Verify that the timestamp token corresponds to the data hash.
        :param token_b64: Base64 encoded TimeStampResp.
        :param original_hash_hex: The original hash that was timestamped.
        """
        try:
            token_der = base64.b64decode(token_b64)
            
            ts_resp = tsp.TimeStampResp.load(token_der)
            
            status = ts_resp['status']
            if status['status'].native != 'granted':
                print(f"Timestamp not granted: {status['status_string'].native}")
                return False
            
            content_info = ts_resp['time_stamp_token']
            
            signed_data = content_info['content']
            encap_content_info = signed_data['encap_content_info']
            tst_info_bytes = bytes(encap_content_info['content'])
            
            tst_info = tsp.TSTInfo.load(tst_info_bytes)
            
            message_imprint = tst_info['message_imprint']
            token_hash = message_imprint['hashed_message'].native
            token_algo = message_imprint['hash_algorithm']['algorithm'].native
            
            if token_algo != 'sha256':
                print(f"Warning: Token uses {token_algo}, expected sha256")
            
            if token_hash != bytes.fromhex(original_hash_hex):
                print("Timestamp verification failed: Hash mismatch.")
                print(f"Token Hash: {token_hash.hex()}")
                print(f"Original:   {original_hash_hex}")
                return False
                
            gen_time = tst_info['gen_time'].native
            print(f"Timestamp verified. Time: {gen_time}")
            return True

        except Exception as e:
            print(f"Timestamp verification error: {e}")
            return False
