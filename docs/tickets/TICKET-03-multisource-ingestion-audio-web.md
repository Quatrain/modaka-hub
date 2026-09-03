# Ticket #3: Multi-Source Ingestion: Audio Voice Memos & Web Harvesting

- **ID:** TICKET-03
- **Status:** 📋 Backlog / Specified
- **Priority:** Medium
- **Components:** Ingestion Pipeline, Audio Processing (`@quatrain/ingestion-audio`), Web Harvester (`@quatrain/ingestion-web`)
- **Authors:** Quatrain & Bradtech Engineering Teams

---

## 🎯 Objective & Business Value

Expand Modaka-Hub's ingestion capabilities beyond standard PDF and text documents to capture tacit and dispersed knowledge directly from the field:
1. **Audio Voice Memos**: Field agronomists and winegrowers record quick observations on mobile devices during field tours.
2. **Web Content Harvesting**: Automated ingestion of technical bulletin articles (e.g. BSV - Bulletins de Santé du Végétal, INRAE articles, technical blogs).

---

## 🏗️ Technical Architecture & Specifications

### 1. Audio Processing Pipeline (`@quatrain/ingestion-audio`)
- Supported input formats: `.m4a`, `.mp3`, `.wav`, `.ogg`.
- Integration with multimodal Gemini API or Whisper transcription engine.
- Speech-to-text transcription paired with multi-axial classification prompt to extract agronomic observations, affected crops, and treatment itineraries.
- Raw audio file persisted in `assets/audio/` with SHA-256 integrity hash.

### 2. Web Ingestion Adapter (`@quatrain/ingestion-web`)
- Input: URL pointing to an agronomic technical article or press release.
- Headless DOM parsing via Readability / Cheerio to strip boilerplate and ads.
- Automatic canonical URL preservation and author extraction.
- Automatic conversion into standard OKF markdown.

---

## 📋 Acceptance Criteria

- [ ] Audio upload supported on `/api/upload` with automatic speech-to-text and multi-axial tagging.
- [ ] Direct URL ingestion with clean markdown extraction and source attribution.
- [ ] End-to-end integration tests for audio and web ingestion tasks in SQLite queue.
