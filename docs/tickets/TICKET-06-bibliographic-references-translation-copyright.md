# Ticket #6 : Extraction et Conservation des Références Bibliographiques, Traductions & Copyrights

- **ID :** TICKET-06
- **Statut :** 📋 Spécifié & Implémenté
- **Priorité :** Haute
- **Composants :** `modaka-hub`, `ContentItem`, Ingestion Queue, OKF Frontmatter, Gemini Prompt
- **Auteurs :** Équipe Quatrain & Bradtech

---

## 🎯 Contexte & Objectif

Dans un atelier de curation documentaire et scientifique comme Modaka-Hub, l'importation d'ouvrages, de thèses, de rapports techniques ou d'articles scientifiques nécessite une traçabilité bibliographique et juridique rigoureuse.

Lorsqu'un ouvrage étranger est traduit ou qu'une réédition intervient, il est indispensable de conserver :
1. **Les contributeurs intellectuels** : Auteurs originaux et Traducteurs.
2. **L'édition courante** : Éditeur, numéro d'édition/version, date/année, ISBN/DOI, et copyright de l'édition.
3. **L'œuvre originale (en cas de traduction ou réédition)** : Titre original, langue d'origine, éditeur d'origine, année de parution initiale et copyright original.
4. **La citation formelle** : Chaîne normalisée (format APA / ISO 690) pour les citations automatisées.

---

## 🏗️ Schéma de Métadonnées OKF v0.1

Ces attributs sont inscrits dans le frontmatter YAML du document markdown :

```yaml
---
id: precis-agroecologie-viticole
type: book
title: Précis d'Agroécologie Viticole
soa: bradtech/world-agronomy
revision: rev-1.0.0
# --- Références Bibliographiques de l'Édition ---
authors:
  - David R. Montgomery
  - Anne Biklé
translators:
  - Olivier Lépine
publisher: Éditions France Agricole
edition: 2e édition revue et augmentée
publicationYear: 2024
language: fr
isbn: 978-2-85557-890-1
doi: 10.1016/j.agee.2024.108542
copyright: "© 2024 Éditions France Agricole, Paris"
# --- Traçabilité de l'Œuvre Originale (si traduction/réédition) ---
originalTitle: "The Hidden Half of Nature: The Microbial Roots of Life and Health"
originalLanguage: en
originalPublisher: W. W. Norton & Company
originalYear: 2016
originalCopyright: "© 2016 David R. Montgomery and Anne Biklé"
citation: "Montgomery, D. R., & Biklé, A. (2024). Précis d'Agroécologie Viticole (Trad. O. Lépine, 2e éd.). Éditions France Agricole. (Ouvrage original publié en 2016 sous le titre The Hidden Half of Nature)."
# --- Taxonomies & Fichiers ---
category: itineraries
tags: [agroecologie, microbiote-du-sol, viticulture]
originalFileUri: assets/documents/precis-agroecologie-viticole.pdf
fileHash: a1b2c3d4e5f6...
---
```

---

## 📋 Modifications Appliquées

1. **Modèle de données ([`src/lib/models/ContentItem.ts`](file:///Users/crapougnax/CODE/CRAPOUGNAX/modaka-hub/src/lib/models/ContentItem.ts))** :
   - Ajout des définitions de propriétés strictement typées pour tous les champs bibliographiques et de propriété intellectuelle.
2. **Worker d'Ingestion ([`src/lib/queue.ts`](file:///Users/crapougnax/CODE/CRAPOUGNAX/modaka-hub/src/lib/queue.ts))** :
   - Enrichissement du prompt sémantique Gemini pour scanner la page de titre, le verso (colophon) et les mentions légales.
   - Injection des champs bibliographiques dans `ContentItem.factory(...)` lors de la persistance OKF.
