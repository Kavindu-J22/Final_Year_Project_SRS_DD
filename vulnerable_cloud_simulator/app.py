from flask import Flask, request, jsonify
import requests
import datetime
from flask_cors import CORS
import uuid

app = Flask(__name__)
CORS(app)

BACKEND_URL = "http://localhost:5000/api/logs/ingest"

def forward_log(event_type, method, path, status, payload=""):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        # Default behavior for unauthenticated requests during simulation
        pass
        
    log = {
        "logId": f"sim_{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "eventType": event_type,
        "method": method,
        "url": path + (f"?payload={payload}" if payload else ""),
        "statusCode": status,
        "userId": request.remote_addr,
        "ipAddress": request.remote_addr,
        "userAgent": "VulnerableCloudSimulator/1.0",
        "metadata": {"simulated": True}
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    if auth_header:
        headers["Authorization"] = auth_header
        
    try:
        response = requests.post(BACKEND_URL, json=log, headers=headers)
        return response.json()
    except Exception as e:
        print(f"Failed to forward log: {e}")
        return {"error": str(e)}

@app.route('/login', methods=['POST'])
def login():
    data = request.json or {}
    username = data.get("username", "")
    password = data.get("password", "")
    
    status = 401
    event_type = "FailedLogin"
    if username == "admin" and password == "admin":
        status = 200
        event_type = "SuccessfulLogin"
    elif "' OR" in username or "' OR" in password or "1=1" in username:
        status = 500
        event_type = "SQLInjectionAttempt"
        
    forward_log(event_type, "POST", "/login", status, f"username={username}")
    
    if status == 200:
        return jsonify({"message": "Login successful", "status": "success"})
    else:
        return jsonify({"message": "Login failed", "status": "failed"}), status

@app.route('/files', methods=['GET'])
def files():
    path = request.args.get("path", "")
    status = 200
    event_type = "FileAccess"
    if "../" in path or "..%2F" in path:
        status = 403
        event_type = "PathTraversalAttempt"
        
    forward_log(event_type, "GET", "/files", status, f"path={path}")
    
    if status == 200:
        return jsonify({"message": "File accessed", "status": "success"})
    else:
        return jsonify({"message": "Access denied", "status": "failed"}), status

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5004, debug=True)
