# Ticket #5 : Découplage du Moteur Générique Modaka-Hub & Déploiement Downstream (`hub.hey.brad.ag`)

- **ID :** TICKET-05
- **Statut :** 📋 Backlog / Spécifié (Haute Importance Architecturale)
- **Priorité :** Haute
- **Composants :** `modaka-hub`, Config, Middleware, RBAC, Branding
- **Auteurs :** Équipe Quatrain & Bradtech

---

## 🎯 Enjeu Architectural

Le dépôt **`modaka-hub`** doit demeurer le **moteur générique et réutilisable** d'atelier de curation et d'autorité de connaissances (conforme à l'architecture 3-tiers open-source / downstream Quatrain).

L'instance **`hub.hey.brad.ag`** (ou `hub.brad.ag`) est une instanciation / déploiement downstream spécifique de ce moteur pour le compte de Bradtech.

Il est donc impératif de **bannir tout codage en dur** d'éléments spécifiques à Bradtech dans le cœur de `modaka-hub`.

---

## 🏗️ Matrice de Paramétrage & Découplage

| Élément | État Actuel (Hardcodé Bradtech) | Cible Découplée (Générique Modaka-Hub) | Variable / Config |
| :--- | :--- | :--- | :--- |
| **Domaine de connexion** | `@brad.ag` en dur dans `middleware.ts` & `login` | Liste dynamique de domaines autorisés (ou désactivable) | `ALLOWED_EMAIL_DOMAINS` (ex: `@brad.ag,@quatrain.dev`) |
| **Rôles RBAC** | `admin-brad`, `user-brad` | Rôles canoniques `admin`, `curator`, `viewer` (avec mapping/alias rétrocompatible) | `ADMIN_ROLES`, `CURATOR_ROLES` |
| **Source d'Autorité (SOA)** | `bradtech/world-agronomy` | Configurable par instance | `DEFAULT_SOA` / `SOA_CANONICAL_URI` |
| **Branding & Identité** | "Bradtech", "Hey Brad" | Paramètres d'habillage UI injectables | `HUB_NAME`, `HUB_ORGANIZATION`, `HUB_LOGO_URL` |
| **Dépôt Git d'autorité** | `/Users/.../world-agronomy` | Variables d'environnement strictes sans fallback machine | `GIT_LOCAL_PATH`, `GIT_REPO_OWNER`, `GIT_REPO_NAME` |
| **Axes Taxonomiques** | 4 axes viticoles/agronomiques | Chargement dynamique depuis le fichier de config | `modaka-hub.config.json` ou endpoint dynamique |

---

## 📋 Plan de Découplage

1. **Rôles RBAC Isomorphes** :
   - Rendre les rôles racine universels : `admin`, `curator`, `member`, `guest`.
   - Maintenir les alias `admin-brad` $\to$ `admin` et `user-brad` $\to$ `curator` pour préserver la compatibilité immédiate avec les tokens existants de `hub.hey.brad.ag`.
2. **Externalisation du filtrage des domaines** :
   - `const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || '@brad.ag').split(',').map(d => d.trim());`
   - Possibilité de wildcard `*` pour des hubs ouverts.
3. **Template de Déploiement Downstream** :
   - Documenter la configuration Helm / Containerfile pour instancier `hub.hey.brad.ag` par simple injection de ConfigMap et Secrets Kubernetes, sans fork de code superflu.
