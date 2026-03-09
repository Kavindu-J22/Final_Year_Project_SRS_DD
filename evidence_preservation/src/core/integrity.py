import hashlib
import os
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa, ec
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

from ..config import Config

# This function handles integrity manager
class IntegrityManager:
    def __init__(self, key_path=None):
        self.key_path = key_path or Config.KEY_PATH
        if not os.path.exists(self.key_path):
            os.makedirs(self.key_path)
        self.private_key = None
        self.public_key = None
        self._load_or_generate_keys()

    # This function handles load or generate keys
    def _load_or_generate_keys(self):
        """Load keys from disk or generate new ones if missing."""
        priv_key_file = os.path.join(self.key_path, 'private_key.pem')
        pub_key_file = os.path.join(self.key_path, 'public_key.pem')

        if os.path.exists(priv_key_file) and os.path.exists(pub_key_file):
            print("Loading existing keys...")
            with open(priv_key_file, "rb") as key_file:
                self.private_key = serialization.load_pem_private_key(
                    key_file.read(),
                    password=None,
                    backend=default_backend()
                )
            with open(pub_key_file, "rb") as key_file:
                self.public_key = serialization.load_pem_public_key(
                    key_file.read(),
                    backend=default_backend()
                )
        else:
            print("Generating new RSA keys...")
            self.private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=4096,
                backend=default_backend()
            )
            self.public_key = self.private_key.public_key()
            
            with open(priv_key_file, "wb") as f:
                f.write(self.private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption()
                ))
            with open(pub_key_file, "wb") as f:
                f.write(self.public_key.public_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PublicFormat.SubjectPublicKeyInfo
                ))

    # This function handles calculate hash
    def calculate_hash(self, data):
        """Calculate SHA-256 hash of the data."""
        if isinstance(data, str):
            data = data.encode('utf-8')
        digest = hashlib.sha256(data).hexdigest()
        return digest

    # This function handles sign hash
    def sign_hash(self, data_hash):
        """Sign the hash using the private key."""
        
        signature = self.private_key.sign(
            data_hash.encode('utf-8'),
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return signature.hex()

    # This function handles verify signature
    def verify_signature(self, data_hash, signature_hex):
        """Verify the signature."""
        try:
            signature = bytes.fromhex(signature_hex)
            self.public_key.verify(
                signature,
                data_hash.encode('utf-8'),
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            return True
        except Exception as e:
            print(f"Verification failed: {e}")
            return False
