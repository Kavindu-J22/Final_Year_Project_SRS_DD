"""
Log Normalizer Module
=====================
This module normalizes logs from different cloud providers (AWS, Azure, GCP)
into a unified JSON schema for consistent detection and correlation.

The Unified Schema:
{
    "timestamp": "ISO-8601 String",
    "cloud_provider": "aws" | "azure" | "gcp",
    "event_type": "string",
    "event_name": "string",
    "status": "success" | "failure" | "unknown",
    "severity": "info" | "low" | "medium" | "high" | "critical",
    "actor_id": "string",
    "actor_type": "user" | "service" | "root" | "unknown",
    "source_ip": "string",
    "user_agent": "string",
    "resource_type": "string",
    "resource_id": "string",
    "region": "string",
    "raw_log": dict
}
"""

from datetime import datetime
from typing import Dict, Any, Optional
import json

# unified log
class UnifiedLog:
    """
    Represents a normalized log entry with a consistent structure
    regardless of the source cloud provider.
    """
    
    def __init__(self):
        self.timestamp: str = ""
        self.cloud_provider: str = ""
        self.event_type: str = ""
        self.event_name: str = ""
        self.status: str = "unknown"
        self.severity: str = "info"
        self.actor_id: str = ""
        self.actor_type: str = "unknown"
        self.source_ip: str = ""
        self.user_agent: str = ""
        self.resource_type: str = ""
        self.resource_id: str = ""
        self.region: str = ""
        self.raw_log: Dict = {}
    
    # to dict
    def to_dict(self) -> Dict[str, Any]:
        """Convert the unified log to a dictionary for storage."""
        return {
            "timestamp": self.timestamp,
            "cloud_provider": self.cloud_provider,
            "event_type": self.event_type,
            "event_name": self.event_name,
            "status": self.status,
            "severity": self.severity,
            "actor_id": self.actor_id,
            "actor_type": self.actor_type,
            "source_ip": self.source_ip,
            "user_agent": self.user_agent,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "region": self.region,
            "raw_log": self.raw_log
        }
    
    def __repr__(self):
        return f"UnifiedLog({self.event_name} by {self.actor_id} at {self.timestamp})"

# log normalizer
class LogNormalizer:
    """
    Main normalizer class that detects the log source and applies
    the appropriate parser.
    """
    
    LOGIN_EVENTS = [
        "ConsoleLogin", "AssumeRole", "GetSessionToken",
        "Sign-in activity", "UserLoggedIn",
        "google.login.LoginService.loginSuccess",
    ]
    
    FAILED_LOGIN_INDICATORS = [
        "Failure", "Failed", "failure", "failed", "denied", "Denied",
        "InvalidClientTokenId", "AccessDenied", "Unauthorized"
    ]
    
    def __init__(self):
        self.parsers = {
            "aws": self._parse_aws_cloudtrail,
            "azure": self._parse_azure_monitor,
            "gcp": self._parse_gcp_logging
        }
    
    # normalize
    def normalize(self, raw_log: Dict, provider: Optional[str] = None) -> UnifiedLog:
        """
        Normalize a raw log into the unified schema.
        
        Args:
            raw_log: The raw log dictionary from the cloud provider
            provider: Optional provider hint ('aws', 'azure', 'gcp')
        
        Returns:
            UnifiedLog object with normalized fields
        """
        if provider is None:
            provider = self._detect_provider(raw_log)
        
        parser = self.parsers.get(provider)
        if parser is None:
            raise ValueError(f"Unknown provider: {provider}")
        
        return parser(raw_log)
    
    # detect provider
    def _detect_provider(self, raw_log: Dict) -> str:
        """
        Automatically detect the cloud provider based on log structure.
        """
        if "eventSource" in raw_log and "eventName" in raw_log:
            return "aws"
        
        if "operationName" in raw_log or "category" in raw_log:
            return "azure"
        
        if "protoPayload" in raw_log or "logName" in raw_log:
            return "gcp"
        
        raise ValueError("Could not detect cloud provider from log structure")
    
    # parse aws cloudtrail
    def _parse_aws_cloudtrail(self, raw_log: Dict) -> UnifiedLog:
        """
        Parse AWS CloudTrail log into unified schema.
        
        CloudTrail fields:
        - eventTime: timestamp
        - eventSource: service (e.g., iam.amazonaws.com)
        - eventName: action (e.g., CreateUser)
        - userIdentity: actor information
        - sourceIPAddress: IP
        - awsRegion: region
        - errorCode/errorMessage: failure info
        """
        log = UnifiedLog()
        log.cloud_provider = "aws"
        log.raw_log = raw_log
        
        log.timestamp = raw_log.get("eventTime", "")
        
        log.event_name = raw_log.get("eventName", "")
        log.event_type = self._categorize_event(log.event_name, raw_log)
        
        user_identity = raw_log.get("userIdentity", {})
        log.actor_id = self._extract_aws_actor(user_identity)
        log.actor_type = self._extract_aws_actor_type(user_identity)
        
        log.source_ip = raw_log.get("sourceIPAddress", "")
        log.user_agent = raw_log.get("userAgent", "")
        
        log.region = raw_log.get("awsRegion", "")
        resources = raw_log.get("resources", [])
        if resources:
            log.resource_type = resources[0].get("type", "")
            log.resource_id = resources[0].get("ARN", "")
        
        error_code = raw_log.get("errorCode", "")
        error_message = raw_log.get("errorMessage", "")
        if error_code or error_message:
            log.status = "failure"
        else:
            log.status = "success"
        
        log.severity = self._assign_base_severity(log.event_name, log.status)
        
        return log
    
    # extract aws actor
    def _extract_aws_actor(self, user_identity: Dict) -> str:
        """Extract the actor ID from AWS userIdentity."""
        if user_identity.get("userName"):
            return user_identity["userName"]
        if user_identity.get("arn"):
            return user_identity["arn"]
        if user_identity.get("principalId"):
            return user_identity["principalId"]
        if user_identity.get("accountId"):
            return f"account:{user_identity['accountId']}"
        return "unknown"
    
    # extract aws actor type
    def _extract_aws_actor_type(self, user_identity: Dict) -> str:
        """Determine the type of actor from AWS userIdentity."""
        identity_type = user_identity.get("type", "").lower()
        
        if identity_type == "root":
            return "root"
        elif identity_type in ["iamuser", "assumedrole"]:
            return "user"
        elif identity_type in ["awsservice", "service"]:
            return "service"
        else:
            return "unknown"
    
    # parse azure monitor
    def _parse_azure_monitor(self, raw_log: Dict) -> UnifiedLog:
        """
        Parse Azure Monitor/Activity log into unified schema.
        
        Azure fields:
        - time: timestamp
        - operationName: action
        - category: log category
        - caller: actor
        - callerIpAddress: IP
        - resultType: success/failure
        - resourceId: resource
        """
        log = UnifiedLog()
        log.cloud_provider = "azure"
        log.raw_log = raw_log
        
        log.timestamp = raw_log.get("time", raw_log.get("timeGenerated", ""))
        
        log.event_name = raw_log.get("operationName", "")
        log.event_type = self._categorize_event(log.event_name, raw_log)
        
        log.actor_id = raw_log.get("caller", raw_log.get("identity", {}).get("claims", {}).get("name", ""))
        if not log.actor_id:
            log.actor_id = raw_log.get("claims", {}).get("upn", "unknown")
        
        caller = log.actor_id.lower()
        if "admin" in caller or caller == "administrator":
            log.actor_type = "root"
        elif "@" in caller:
            log.actor_type = "user"
        else:
            log.actor_type = "service"
        
        log.source_ip = raw_log.get("callerIpAddress", "")
        log.user_agent = raw_log.get("httpRequest", {}).get("clientIpAddress", "")
        
        log.resource_id = raw_log.get("resourceId", "")
        log.resource_type = raw_log.get("resourceType", "")
        log.region = raw_log.get("location", "")
        
        result_type = raw_log.get("resultType", "").lower()
        if result_type in ["success", "succeeded"]:
            log.status = "success"
        elif result_type in ["failure", "failed"]:
            log.status = "failure"
        else:
            log.status = "unknown"
        
        log.severity = self._assign_base_severity(log.event_name, log.status)
        
        return log
    
    # parse gcp logging
    def _parse_gcp_logging(self, raw_log: Dict) -> UnifiedLog:
        """
        Parse GCP Cloud Logging entry into unified schema.
        
        GCP fields:
        - timestamp: timestamp
        - protoPayload.methodName: action
        - protoPayload.authenticationInfo.principalEmail: actor
        - protoPayload.requestMetadata.callerIp: IP
        - resource.type: resource type
        - resource.labels: resource details
        """
        log = UnifiedLog()
        log.cloud_provider = "gcp"
        log.raw_log = raw_log
        
        log.timestamp = raw_log.get("timestamp", "")
        
        proto_payload = raw_log.get("protoPayload", {})
        log.event_name = proto_payload.get("methodName", "")
        log.event_type = self._categorize_event(log.event_name, raw_log)
        
        auth_info = proto_payload.get("authenticationInfo", {})
        log.actor_id = auth_info.get("principalEmail", "")
        
        if log.actor_id:
            if "gserviceaccount.com" in log.actor_id:
                log.actor_type = "service"
            elif log.actor_id.lower() in ["admin", "root"]:
                log.actor_type = "root"
            else:
                log.actor_type = "user"
        
        request_metadata = proto_payload.get("requestMetadata", {})
        log.source_ip = request_metadata.get("callerIp", "")
        log.user_agent = request_metadata.get("callerSuppliedUserAgent", "")
        
        resource = raw_log.get("resource", {})
        log.resource_type = resource.get("type", "")
        labels = resource.get("labels", {})
        log.resource_id = labels.get("instance_id", labels.get("project_id", ""))
        log.region = labels.get("zone", labels.get("location", ""))
        
        status = proto_payload.get("status", {})
        if status:
            code = status.get("code", 0)
            log.status = "success" if code == 0 else "failure"
        else:
            log.status = "success"
        
        log.severity = self._assign_base_severity(log.event_name, log.status)
        
        return log
    
    # categorize event
    def _categorize_event(self, event_name: str, raw_log: Dict) -> str:
        """
        Categorize the event into a high-level type for easier filtering.
        """
        event_lower = event_name.lower()
        
        if any(x in event_lower for x in ["login", "signin", "authenticate", "session", "assume"]):
            return "authentication"
        
        if any(x in event_lower for x in ["policy", "role", "permission", "iam", "user", "group"]):
            return "iam"
        
        if any(x in event_lower for x in ["security", "firewall", "network", "vpc", "subnet"]):
            return "network"
        
        if any(x in event_lower for x in ["bucket", "blob", "storage", "s3", "object"]):
            return "storage"
        
        if any(x in event_lower for x in ["instance", "vm", "compute", "ec2", "function"]):
            return "compute"
        
        if any(x in event_lower for x in ["database", "db", "rds", "sql", "dynamo"]):
            return "database"
        
        if any(x in event_lower for x in ["log", "trail", "monitor", "alarm", "metric"]):
            return "logging"
        
        return "other"
    
    # assign base severity
    def _assign_base_severity(self, event_name: str, status: str) -> str:
        """
        Assign a base severity level. The rule engine may override this.
        """
        event_lower = event_name.lower()
        
        if any(x in event_lower for x in ["delete", "terminate", "destroy", "disable"]):
            return "high"
        
        if any(x in event_lower for x in ["policy", "permission", "role", "security"]):
            return "medium"
        
        if status == "failure":
            return "medium"
        
        return "info"

# normalize log
def normalize_log(raw_log: Dict, provider: Optional[str] = None) -> Dict:
    """
    Convenience function to normalize a log and return a dictionary.
    
    Args:
        raw_log: Raw log from cloud provider
        provider: Optional provider hint
    
    Returns:
        Normalized log as dictionary
    """
    normalizer = LogNormalizer()
    unified = normalizer.normalize(raw_log, provider)
    return unified.to_dict()

if __name__ == "__main__":
    sample_aws = {
        "eventTime": "2024-01-15T10:30:00Z",
        "eventSource": "iam.amazonaws.com",
        "eventName": "CreateUser",
        "userIdentity": {
            "type": "IAMUser",
            "userName": "admin-user",
            "arn": "arn:aws:iam::123456789:user/admin-user"
        },
        "sourceIPAddress": "203.0.113.50",
        "awsRegion": "us-east-1"
    }
    
    normalizer = LogNormalizer()
    result = normalizer.normalize(sample_aws)
    print("Normalized AWS Log:")
    print(json.dumps(result.to_dict(), indent=2))
