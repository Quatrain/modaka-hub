# Ticket #3 : Ingestion Multi-Sources (Audio / Notes Vocales & Moissonnage Web)

- **ID :** TICKET-03
- **Statut :** 📋 Backlog / Spécifié
- **Priorité :** Moyenne
- **Composants :** `modaka-hub`, `@quatrain/ingestion-audio`, `@quatrain/ingestion-web`, `@quatrain/queue`
- **Auteurs :** Équipe Quatrain & Bradtech

---

## 🎯 Objectif Métier

Étendre les capacités d'ingestion de Modaka-Hub au-delà du seul PDF pour capter :
1. **Les notes vocales de terrain** des agronomes et conseillers (enregistrements MP3/M4A/WAV).
2. **Les publications et fiches techniques en ligne** (moissonnage d'articles INRAE, Acta, Chambres d'Agriculture par URL).

---

## 🏗️ Spécifications Techniques

### 1. Notes Vocales & Audio (`@quatrain/ingestion-audio`)
- Déposer un fichier audio dans la zone de drop.
- Transcription automatique via Whisper / Gemini Audio.
- Structuration en fiche OKF avec extraction multi-axiale (sols, climats, itinéraires).
- Conservation du fichier audio source dans `assets/audio/`.

### 2. Moissonnage Web (`@quatrain/ingestion-web`)
- Champ "Saisir une URL documentaire" dans le Dropzone.
- Extraction du contenu principal (nettoyage boilerplate, extraction figures et tables).
- Transformation en Markdown propre conforme aux spécifications OKF v0.1.

### 3. Critères d'Acceptation
- [ ] Support des formats `.mp3`, `.m4a`, `.wav`, `.ogg` dans le dropzone.
- [ ] Support des URLs HTTP/HTTPS avec validation et protection SSRF.
- [ ] Tâche asynchrone traitée par le queue worker sans blocage de l'interface.
