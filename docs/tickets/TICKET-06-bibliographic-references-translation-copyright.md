# Ticket #6: Bibliographic References, Translators & Dual Copyright Lineage Tracking

- **ID:** TICKET-06
- **Status:** 🚀 Implemented & Specified
- **Priority:** High
- **Components:** `modaka-hub`, `ContentItem`, Ingestion Queue, OKF Frontmatter Schema, Gemini Prompt
- **Authors:** Quatrain Engineering Team

---

## 🎯 Context & Objective

In a professional scientific and documentation curation workbench like Modaka-Hub, ingesting books, theses, technical reports, and research papers requires strict bibliographic attribution and intellectual property provenance tracking.

When an international work is translated or republished under license, it is essential to preserve:
1. **Intellectual Contributors**: Original authors and Translators.
2. **Current Published Edition**: Publisher, edition number/version, publication date/year, ISBN/DOI, and edition copyright statement.
3. **Original Work Lineage**: Original title, original language, original publisher, original year of first edition, and original copyright statement.
4. **Standard Citation**: Formatted bibliographic citation string (APA / ISO 690 format) for automated reference lists.

---

## 🏗️ OKF v0.1 Metadata Schema

These attributes are persisted directly into the YAML frontmatter of the markdown document:

```yaml
---
id: precis-agroecologie-viticole
type: book
title: Précis d'Agroécologie Viticole
soa: quatrain/authority
revision: rev-1.0.0
# --- Current Edition References ---
authors:
  - David R. Montgomery
  - Anne Biklé
translators:
  - Olivier Lépine
publisher: Éditions France Agricole
edition: 2nd Edition revised and expanded
publicationYear: 2024
language: fr
isbn: 978-2-85557-890-1
doi: 10.1016/j.agee.2024.108542
copyright: "© 2024 Éditions France Agricole, Paris"
# --- Original Work Lineage (Translation / Licensed Reprint) ---
originalTitle: "The Hidden Half of Nature: The Microbial Roots of Life and Health"
originalLanguage: en
originalPublisher: W. W. Norton & Company
originalYear: 2016
originalCopyright: "© 2016 David R. Montgomery and Anne Biklé"
citation: "Montgomery, D. R., & Biklé, A. (2024). Précis d'Agroécologie Viticole (Trans. O. Lépine, 2nd ed.). Éditions France Agricole. (Original work published 2016 under the title The Hidden Half of Nature)."
# --- Taxonomies & Asset Integrity ---
category: itineraries
tags: [agroecology, soil-microbiome, viticulture]
originalFileUri: assets/documents/precis-agroecologie-viticole.pdf
fileHash: a1b2c3d4e5f6...
---
```

---

## 📋 Implemented Scope

1. **Data Model ([`src/lib/models/ContentItem.ts`](file:///Users/crapougnax/CODE/CRAPOUGNAX/modaka-hub/src/lib/models/ContentItem.ts))**:
   - Strongly-typed property definitions declared for all 15 bibliographic, translation, and copyright fields.
2. **Ingestion Worker ([`src/lib/queue.ts`](file:///Users/crapougnax/CODE/CRAPOUGNAX/modaka-hub/src/lib/queue.ts))**:
   - Multimodal prompt enriched to analyze the title page, colophon, and legal imprint to extract bibliographic metadata automatically.
   - Field values injected into `ContentItem.factory(...)` on persistence.
3. **Curation API ([`src/pages/api/curate.ts`](file:///Users/crapougnax/CODE/CRAPOUGNAX/modaka-hub/src/pages/api/curate.ts))**:
   - Full persistence support when curators adjust metadata manually in the workbench.
