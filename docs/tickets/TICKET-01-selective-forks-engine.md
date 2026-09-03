# Ticket #1: Selective Forks Engine & Git Provisioning for Farm Instances

- **ID:** TICKET-01
- **Status:** 📋 Backlog / Specified
- **Priority:** High
- **Components:** Backend, Git Integration, Extraction Pipeline (`/api/extract`)
- **Authors:** Quatrain & Bradtech Engineering Teams

---

## 🎯 Objective & Business Value

Enable farm-level autonomous instances (e.g. `chateau-margaux.brad.farm`) to provision and maintain a dedicated, isolated OKF repository containing strictly the agronomic knowledge relevant to their specific pedoclimatic and crop context:
- Extracting relevant subsets from the central Source of Authority (SOA: `bradtech/world-agronomy`).
- Provisioning remote Git repositories (GitHub / GitLab / Gitea) for individual farm tenants.
- Establishing an automated upstream/downstream synchronization mechanism with conflict-free merge policies.

---

## 🏗️ Technical Architecture & Specifications

### 1. Context Matching Algorithm
The endpoint `/api/extract` evaluates incoming queries from edge farm agents containing:
- Soil taxonomy tokens (e.g., `argilo-calcaire`, `grave-alluvionnaire`).
- Climatic classifications (e.g., `mediterraneen`, `oceanique-altere`).
- Latitude and altitude bounds.
- Technical itineraries and perennial crop types (e.g., `cabernet-sauvignon`, `merlot`).

The engine filters matching OKF files from `world-agronomy/content/` based on multi-axial frontmatter metadata.

### 2. Git Sub-Tree Provisioning Pipeline
When a new farm instance requests onboarding:
1. Initialize a bare Git repository: `git init --bare farms/<farm-id>.git`.
2. Materialize only the matching OKF concept files and itineraries.
3. Inject the farm's origin remote and commit the contextualized baseline with metadata tracking:
   ```yaml
   upstream_soa: bradtech/world-agronomy
   upstream_revision: rev-64fa81a
   farm_tenant_id: farm-8492
   ```
4. Expose automated webhook endpoints for downstream synchronization notifications.

---

## 📋 Acceptance Criteria

- [ ] `/api/extract` returns exact multi-axial matches formatted as an OKF-compliant bundle.
- [ ] Automated generation of standalone Git repos with sanitized history for external farm instances.
- [ ] Zero credential leaks during downstream provisioning.
