# Ticket #5: Generic Hub Engine Decoupling & Downstream Tenant Deployments

- **ID:** TICKET-05
- **Status:** 📋 Backlog / Specified (High Architectural Importance)
- **Priority:** High
- **Components:** `modaka-hub`, Configuration, Middleware, RBAC, Branding
- **Authors:** Quatrain Engineering Team

---

## 🎯 Architectural Value

The upstream repository **`Quatrain/modaka-hub`** MUST remain a **pure, generic, cloud-native curation and knowledge authority engine** adhering to Quatrain's 3-tier open-source / downstream deployment architecture.

Downstream enterprise instances (e.g. `hub.example.org`) are downstream tenant deployments.

Consequently, all hardcoded references to specific downstream organizations, specific email domains, and default authority paths must be eliminated from the core repository and managed purely through configuration injection.

---

## 🏗️ Parameterization Matrix

| Element | Previous State | Decoupled Target (Generic Modaka-Hub) | Environment Variable / Config |
| :--- | :--- | :--- | :--- |
| **Login Domain** | Hardcoded domain in auth callback | Dynamic comma-separated whitelist or wildcard `*` | `ALLOWED_EMAIL_DOMAINS` (e.g. `*` or `@example.org,@quatrain.dev`) |
| **RBAC Roles** | Downstream alias roles | Canonical root roles `admin`, `curator`, `anonymous` | `modakaRoles` in `src/rbac/roles.ts` |
| **Source of Authority** | Hardcoded authority repo | Configurable per instance | `DEFAULT_SOA` / `SOA_CANONICAL_URI` |
| **Branding & Identity** | Hardcoded titles and badges | Injectable UI parameters | `HUB_NAME`, `HUB_ORGANIZATION`, `HUB_LOGO_URL` |
| **Git Authority Repo** | Local machine paths | Explicit environment variables | `GIT_LOCAL_PATH`, `GIT_REPO_OWNER`, `GIT_REPO_NAME` |
| **Taxonomies** | Fixed axes | Dynamic taxonomy providers | `modaka-hub.config.json` or dynamic endpoints |

---

## 📋 Acceptance Criteria

- [ ] Zero hardcoded email domains in core auth middleware.
- [ ] Root RBAC definitions use universal standard identifiers (`admin`, `curator`).
- [ ] Downstream deployment fully reproducible via Kubernetes ConfigMaps and Helm templates without repository forks.
