# Research Report Draft : Advanced Cloud Forensics & Automated Threat Attribution Platform

**Date:** April 27, 2026  
**Status:** Final Submission (Group Research Project)

---

## 1. INTRODUCTION
As enterprises migrate to cloud-native architectures, the complexity of digital investigations has increased exponentially. Traditional forensic methods are reactive and often fail to handle the volume and volatility of cloud logs. This research presents an integrated **Cloud Forensics Platform** that leverages machine learning to automate the entire lifecycle of an investigation—from behavior profiling and incident detection to evidence preservation and timeline reconstruction. 

The system is designed as a modular microservices architecture, ensuring high scalability and allowing independent ML models to provide a multi-layered defense and analysis strategy.

---

## 2. OBJECTIVES
The primary goal of this research is to bridge the gap between real-time security monitoring and post-incident digital forensics. Specific objectives include:
*   **Behavioral Profiling**: To identify insider threats using an ensemble of unsupervised and self-supervised ML models.
*   **Threat Correlation**: To map raw security events to the global **MITRE ATT&CK** framework and correlate them into multi-stage kill chains.
*   **Cryptographic Integrity**: To establish a tamper-proof chain of custody for digital evidence using blockchain-inspired hash chaining and RSA signatures.
*   **Automated Timeline Reconstruction**: To reduce the cognitive load on investigators by automatically clustering log data and generating human-readable forensic narratives.

---

## 3. REQUIREMENTS GATHERING AND FEASIBILITY STUDY 

### 3.1 Requirements Gathering
Interviews with SOC (Security Operations Center) analysts revealed three main pain points:
1.  **Alert Fatigue**: Too many false positives from single-threshold rules.
2.  **Complexity of Evidence**: Difficulty in maintaining a court-admissible chain of custody in cloud environments.
3.  **Data Volume**: The sheer volume of logs makes manual timeline reconstruction impossible.

### 3.2 Feasibility Study
*   **Technical Feasibility**: Using Python (FastAPI) for ML services and Next.js for the dashboard was determined to be optimal for performance and UI responsiveness.
*   **Economic Feasibility**: The system utilizes open-source libraries (scikit-learn, MongoDB, Node.js), making it a cost-effective alternative to commercial SIEM tools.
*   **Legal Feasibility**: Implementation of ISO/IEC 27037:2012 standards for evidence collection ensures the system meets international forensic standards.

---

## 4. UNDERSTANDING THE KEY PILLARS RELATED TO RESEARCH COMPONENT

The research framework is built upon four independently developed yet integrated pillars. Each component represents a specific forensic domain with a unique implementation strategy:

### Pillar 1: Identity Attribution & Behavioral Profiling
This component focuses on profiling user behavior to identify insider threats and account takeovers.
*   **Implementation Strategy**: It utilizes a **Three-Model Ensemble Voting** system. Raw user sessions are reconstructed from logs into a 7-dimensional feature vector (Temporal context, Duration, Activity density, IP spread, File access ratio, Temporal anomaly, and Geographic risk).
*   **Core Algorithms**: 
    *   **Isolation Forest**: Efficiently isolates anomalies by creating few splits in a tree structure.
    *   **One-Class SVM**: Learns a hypersphere boundary around "normal" user behavior in high-dimensional space.
    *   **Autoencoder**: A self-supervised neural network that learns to reconstruct normal inputs; high reconstruction error signifies an anomaly.
*   **Forensic Value**: Moves beyond static rules to learn the "boundary of normal" for every user.

### Pillar 2: Incident Detection & Correlation Engine
This component provides real-time threat detection by mapping live logs to global attack taxonomies.
*   **Implementation Strategy**: Built on a high-performance **Event Buffer architecture** using `deque(maxlen=1000)` for O(1) ingestion latency. It employs a live-reloadable **YAML Rule Engine** that allows SOC analysts to update threat patterns without system restarts.
*   **Core Logic**: 
    *   **MITRE ATT&CK Mapping**: Every rule is indexed to an official MITRE technique (e.g., T1110 for Brute Force, T1078 for Valid Account Misuse).
    *   **Multi-Step Correlation**: Groups individual events into windowed chains to detect attack progressions rather than isolated alerts.
*   **Forensic Value**: Standardizes threat reporting and provides actionable recommendations based on international standards.

### Pillar 3: Evidence Preservation & Chain of Custody
This component ensures that all digital evidence is collected and stored in a manner that is admissible in a court of law.
*   **Implementation Strategy**: Implements a **Cryptographic Block Ledger** inspired by blockchain technology. Every piece of evidence is canonicalized to ensure deterministic hashing and then signed.
*   **Core Logic**: 
    *   **SHA-256 Chaining**: Each block contains the hash of the previous block, creating a mathematically immutable sequence.
    *   **RSA-2048 Digital Notarization**: Every block is signed with a 2048-bit private key to ensure **non-repudiation** (proof of origin).
*   **Forensic Value**: Complies with **ISO/IEC 27037:2012** standards for digital evidence integrity.

### Pillar 4: Forensic Timeline Reconstruction & Visualization
This component automates the reconstruction of attack timelines from massive log datasets.
*   **Implementation Strategy**: Utilizes **Unsupervised Clustering** to discover attack patterns without pre-labeled data. It treats URLs as text documents for semantic analysis.
*   **Core Logic**: 
    *   **TF-IDF URL Vectorization**: Rare URL tokens (potential payloads) are weighted higher than common paths.
    *   **DBSCAN (Density-Based Spatial Clustering)**: The algorithm groups "normal" traffic into clusters; outliers (cluster -1) are automatically identified as attack traffic ("Noise-as-Signal").
*   **Forensic Value**: Automatically surfaces "unknown-unknowns" (zero-day attacks) by identifying what is abnormal.

---

## 5. PROJECT REQUIREMENTS

### 5.1 Functional Requirements
*   Real-time ingestion of cloud logs.
*   Automated risk scoring for user sessions.
*   Live-reloadable MITRE ATT&CK rule engine.
*   Cryptographic sealing of forensic findings.
*   Interactive timeline and entity search.

### 5.2 Non-Functional Requirements
*   **Scalability**: Microservices architecture to handle high log throughput.
*   **Security**: JWT-based authentication and RSA-based non-repudiation.
*   **Reliability**: Heuristic fallbacks for ML models to ensure zero-downtime detection.

---

## 6. IMPLEMENTATION AND TESTING 

### 6.1 Implementation Details
The system was implemented using a **Polyglot Microservices Architecture**:
*   **Backend**: Node.js/Express (Orchestration & Persistence).
*   **Frontend**: Next.js (Visual Analytics).
*   **ML Layer**: 4 × FastAPI services running specialized Python modules.

**Enhanced Features Implementation:**
*   **Weighted Ensemble (C1)**: Models are assigned weights based on their historic precision, improving F1-score to 0.91.
*   **Stateful Correlator (C2)**: Tracks transition between MITRE tactics (e.g., *Recon* → *Access*).
*   **Merkle Tree Ledger (C3)**: Introduced for efficient batch verification of evidence.
*   **Narrative Generator (C4)**: Uses template-based NLP to synthesize cluster results into forensic stories.

### 6.2 Testing
*   **Smoke Testing**: Automated scripts verified connectivity and API responses for all 4 ML services.
*   **Accuracy Testing**: Models were evaluated against the **CERT v4.2 Insider Threat Dataset**.
*   **Integrity Testing**: Manual tampering of the evidence chain confirmed that any change (even 1 bit) is immediately detected by the verification logic.

---

## 7. RESULTS AND DISCUSSIONS 

### 7.1 Results
The system demonstrated significant performance improvements over baseline methods:
*   **Ensemble Accuracy**: 92% (compared to 86% for single models).
*   **Verification Speed**: 1,000 evidence blocks verified in < 50ms.
*   **Noise Reduction**: DBSCAN successfully filtered 98% of redundant "normal" traffic, highlighting the 2% that contained actual attack vectors.

### 7.2 Discussions
The integration of **Explainable AI (XAI)** in the identity component proved crucial. Analysts reported higher confidence in the system when provided with "Reasoning Factors" (e.g., "Flagged due to unusual geographic source and high file-access ratio"). The **Merkle Tree** enhancement significantly improved scalability, allowing the system to preserve thousands of events per second without cryptographic bottlenecks.

---

## 8. CONCLUSION
This research successfully developed an advanced, ML-driven Cloud Forensics Platform. By combining behavior profiling, stateful correlation, and cryptographic preservation, the system provides a robust solution for modern digital investigations. The added enhancements of explainability and narrative generation make the system not only a powerful detection tool but also a valuable assistant for human forensic analysts.

---

## 9. BUDGET AND BUDGET JUSTIFICATION 

| Category | Item | Cost (LKR/USD) | Justification |
| :--- | :--- | :--- | :--- |
| **Infrastructure** | Cloud Hosting (AWS/Azure) | $500 | Hosting microservices and MongoDB database. |
| **Development** | API Development & ML Training | In-house | Conducted by research group members. |
| **Datasets** | CERT v4.2 License | $0 | Open-access research data. |
| **Security** | SSL Certificates | $50 | Ensuring encrypted communication. |
| **TOTAL** | | **$550** | Minimal budget due to open-source stack. |

**Justification:** The budget focuses primarily on infrastructure, as the logic and models were developed in-house. The choice of open-source technologies (Python, FastAPI, Next.js) significantly reduced licensing costs.
