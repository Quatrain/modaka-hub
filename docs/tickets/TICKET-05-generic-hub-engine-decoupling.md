# Ticket #5: Generic Hub Engine Decoupling & Downstream Tenant Deployments (`hub.hey.brad.ag`)

- **ID:** TICKET-05
- **Status:** 📋 Backlog / Specified (High Architectural Importance)
- **Priority:** High
- **Components:** `modaka-hub`, Configuration, Middleware, RBAC, Branding
- **Authors:** Quatrain & Bradtech Engineering Teams

---

## 🎯 Architectural Value

The upstream repository **`Quatrain/modaka-hub`** MUST remain a **pure, generic, cloud-native curation and knowledge authority engine** adhering to Quatrain's 3-tier open-source / downstream deployment architecture.

The instance **`hub.hey.brad.ag`** (or `hub.brad.ag`) is a downstream enterprise deployment tailored for Bradtech tenancy.

Consequently, all hardcoded references to Bradtech, specific email domains, and default agronomic authority paths must be eliminated from the core repository and managed purely through configuration injection.

---

## 🏗️ Parameterization Matrix

| Element | Previous State (Hardcoded Bradtech) | Decoupled Target (Generic Modaka-Hub) | Environment Variable / Config |
| :--- | :--- | :--- | :--- |
| **Login Domain** | `@brad.ag` hardcoded in `middleware.ts` & `login` | Dynamic comma-separated whitelist or wildcard `*` | `ALLOWED_EMAIL_DOMAINS` (e.g. `@brad.ag,@quatrain.dev`) |
| **RBAC Roles** | `admin-brad`, `user-brad` | Canonical root roles `admin`, `curator`, `viewer` (with alias inheritance) | `modakaRoles` in `src/rbac/roles.ts` |
| **Source of Authority** | `bradtech/world-agronomy` | Configurable per instance | `DEFAULT_SOA` / `SOA_CANONICAL_URI` |
| **Branding & Identity** | Hardcoded titles and badges | Injectable UI parameters | `HUB_NAME`, `HUB_ORGANIZATION`, `HUB_LOGO_URL` |
| **Git Authority Repo** | Local machine paths | Explicit environment variables | `GIT_LOCAL_PATH`, `GIT_REPO_OWNER`, `GIT_REPO_NAME` |
| **Taxonomies** | 4 hardcoded agronomic axes | Dynamic taxonomy providers | `modaka-hub.config.json` or dynamic endpoints |

---

## 📋 Acceptance Criteria

- [ ] Zero hardcoded email domains in core auth middleware.
- [ ] Root RBAC definitions use universal standard identifiers (`admin`, `curator`).
- [ ] Downstream deployment for `hub.hey.brad.ag` fully reproducible via Kubernetes ConfigMaps and Helm templates without repository forks.
