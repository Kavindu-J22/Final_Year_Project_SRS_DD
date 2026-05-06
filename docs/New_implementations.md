# New Implementations - Enhancing Core Components for Research Excellence

This plan outlines the technical enhancements for the four core components of the Cloud Forensics Platform to satisfy supervisor and research panel requirements for increased "performance and usefulness."

## 1. Identity Attribution & Behavior Profiling (Component 1)

### Goal: Add "Explainability" and "Adaptive Weighting" to the ML Ensemble.
Currently, the ensemble uses a simple majority vote. Research value increases if the system can explain *why* it flagged a session.

#### Proposed Changes:
- **Weighted Voting**: Replace simple majority with a weighted ensemble based on model confidence scores.
- **Feature Importance (SHAP-inspired)**: Implement a custom "contribution analysis" that identifies which of the 7 features contributed most to the anomaly score.
- **Frontend**: Update the dashboard to show a "Reasoning" card explaining the risk factors.

## 2. Incident Detection & Correlation (Component 2)

### Goal: Implement "Multi-Stage Kill-Chain Correlation."
Currently, it detects individual patterns (Brute Force, Insider). Research value increases by correlating different *types* of attacks into a unified kill chain.

#### Proposed Changes:
- **Stateful Kill-Chain Tracker**: Detect sequences like `Reconnaissance` → `Credential Access` → `Exfiltration`.
- **Contextual Severity**: Increase severity if an IP/User triggers multiple distinct MITRE techniques within a window.
- **Frontend**: Add a "Kill Chain Progress" visualization in the Incident details.

## 3. Evidence Preservation (Component 3)

### Goal: Implement "Merkle Tree Batching" and "Integrity Sentinel."
Current implementation is a linear hash chain. A Merkle Tree structure is more robust and research-novel for high-volume logs.

#### Proposed Changes:
- **Merkle Tree Integration**: Batch log entries into Merkle Trees and store the root hash in the chain.
- **Integrity Sentinel**: Create a background service (or logic) that performs continuous "heartbeat" verification of the chain.
- **Frontend**: Add an "Integrity Report" tab showing the cryptographic health of the ledger.

## 4. Forensic Timeline Reconstruction (Component 4)

### Goal: Add "Semantic Clustering" and "Automated Narrative Generation."
Currently uses TF-IDF and DBSCAN. Enhancement involves better semantic understanding and human-readable reporting.

#### Proposed Changes:
- **Advanced Semantic Weighting**: Improve the TF-IDF vectorizer with n-gram analysis of attack payloads.
- **Automated Forensic Report**: Generate a human-readable summary of an attack's timeline (e.g., "Attacker started at T, escalated at T+5m...").
- **Frontend**: Add a "Download Forensic Report" button that synthesizes the cluster data into a PDF/Markdown summary.

---

## User Review Required

> [!IMPORTANT]
> These enhancements involve modifying the core ML logic and the API schemas. Ensure that the `smoke_test.py` is updated accordingly.

> [!NOTE]
> For Component 4's "Narrative Generation," we will use a template-driven approach to ensure high performance without requiring a heavy local LLM, while still providing "Research-grade" outputs.

## Open Questions

1. Do you have any specific "Research Questions" or "Hypotheses" the panel wants you to prove (e.g., "Ensemble accuracy > Single model accuracy")?
2. Should I prioritize the UI visual excellence (charts/graphs) or the backend algorithmic depth?

## Proposed Changes

### Component 1: Identity Profiling

#### [MODIFY] [ml_models.py](file:///f:/Final_Year_Project_SRS_DD/identity_profiling/src/ml_models.py)
- Implement `WeightedEnsembleDetector`.
- Add `get_feature_contributions(X)` method.

#### [MODIFY] [api.py](file:///f:/Final_Year_Project_SRS_DD/identity_profiling/api.py)
- Update `/analyze` response to include `contribution_factors`.

### Component 2: Incident Detection

#### [MODIFY] [correlator.py](file:///f:/Final_Year_Project_SRS_DD/incident_detection/src/correlator.py)
- Implement `KillChainCorrelator` to track sequences across different MITRE categories.

#### [MODIFY] [api.py](file:///f:/Final_Year_Project_SRS_DD/incident_detection/api.py)
- Update `/correlate` logic to handle multi-stage alerts.

### Component 3: Evidence Preservation

#### [NEW] [merkle.py](file:///f:/Final_Year_Project_SRS_DD/evidence_preservation/src/core/merkle.py)
- Implementation of a Merkle Tree for batch evidence.

#### [MODIFY] [api.py](file:///f:/Final_Year_Project_SRS_DD/evidence_preservation/api.py)
- Integrate Merkle roots into the `EVIDENCE_CHAIN`.

### Component 4: Forensic Timeline

#### [MODIFY] [timeline_generator.py](file:///f:/Final_Year_Project_SRS_DD/forensic_timeline/src/timeline_generator.py)
- Implement `ForensicReportGenerator` for automated narrative synthesis.

---

## Verification Plan

### Automated Tests
- Run `python smoke_test.py` to ensure core functionality remains intact.
- Create specific test scripts for new features (e.g., `verify_merkle_proof.py`).

### Manual Verification
- Walk through the frontend for each component to verify the new UI elements (Explainability cards, Kill chain icons, Integrity reports).
