# Ticket #2: Dynamic Weighting Scoring Algorithm & Gap Analysis Analytics

- **ID:** TICKET-02
- **Status:** 📋 Backlog / Specified
- **Priority:** Medium
- **Components:** Telemetry Engine, Analytics Dashboard, Curation UX
- **Authors:** Quatrain & Bradtech Engineering Teams

---

## 🎯 Objective & Business Value

Empower domain curators and agronomists with actionable intelligence regarding knowledge coverage:
- Calculate real-time dynamic relevance scores based on real-world farmer usage and telemetry feedback.
- Detect "agronomic knowledge gaps" across pedoclimatic zones and crop itineraries.
- Prioritize curation queues automatically towards missing, incomplete, or highly queried topics.

---

## 🏗️ Technical Architecture & Specifications

### 1. Dynamic Weighting Formula
Each OKF document receives a composite relevance index calculated as:
$$\text{Score}(d) = w_1 \cdot \text{Consultations}(d) + w_2 \cdot \text{FeedbackRatio}(d) + w_3 \cdot \text{RecencyFactor}(d)$$

Where:
- $\text{FeedbackRatio}(d) = \frac{\text{thumbsUp} + 1}{\text{thumbsUp} + \text{thumbsDown} + 2}$ (Laplacian smoothed).
- Low scoring documents (< 0.3) trigger automatic review tasks in the curation workbench.

### 2. Gap Analysis Heatmap
Expose a visual 2D matrix comparing:
- Horizontal Axis: Crop types & technical itineraries.
- Vertical Axis: Pedoclimatic combinations (soil $\times$ climate).
- Cell Color: Depth of curated document coverage (green: comprehensive, red: zero documentation).

---

## 📋 Acceptance Criteria

- [ ] Telemetry endpoint `/api/telemetry` calculates normalized document scores.
- [ ] Visual gap analysis matrix rendered within the curation workbench dashboard.
- [ ] Priority sorting in curation queue prioritizing low-coverage categories.
