# LLM Agent Instructions & Guidelines — Modaka-Hub

> **Audience**: AI Coding Agents & Human Pair Programming  
> **Platform**: Astro 5 (Node.js SSR) + React 18 + Mantine UI + Quatrain Core & CoreUX + OKF v0.1 + Supabase Auth & RBAC  
> **Repository**: `crapougnax/modaka-hub` | **License**: AGPL-v3

---

## 🧭 1. Base Guidelines & Primary Hierarchy

All AI coding agents interacting with this workspace **MUST** strictly load and adhere to the author's primary development rules, GitFlow protocol, and 3-tier forking architecture defined in:
👉 **[Author's Global AI Rules, Architecture Standards & GitFlow Protocol (AGENTS.md)](https://gist.github.com/crapougnax/47971b85aa73dd702f4372a89858111c)**

---

## 🏗️ 2. Project-Specific Architecture & Guidelines

### A. Central Authority Hub & Multi-Axial Ingestion
- **Single Source of Authority (SOA):** Modaka-Hub serves as the central scientific authority repository (e.g. `quatrain/authority`).
- **4 Fundamental Orthogonal Axes:** Every document ingested or curated is tagged across 4 distinct axes:
  1. **Sols** (`soils`: e.g. `argilo-calcaire`, `limoneux`, `sableux`, `acide`, `vivant-microbiote`, `glomaline`)
  2. **Climats** (`climates`: e.g. `mediterraneen`, `oceanique`, `semi-aride`, `continental`)
  3. **Latitude & Altitude** (`latitudes`, `altitudes` or geographic bounding box)
  4. **Itinéraires Techniques** (`itineraries`: e.g. `viticulture-biologique`, `semis-direct`, `enherbement-permanent`, `faca-roulage`)
- **Dynamic Axes Support:** Taxonomy dimensions and allowable values are loaded dynamically from `bookworm.config.json` and synchronized with live OKF knowledge bases.

### B. Open Knowledge Format (OKF v0.1) & Lineage Contract
All knowledge documents curated or exported MUST strictly follow the OKF v0.1 specification:
- **Mandatory Lineage Header:** Every fiche must declare its Source of Authority and revision stamp:
  ```yaml
  ---
  soa: quatrain/authority
  revision: rev-2026.08-cbf52a9
  type: guide
  title: Guide pratique des couverts végétaux
  category: cover-crops
  thematics: [cover-crops, soil-health]
  soils: [argilo-calcaire]
  climates: [mediterraneen]
  itineraries: [viticulture-biologique]
  tags: [viticulture, couverts-vegetaux]
  ---
  ```
- **Semantic Slugs:** Filenames and directories use lowercase slugified titles (`content/<category>/<slug>.md`), never random UUIDs.
- **Flat YAML Frontmatter:** No empty or null properties; exclude empty strings (`""`).
- **Progressive Disclosure:** Each thematic category maintains an auto-generated `index.md` for fast, token-efficient hierarchical navigation.

### C. Authentication & Role-Based Access Control (RBAC)
- **Identity Provider:** Supabase Auth with double-mode authentication:
  - Direct email / password via Supabase Auth API (`POST /api/auth/password-login`).
  - SSO / OAuth 2.0 PKCE S256 (`/api/auth/login` + `/api/auth/callback`).
  - Silent token refresh via secure HTTP-only cookies in `src/middleware.ts`.
- **Domain Restriction:** Configurable email domain whitelist enforced via `ALLOWED_EMAIL_DOMAINS` or config container (`*` or comma-separated domains).
- **Root Roles & Granular Policies (`@quatrain/auth-rbac`):**
  - **`admin`:** Full administrative access (git commit & remote push, taxonomy edition, adapter settings).
  - **`curator`:** Content curator access (OKF document curation, dropzone upload, contextual extraction, local commit). Remote git push and taxonomy structural edits are denied.
- **Field-Level Security (FLS):** Critical lineage fields (`soa`, `revision`) are strictly `readonly` for non-admin users and must be validated through `rbac.sanitizeWrite('document', payload)`.

### D. Contextual Extraction Engine (`/api/extract`)
- **Profile Matching:** Extracts relevant subsets of the central authority repository tailored to specific context profiles (soil, climate, altitude, practices).
- **Target Export:** Generates customizable OKF trees or initializes dedicated client Git repositories for local instances (`client.example.com` / Modaka Client).

### E. Asynchronous Queue Architecture
- **Non-blocking Ingestion:** Document parsing (PDF OCR, text extraction, AI summarization via Gemini) runs through `@quatrain/queue` / SQLite queue.
- Foreground API endpoints must remain sub-second responsive and delegate long-running analysis to the worker queue.

---

## 🛠️ 3. Essential Verification Commands

| Action | Command |
| :--- | :--- |
| **Run Unit Tests** | `yarn test` |
| **Start Development Server** | `yarn dev` (accessible on `http://localhost:4321`) |
| **Build Production Artifacts** | `yarn build` |
