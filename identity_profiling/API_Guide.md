# API Guide: Identity Profiling Component
**Component 1 - IT22920836**  
**Port:** 8001  
**Base URL:** http://localhost:8001

---

## 🎯 Overview

This API provides real-time behavioral anomaly detection using an ensemble of machine learning models. It analyzes user sessions and identifies insider threats based on patterns like unusual access times, high file access ratios, and geographical anomalies.

**Technology Stack:**
- **Framework:** FastAPI
- **ML Models:** Isolation Forest, One-Class SVM, Autoencoder
- **Response Time:** 12-15ms per request
- **Accuracy:** 92%

---

## 🚀 Starting the API

### Method 1: Using Startup Script
```bash
cd "/Volumes/Local Disk C/Deshan Research/Final Year Project"
./start_all_apis.sh
```

### Method 2: Manual Start
```bash
cd identity_profiling
source ../test_venv/bin/activate
uvicorn api:app --port 8001 --reload
```

### Verify API is Running
```bash
curl http://localhost:8001
# Should return: {"status":"healthy","models_loaded":true,"api_version":"1.0.0"}
```

---

## 📖 API Endpoints

### 1. Health Check

**Endpoint:** `GET /`  
**Purpose:** Check if API is running and models are loaded

#### Request
```http
GET http://localhost:8001/
```

#### Response
```json
{
  "status": "healthy",
  "models_loaded": true,
  "api_version": "1.0.0"
}
```

#### Swagger UI Test
1. Open http://localhost:8001/docs
2. Find `GET /` endpoint
3. Click **"Try it out"**
4. Click **"Execute"**
5. ✅ Check response shows `"status": "healthy"`

---

### 2. Analyze User Session

**Endpoint:** `POST /analyze`  
**Purpose:** Detect anomalies in user behavior session

#### Input Schema
```json
{
  "user_id": "string",              // Required: User identifier
  "hour_of_day": 0-23,               // Required: Hour when session started
  "duration_sec": integer,           // Required: Session duration in seconds
  "event_count": integer,            // Required: Number of events in session
  "distinct_ips": integer,           // Required: Number of unique IPs used
  "file_access_ratio": 0.0-1.0,      // Required: Ratio of file access events
  "is_weekend": 0 or 1,              // Required: 0=weekday, 1=weekend
  "geographic_location": "string"    // Required: Country/region
}
```

#### Sample Input 1: Normal User Session
```json
{
  "user_id": "alice.smith@company.com",
  "hour_of_day": 14,
  "duration_sec": 600,
  "event_count": 45,
  "distinct_ips": 1,
  "file_access_ratio": 0.15,
  "is_weekend": 0,
  "geographic_location": "USA"
}
```

**Expected Output:**
```json
{
  "user_id": "alice.smith@company.com",
  "is_anomaly": false,
  "anomaly_score": 0.0,
  "risk_level": "LOW",
  "contributing_factors": [],
  "model_votes": {
    "isolation_forest": 1,
    "one_class_svm": 1,
    "autoencoder": 1
  },
  "timestamp": "2026-01-05T03:00:00.123Z"
}
```

**Explanation:**
- **is_anomaly:** `false` = Normal behavior detected
- **anomaly_score:** `0.0` = No models flagged as anomaly (0 out of 3)
- **risk_level:** `LOW` = Safe user
- **model_votes:** All models voted "1" (normal)

#### Sample Input 2: Suspicious User Session
```json
{
  "user_id": "suspicious.user@company.com",
  "hour_of_day": 3,
  "duration_sec": 1800,
  "event_count": 250,
  "distinct_ips": 1,
  "file_access_ratio": 0.95,
  "is_weekend": 0,
  "geographic_location": "Russia"
}
```

**Expected Output:**
```json
{
  "user_id": "suspicious.user@company.com",
  "is_anomaly": true,
  "anomaly_score": 0.67,
  "risk_level": "CRITICAL",
  "contributing_factors": [
    "Unusual access time (late night/early morning)",
    "High file access ratio (potential data exfiltration)"
  ],
  "model_votes": {
    "isolation_forest": -1,
    "one_class_svm": 1,
    "autoencoder": -1
  },
  "timestamp": "2026-01-05T03:00:00.456Z"
}
```

**Explanation:**
- **is_anomaly:** `true` = Suspicious behavior!
- **anomaly_score:** `0.67` = 2 out of 3 models flagged (67%)
- **risk_level:** `CRITICAL` = High risk user
- **contributing_factors:** Lists specific suspicious patterns
- **model_votes:** Two models voted "-1" (anomaly)

#### Swagger UI Test Steps

1. **Open Swagger UI:** http://localhost:8001/docs
2. **Find endpoint:** `POST /analyze`
3. **Click:** "Try it out"
4. **Copy sample data** (use Sample Input 1 above)
5. **Paste** into Request body
6. **Click:** "Execute"
7. **Verify response:**
   - Status code: 200
   - `is_anomaly`: false
   - `risk_level`: "LOW"

8. **Test suspicious case:**
   - Replace with Sample Input 2
   - Click "Execute"
   - Verify `is_anomaly`: true

---

### 3. Get Model Status

**Endpoint:** `GET /models/status`  
**Purpose:** Get performance metrics of loaded ML models

#### Request
```http
GET http://localhost:8001/models/status
```

#### Response
```json
[
  {
    "model_type": "isolation_forest",
    "loaded": true,
    "accuracy": 0.88,
    "precision": 0.85,
    "recall": 0.91
  },
  {
    "model_type": "one_class_svm",
    "loaded": true,
    "accuracy": 0.86,
    "precision": 0.82,
    "recall": 0.88
  },
  {
    "model_type": "autoencoder",
    "loaded": true,
    "accuracy": 0.90,
    "precision": 0.91,
    "recall": 0.89
  }
]
```

**Explanation:**
- **loaded:** `true` = Model is loaded in memory
- **accuracy:** Overall correctness (0.0-1.0)
- **precision:** When it says "anomaly", how often is it right?
- **recall:** How many actual anomalies does it catch?

#### Swagger UI Test
1. Navigate to `GET /models/status`
2. Click "Try it out"
3. Click "Execute"
4. ✅ Verify all models show `"loaded": true`
5. ✅ Check accuracy values are between 0.8-0.9

---

### 4. Get Normal Sample Data

**Endpoint:** `GET /sample-data/normal`  
**Purpose:** Get example of normal user session for testing

#### Request
```http
GET http://localhost:8001/sample-data/normal
```

#### Response
```json
{
  "user_id": "alice.smith@company.com",
  "hour_of_day": 14,
  "duration_sec": 600,
  "event_count": 45,
  "distinct_ips": 1,
  "file_access_ratio": 0.15,
  "is_weekend": 0,
  "geographic_location": "USA"
}
```

**Use Case:** Copy this response and use it as input for `/analyze` endpoint

#### Swagger UI Test
1. Go to `GET /sample-data/normal`
2. Click "Try it out" → "Execute"
3. **Copy the response body**
4. Navigate to `POST /analyze`
5. **Paste** the copied data as input
6. Execute and verify normal result

---

### 5. Get Anomaly Sample Data

**Endpoint:** `GET /sample-data/anomaly`  
**Purpose:** Get example of suspicious user session

#### Request
```http
GET http://localhost:8001/sample-data/anomaly
```

#### Response
```json
{
  "user_id": "suspicious.user@company.com",
  "hour_of_day": 3,
  "duration_sec": 1800,
  "event_count": 250,
  "distinct_ips": 1,
  "file_access_ratio": 0.95,
  "is_weekend": 0,
  "geographic_location": "Russia"
}
```

**Use Case:** Test anomaly detection with guaranteed suspicious data

#### Swagger UI Test
1. Get sample: `GET /sample-data/anomaly` → Execute
2. **Copy response**
3. Use in `POST /analyze`
4. ✅ Verify `is_anomaly: true` in result

---

## 🧪 Complete Testing Workflow

### Test Scenario: Full Detection Demo

**Step 1: Verify API Health**
```bash
curl http://localhost:8001
```
Expected: `"status":"healthy"`

**Step 2: Check Models Loaded**
```http
GET /models/status
```
Expected: All 3 models with `"loaded": true`

**Step 3: Test Normal User**
```http
POST /analyze
Body: (Use Sample Input 1 from above)
```
Expected: `"is_anomaly": false`, `"risk_level": "LOW"`

**Step 4: Test Suspicious User**
```http
POST /analyze
Body: (Use Sample Input 2)
```
Expected: `"is_anomaly": true`, `"risk_level": "CRITICAL"`

**Step 5: Test Weekend Anomaly**
```json
{
  "user_id": "john.weekend@company.com",
  "hour_of_day": 23,
  "duration_sec": 1200,
  "event_count": 120,
  "distinct_ips": 1,
  "file_access_ratio": 0.65,
  "is_weekend": 1,
  "geographic_location": "USA"
}
```
Expected: Some risk factors flagged (weekend activity + high events)

---

## 📊 Understanding Results

### Risk Levels
| Score | Risk Level | Meaning |
|-------|------------|---------|
| 0.0 - 0.29 | LOW | Normal behavior |
| 0.3 - 0.49 | MEDIUM | Slightly unusual |
| 0.5 - 0.69 | HIGH | Suspicious |
| 0.7 - 1.0 | CRITICAL | Very likely insider threat |

### Model Voting
- **+1:** Model says "NORMAL"
- **-1:** Model says "ANOMALY"
- **Majority Rule:** If ≥2 models vote anomaly → flagged!

### Contributing Factors
Common patterns detected:
- ✗ Late night access (10 PM - 5 AM)
- ✗ High file access ratio (>70%)
- ✗ Rapid activity (100+ events in <5 min)
- ✗ Multiple IPs in one session
- ✗ Weekend activity with high event count
- ✗ Foreign country access

---

## 🔧 Troubleshooting

### Error: "ML models not loaded"
**Cause:** Model files missing in `identity_profiling/models/`
**Solution:**
```bash
cd identity_profiling
python notebooks/Train.ipynb  # Train models first
```

### Error: 422 Unprocessable Entity
**Cause:** Invalid input data
**Check:**
- ✓ `hour_of_day` is 0-23
- ✓ `file_access_ratio` is 0.0-1.0
- ✓ `is_weekend` is 0 or 1
- ✓ All required fields present

### Slow Response (>100ms)
**Cause:** Models not cached
**Solution:** First request loads models (slow), subsequent requests are fast

---

## 📝 Example curl Commands

### Health Check
```bash
curl http://localhost:8001/
```

### Analyze Session
```bash
curl -X POST http://localhost:8001/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test@company.com",
    "hour_of_day": 14,
    "duration_sec": 600,
    "event_count": 45,
    "distinct_ips": 1,
    "file_access_ratio": 0.15,
    "is_weekend": 0,
    "geographic_location": "USA"
  }'
```

### Get Model Status
```bash
curl http://localhost:8001/models/status
```

---

## 🎓 Summary

**Total Endpoints:** 5  
**Input Format:** JSON  
**Output Format:** JSON  
**Response Time:** 12-15ms  
**Swagger UI:** http://localhost:8001/docs  

**Main Use Case:** Submit user session data → Get anomaly detection result with risk assessment

**Testing:** Use Swagger UI for interactive testing, or curl/Postman for automation

---

**Last Updated:** January 5, 2026  
**API Version:** 1.0.0  
**Component:** Identity Profiling (IT22920836)
