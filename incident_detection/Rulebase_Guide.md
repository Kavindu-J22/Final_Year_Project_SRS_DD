# Rulebase Configuration Guide
**Component 2: Incident Detection & Correlation**  
**IT22033550**

---

## 🎯 What is the Rulebase?

The **rulebase.yaml** file is the brain of our detection system! It contains all the rules that define what suspicious behavior looks like. Think of it as a playbook that tells the system:
- **What** to look for (failed logins, file access, etc.)
- **When** it's suspicious (5+ failures in 60 seconds)
- **How** serious it is (CRITICAL, HIGH, MEDIUM, LOW)
- **What** to do about it (lock account, investigate IP, etc.)

**Location:** `/incident_detection/rulebase.yaml`

**Format:** YAML (YAML Ain't Markup Language) - human-readable configuration

---

## 📖 Rulebase Structure

### Complete Example Rule

```yaml
rules:
  - rule_id: "T1110"
    name: "Brute Force Attack"
    description: "Multiple failed login attempts detected from same user or IP"
    severity: "CRITICAL"
    category: "credential_access"
    mitre_technique: "T1110"
    
    # What events trigger this rule?
    event_types:
      - "FailedLogin"
      - "AuthenticationFailure"
      - "LoginDenied"
    
    # How many events needed?
    threshold: 5
    
    # Within what time window?
    time_window: 60  # seconds
    
    # What conditions must be met?
    condition:
      status: "DENY"
      action: "login"
    
    # How to correlate related events?
    correlation:
      group_by:
        - "user_id"
        - "source_ip"
      within_minutes: 1
    
    # What actions to recommend?
    recommendations:
      - "Immediately lock the affected user account"
      - "Investigate source IP address for malicious activity"
      - "Enable multi-factor authentication (MFA)"
      - "Review authentication logs for the past 24 hours"
      - "Check if credentials were compromised"
```

---

## 🔧 Field Explanations

### Required Fields

#### 1. rule_id
**Type:** String  
**Purpose:** Unique identifier for the rule  
**Format:** Usually MITRE ATT&CK technique ID  
**Example:** `"T1110"`

**Best Practice:**
- Use MITRE ATT&CK IDs when applicable
- Custom rules: Use descriptive IDs like "CUSTOM_001"

#### 2. name
**Type:** String  
**Purpose:** Human-readable rule name  
**Example:** `"Brute Force Attack"`

**Best Practice:**
- Keep it concise (under 50 characters)
- Describe the attack, not the detection

#### 3. description
**Type:** String  
**Purpose:** Detailed explanation of what the rule detects  
**Example:** `"Multiple failed login attempts detected from same user or IP"`

**Best Practice:**
- Explain the behavior pattern
- Include why it's suspicious

#### 4. severity
**Type:** String (enum)  
**Allowed Values:** `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`  
**Purpose:** Priority level for security team

**Guidelines:**
- **CRITICAL:** Immediate action required (data breach, ransomware)
- **HIGH:** Urgent investigation needed (insider threat, privilege escalation)
- **MEDIUM:** Should be reviewed soon (policy violation, unusual access)
- **LOW:** Informational, monitor for patterns

#### 5. category
**Type:** String  
**Purpose:** MITRE ATT&CK tactic category  
**Examples:**
- `initial_access`
- `credential_access`
- `persistence`
- `privilege_escalation`
- `defense_evasion`
- `lateral_movement`
- `exfiltration`
- `impact`

#### 6. mitre_technique
**Type:** String  
**Purpose:** MITRE ATT&CK technique identifier  
**Format:** `"T####"` or `"T####.###"` (with sub-technique)  
**Examples:**
- `"T1110"` - Brute Force
- `"T1110.001"` - Password Guessing
- `"T1078"` - Valid Accounts

**Reference:** https://attack.mitre.org/

#### 7. event_types
**Type:** Array of strings  
**Purpose:** Which event types trigger this rule  
**Example:**
```yaml
event_types:
  - "FailedLogin"
  - "AuthenticationFailure"
```

**Common Event Types:**
- `FailedLogin` / `SuccessfulLogin`
- `FileAccess` / `FileDownload` / `FileUpload`
- `AdminAction` / `PrivilegeEscalation`
- `NetworkConnection` / `DataTransfer`
- `ProcessCreation` / `ProcessTermination`

### Optional Fields

#### 8. threshold
**Type:** Integer  
**Purpose:** Minimum number of events to trigger alert  
**Default:** 1  
**Example:** `5` (need 5 failed logins)

**Guidelines:**
- Lower threshold = More sensitive (more alerts)
- Higher threshold = Less noise (fewer false positives)
- Balance based on normal behavior in your environment

#### 9. time_window
**Type:** Integer (seconds)  
**Purpose:** Time period for event correlation  
**Example:** `60` (events must occur within 60 seconds)

**Common Values:**
- `60` - 1 minute (fast attacks like brute force)
- `300` - 5 minutes (slow credential stuffing)
- `3600` - 1 hour (insider threat data exfiltration)
- `86400` - 24 hours (long-term reconnaissance)

#### 10. condition
**Type:** Dictionary  
**Purpose:** Additional filters for events  
**Example:**
```yaml
condition:
  status: "DENY"
  action: "login"
  user_type: "admin"
```

**Supports:**
- Exact matching: `field: "value"`
- Multiple values: `field: ["value1", "value2"]`
- Wildcards: `field: "*admin*"`

#### 11. correlation
**Type:** Dictionary  
**Purpose:** How to group related events  
**Example:**
```yaml
correlation:
  group_by:
    - "user_id"
    - "source_ip"
  within_minutes: 5
```

**Common Grouping:**
- `user_id` - Same user
- `source_ip` - Same attacker
- `destination_ip` - Same target
- `resource` - Same file/system

#### 12. recommendations
**Type:** Array of strings  
**Purpose:** Actions for security team to take  
**Example:**
```yaml
recommendations:
  - "Lock affected account"
  - "Investigate source IP"
  - "Enable MFA"
```

---

## 📝 Complete Rulebase Example

```yaml
# Incident Detection Rulebase
# Component 2 - IT22033550
# MITRE ATT&CK Framework Integration

rules:
  # ========================================
  # Rule 1: Brute Force Attack (T1110)
  # ========================================
  - rule_id: "T1110"
    name: "Brute Force Attack"
    description: "Multiple failed login attempts detected from same user or IP address"
    severity: "CRITICAL"
    category: "credential_access"
    mitre_technique: "T1110"
    
    event_types:
      - "FailedLogin"
      - "AuthenticationFailure"
    
    threshold: 5
    time_window: 60
    
    condition:
      status: "DENY"
    
    correlation:
      group_by:
        - "user_id"
        - "source_ip"
      within_minutes: 1
    
    recommendations:
      - "Immediately lock the affected user account"
      - "Investigate source IP address for malicious activity"
      - "Enable multi-factor authentication (MFA)"
      - "Review authentication logs for the past 24 hours"

  # ========================================
  # Rule 2: Insider Threat (T1078)
  # ========================================
  - rule_id: "T1078"
    name: "Valid Accounts Misuse"
    description: "Unusual access pattern with valid credentials during off-hours"
    severity: "HIGH"
    category: "persistence"
    mitre_technique: "T1078"
    
    event_types:
      - "FileAccess"
      - "FileDownload"
      - "DataExfiltration"
    
    threshold: 3
    time_window: 3600
    
    condition:
      time_range:
        start: "22:00"
        end: "05:00"
      resource_type: "confidential"
    
    correlation:
      group_by:
        - "user_id"
      within_minutes: 60
    
    recommendations:
      - "Review user's recent activity for data exfiltration"
      - "Check file access logs for sensitive documents"
      - "Contact user directly to verify legitimate activity"
      - "Temporarily revoke access to confidential resources"

  # ========================================
  # Rule 3: Data Destruction (T1485)
  # ========================================
  - rule_id: "T1485"
    name: "Data Destruction"
    description: "Bulk deletion or data destruction detected"
    severity: "CRITICAL"
    category: "impact"
    mitre_technique: "T1485"
    
    event_types:
      - "FileDelete"
      - "BulkDelete"
      - "DataWipe"
    
    threshold: 1
    time_window: 60
    
    condition:
      action: "delete"
      file_count: ">= 10"
    
    correlation:
      group_by:
        - "user_id"
      within_minutes: 1
    
    recommendations:
      - "Immediately isolate affected systems"
      - "Activate data recovery procedures"
      - "Investigate for ransomware indicators"
      - "Preserve forensic evidence"
      - "Notify incident response team"

  # ========================================
  # Rule 4: Privilege Escalation (T1078.004)
  # ========================================
  - rule_id: "T1078.004"
    name: "Cloud Account Privilege Escalation"
    description: "Unauthorized elevation of user privileges detected"
    severity: "HIGH"
    category: "privilege_escalation"
    mitre_technique: "T1078.004"
    
    event_types:
      - "RoleAssignment"
      - "PermissionChange"
      - "AdminActionPerformed"
    
    threshold: 1
    time_window: 300
    
    condition:
      action: "escalate_privileges"
      target_role: ["admin", "root", "superuser"]
    
    correlation:
      group_by:
        - "user_id"
        - "target_user"
      within_minutes: 5
    
    recommendations:
      - "Verify authorization for privilege changes"
      - "Review recent admin console activity"
      - "Audit all accounts with elevated privileges"
      - "Revert unauthorized privilege escalations"

  # ========================================
  # Rule 5: Lateral Movement (T1021)
  # ========================================
  - rule_id: "T1021"
    name: "Remote Services Access"
    description: "Suspicious lateral movement via remote services"
    severity: "MEDIUM"
    category: "lateral_movement"
    mitre_technique: "T1021"
    
    event_types:
      - "RemoteAccess"
      - "SSHConnection"
      - "RDPConnection"
    
    threshold: 3
    time_window: 600
    
    condition:
      protocol: ["ssh", "rdp", "winrm"]
      destination_count: ">= 3"
    
    correlation:
      group_by:
        - "source_ip"
        - "user_id"
      within_minutes: 10
    
    recommendations:
      - "Investigate source and destination systems"
      - "Review network logs for reconnaissance activity"
      - "Check for compromised credentials"
      - "Isolate affected systems if breach confirmed"
```

---

## 🔄 How to Edit Rules

### Adding a New Rule

**Step 1:** Open rulebase.yaml
```bash
cd incident_detection
nano rulebase.yaml
# or use your favorite editor
```

**Step 2:** Add new rule at the end of the rules array
```yaml
rules:
  # ... existing rules ...
  
  # Your new rule
  - rule_id: "CUSTOM_001"
    name: "Suspicious API Access"
    description: "Unusual API calls detected"
    severity: "MEDIUM"
    category: "discovery"
    mitre_technique: "T1046"
    
    event_types:
      - "APICall"
    
    threshold: 10
    time_window: 300
    
    recommendations:
      - "Review API logs"
```

**Step 3:** Save and restart API
```bash
# API will auto-reload rules (hot-reload enabled!)
# Or restart manually:
uvicorn api:app --port 8002 --reload
```

**Step 4:** Verify rule loaded
```bash
curl http://localhost:8002/rules
# Should see your new rule in the list
```

### Modifying an Existing Rule

**Example:** Change brute force threshold from 5 to 3

**Before:**
```yaml
- rule_id: "T1110"
  threshold: 5
```

**After:**
```yaml
- rule_id: "T1110"
  threshold: 3  # More sensitive!
```

**Save file** → API auto-reloads → New threshold active!

### Removing a Rule

**Method 1:** Delete entire rule block
```yaml
# Delete everything from "- rule_id:" to the next rule
```

**Method 2:** Comment out (temporarily disable)
```yaml
# - rule_id: "T1110"
#   name: "Brute Force Attack"
#   ... (comment all lines)
```

**Method 3:** Change severity to LOW (deprioritize)
```yaml
- rule_id: "T1110"
  severity: "LOW"  # Won't trigger critical alerts
```

---

## ⚙️ How Rules Work

### Detection Flow

```
1. Event Arrives
   ↓
2. Check Event Type
   Does event_type match any rule's event_types?
   ↓
3. Apply Conditions
   Does event meet all rule conditions?
   ↓
4. Check Threshold
   Have threshold events occurred?
   ↓
5. Check Time Window
   Did events happen within time_window?
   ↓
6. Generate Alert
   Create incident with rule details
   ↓
7. Return Recommendations
   Provide actionable steps
```

### Example: Brute Force Detection

**Rule Configuration:**
```yaml
rule_id: "T1110"
event_types: ["FailedLogin"]
threshold: 5
time_window: 60
```

**What Happens:**

**Event 1:** FailedLogin at 14:30:00
- Check buffer: 1 FailedLogin
- 1 < 5 threshold → No alert

**Event 2:** FailedLogin at 14:30:05
- Check buffer: 2 FailedLogin
- 2 < 5 threshold → No alert

**Event 3:** FailedLogin at 14:30:10
- Check buffer: 3 FailedLogin
- 3 < 5 threshold → No alert

**Event 4:** FailedLogin at 14:30:15
- Check buffer: 4 FailedLogin
- 4 < 5 threshold → No alert

**Event 5:** FailedLogin at 14:30:20
- Check buffer: 5 FailedLogin
- **5 >= 5 threshold → ALERT TRIGGERED! 🚨**
- Generate incident with rule details
- Return recommendations

---

## 🔗 System Integration

### How Rulebase Interacts with Detection Engine

**Component:** `src/detector.py`

```python
# 1. Load Rules at Startup
rule_loader = RuleLoader("rulebase.yaml")
rules = rule_loader.load_rules()

# 2. For Each Incoming Event
def evaluate(event):
    alerts = []
    
    for rule in rules:
        # Check if event type matches
        if event.type in rule.event_types:
            
            # Check conditions
            if meets_conditions(event, rule.condition):
                
                # Count matching events in buffer
                matching_events = get_matching_events(
                    event_type=rule.event_types,
                    time_window=rule.time_window
                )
                
                # Check threshold
                if len(matching_events) >= rule.threshold:
                    # ALERT!
                    alert = create_alert(rule, matching_events)
                    alerts.append(alert)
    
    return alerts
```

### Hot-Reloading

**Feature:** Rules reload automatically when file changes!

**Implementation:** `src/detector.py` (Lines 133-140)
```python
def check_for_updates(self):
    current_mtime = os.path.getmtime(self.rulebase_path)
    if current_mtime != self.last_modified:
        print("Rulebase updated! Reloading...")
        self.load_rules()
        self.last_modified = current_mtime
```

**Benefit:** Edit rules → Save → Changes live instantly! No restart needed.

---

## 🎯 Best Practices

### 1. Start Conservative
```yaml
# New environment? Start with high thresholds
threshold: 10
time_window: 300
```
Gradually lower as you understand normal behavior.

### 2. Use Descriptive Names
```yaml
# Bad
name: "Rule 1"

# Good
name: "Brute Force Attack - Failed Login Pattern"
```

### 3. Document Your Rules
```yaml
# Custom Rule - Added 2026-01-05
# Detects unusual API call patterns specific to our application
- rule_id: "CUSTOM_001"
  description: "Added after reviewing incident #42; catches bulk API abuse"
```

### 4. Test Before Production
```bash
# Test with sample data
curl -X POST http://localhost:8002/correlate \
  -d '{"events": [test_events], "time_window_minutes": 5}'
```

### 5. Version Control
```bash
git add rulebase.yaml
git commit -m "Added rule for detecting API abuse"
```

### 6. Regular Review
- Monthly: Review rule effectiveness
- Quarterly: Update based on new threats
- Annually: Align with latest MITRE ATT&CK

---

## 🧪 Testing Rules

### Method 1: Using API Correlation Endpoint

```bash
# Create test events that should trigger rule
curl -X POST http://localhost:8002/correlate \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {"event_id": "1", "event_type": "FailedLogin", "user_id": "test@co.com", ...},
      {"event_id": "2", "event_type": "FailedLogin", "user_id": "test@co.com", ...},
      {"event_id": "3", "event_type": "FailedLogin", "user_id": "test@co.com", ...},
      {"event_id": "4", "event_type": "FailedLogin", "user_id": "test@co.com", ...},
      {"event_id": "5", "event_type": "FailedLogin", "user_id": "test@co.com", ...}
    ]
  }'

# Expected: Rule T1110 triggers
```

### Method 2: Using Sample Data Endpoint

```bash
# 1. Get brute force sample
curl http://localhost:8002/sample-data/brute-force

# 2. Submit to correlate
# Should trigger brute force rule
```

### Method 3: Incremental Testing

```bash
# Submit events one at a time
for i in {1..5}; do
  curl -X POST http://localhost:8002/ingest \
    -d "{\"event_id\": \"evt_$i\", \"event_type\": \"FailedLogin\", ...}"
done

# Check incidents
curl http://localhost:8002/incidents
```

---

## 🔧 Troubleshooting

### Rule Not Triggering

**Check 1: Event Type Match**
```yaml
# Rule expects
event_types: ["FailedLogin"]

# But event has
event_type: "LoginFailed"  # ✗ Doesn't match!
```
**Fix:** Update rule to include variant

**Check 2: Threshold Not Met**
```yaml
threshold: 5  # Need 5 events
```
Submitted only 4 events → No alert

**Fix:** Submit more events or lower threshold

**Check 3: Time Window Expired**
```yaml
time_window: 60  # Events must be within 60 seconds
```
Events are 2 minutes apart → Not correlated

**Fix:** Increase time window or submit events closer together

**Check 4: Conditions Not Met**
```yaml
condition:
  status: "DENY"
```
Event has `status: "ALLOW"` → Doesn't match

**Fix:** Check event fields match conditions

### YAML Syntax Errors

**Error:** `yaml.scanner.ScannerError`

**Common Mistakes:**
```yaml
# Bad: Mixed tabs and spaces
  - rule_id: "T1110"
	name: "Attack"  # ✗ Tab used here!

# Good: Consistent spaces (2 or 4)
  - rule_id: "T1110"
    name: "Attack"
```

**Validate YAML:**
```bash
python -c "import yaml; yaml.safe_load(open('rulebase.yaml'))"
# No output = valid YAML!
```

### Rule File Not Found

**Error:** `FileNotFoundError: rulebase.yaml`

**Check:**
```bash
ls -la incident_detection/rulebase.yaml
```

**Fix:** Create default rulebase or check file path

---

## 📊 Rule Performance Metrics

### Measuring Effectiveness

**True Positives:** Correctly detected attacks
**False Positives:** Normal behavior flagged as attack
**False Negatives:** Missed real attacks
**True Negatives:** Normal behavior correctly ignored

**Goal:** Maximize TP, minimize FP/FN

### Tuning for Your Environment

**Too Many False Positives?**
- Increase threshold
- Narrow time window
- Add more specific conditions

**Missing Attacks (False Negatives)?**
- Decrease threshold
- Widen time window
- Broaden event_types

---

## 🎓 Summary

**Rulebase = Detection Logic**
- YAML configuration file
- Defines attack patterns
- Uses MITRE ATT&CK framework
- Hot-reloads automatically

**Key Features:**
- Flexible thresholds
- Time-based correlation
- Custom conditions
- Actionable recommendations

**Best Practices:**
- Start conservative
- Test thoroughly
- Version control
- Regular updates

---

**Last Updated:** January 5, 2026  
**Component:** Incident Detection (IT22033550)  
**File:** `incident_detection/rulebase.yaml`  
**Format:** YAML
