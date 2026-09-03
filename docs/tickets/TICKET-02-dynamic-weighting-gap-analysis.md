# Ticket #2 : Moteur de Pondération Dynamique & Analytics Avancées (Gap Analysis)

- **ID :** TICKET-02
- **Statut :** 📋 Backlog / Spécifié
- **Priorité :** Moyenne
- **Composants :** `modaka-hub`, `telemetry`, `@quatrain/ux-curation`
- **Auteurs :** Équipe Quatrain & Bradtech

---

## 🎯 Objectif Métier

Consolider la télémétrie anonymisée remontant des instances décentralisées ("Hey Brad" / fermes) pour :
1. Calculer un **score de pertinence et d'autorité scientifique dynamique** pour chaque fiche OKF.
2. Détecter les manques ("Gap Analysis") : questions récurrentes des agriculteurs sur le terrain sans réponse documentée dans `world-agronomy`.

---

## 🏗️ Spécifications Techniques

### 1. Formule de Scoring Algorithmique
Pour chaque fiche OKF $i$ :
$$\text{Score}_i = \text{BaseQuality}_i \times \log_2(1 + \text{UsageCount}_i) \times \left(\frac{\text{HelpfulVotes}_i + 1}{\text{HelpfulVotes}_i + \text{UnhelpfulVotes}_i + 2}\right)$$

- $\text{BaseQuality}$ : Note attribuée par les pairs lors de la curation initiale (défaut : 1.0).
- $\text{UsageCount}$ : Nombre de fois où la fiche a été injectée dans le contexte LLM de "Hey Brad".
- $\text{HelpfulVotes} / \text{UnhelpfulVotes}$ : Retours explicites des agriculteurs (+1 / -1).

### 2. Tableau de Bord "Gap Analysis" dans le Workbench
- Onglet dédié **Analytics & Lacunes** dans `CurationWorkbench`.
- Liste ordonnée des termes et requêtes ayant généré un faible score de similarité vectorielle côté client.
- Bouton d'action directe : *"Lancer une recherche documentaire ou ingérer un PDF sur ce sujet"*.

### 3. Critères d'Acceptation
- [ ] Endpoint `/api/telemetry/stats` agrège les métriques par catégorie et par axe.
- [ ] Le score de pertinence est visualisable sur chaque `CurationCard`.
- [ ] Les données de télémétrie restent 100% anonymisées (aucune PII de ferme transmise).
