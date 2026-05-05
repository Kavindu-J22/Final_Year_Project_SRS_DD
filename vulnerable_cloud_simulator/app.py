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
        pass
        
    spoofed_ip = request.headers.get("X-Forwarded-For") or request.args.get("ip") or request.remote_addr
    spoofed_time = request.args.get("time") or datetime.datetime.utcnow().isoformat() + "Z"
    spoofed_user = request.args.get("user") or spoofed_ip
    
    log = {
        "logId": f"sim_{uuid.uuid4().hex[:8]}",
        "timestamp": spoofed_time,
        "eventType": event_type,
        "method": method,
        "url": path + (f"?payload={payload}" if payload else ""),
        "statusCode": status,
        "userId": spoofed_user,
        "ipAddress": spoofed_ip,
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
    elif "' OR" in username or "' OR" in password or "1=1" in username or "UNION" in username:
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
    if "../" in path or "..%2F" in path or "passwd" in path:
        status = 403
        event_type = "PathTraversalAttempt"
        
    forward_log(event_type, "GET", "/files", status, f"path={path}")
    
    if status == 200:
        return jsonify({"message": "File accessed", "status": "success"})
    else:
        return jsonify({"message": "Access denied", "status": "failed"}), status

@app.route('/upload', methods=['POST'])
def upload():
    filename = request.args.get("filename", "")
    status = 200
    event_type = "FileUpload"
    if filename.endswith(".php") or filename.endswith(".sh") or "shell" in filename:
        status = 201
        event_type = "MaliciousFileUpload"
        
    forward_log(event_type, "POST", "/upload", status, f"filename={filename}")
    return jsonify({"message": "File processed", "status": "success"}), status

@app.route('/privilege', methods=['POST'])
def privilege():
    action = request.args.get("action", "")
    status = 200
    event_type = "PrivilegeModification"
    if action == "admin":
        event_type = "PrivilegeEscalation"
        
    forward_log(event_type, "POST", "/privilege", status, f"action={action}")
    return jsonify({"message": "Privilege updated", "status": "success"}), status

@app.route('/ransomware', methods=['POST'])
def ransomware():
    files_affected = request.args.get("count", "1")
    status = 200
    event_type = "MassFileModification"
    
    forward_log(event_type, "POST", "/ransomware", status, f"count={files_affected}")
    return jsonify({"message": f"{files_affected} files modified", "status": "success"}), status

@app.route('/logs', methods=['DELETE'])
def delete_logs():
    status = 200
    event_type = "DefenseEvasion"
    
    forward_log(event_type, "DELETE", "/logs", status, "action=clear_audit_trail")
    return jsonify({"message": "Audit trail cleared", "status": "success"}), status

@app.route('/simulate_event', methods=['POST'])
def simulate_event():
    event_type = request.args.get("type", "UnknownEvent")
    status = 200
    forward_log(event_type, "POST", f"/simulate/{event_type.lower()}", status, "simulated=true")
    return jsonify({"message": f"{event_type} simulated", "status": "success"}), status

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5004, debug=True)
