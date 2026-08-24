# Anemorph 🌀📚

> Open-Source Multi-Source Knowledge Curation & OKF Structuring Platform powered by Quatrain.

## Overview

Anemorph is a content curation workbench designed to ingest heterogeneous documents (PDF scientific papers, field reports, web articles, raw notes) and organize them into standardized, version-controlled **Open Knowledge Format (OKF v0.1)** repositories.

## Core Features

- 🌲 **Transversal Taxonomy**: Headless tree controller (`@quatrain/ux-taxonomy`) with cross-thematic tagging.
- 📥 **Background Ingestion Worker**: SQLite asynchronous queue (`@quatrain/queue-sqlite`) with live progress tracking (`@quatrain/ux-dropzone`).
- 🤖 **Semantic Extraction & Auto-Linking**: PDF text parsing (`pdf-parse`) + Gemini AI extraction + automated Wikipedia concept card creation.
- 📝 **Dual-Mode Metadata Editor**: Visual form & raw YAML editor (`@quatrain/ux-curation`).
- 🔄 **Git-Native Persistence**: Local-first storage with automatic atomic git staging and commits.

## Quick Start

```bash
# Clone repository
git clone git@github.com:crapougnax/modaka-hub.git
cd modaka-hub

# Install dependencies
yarn install

# Start development server
yarn dev
```

Open [http://127.0.0.1:4322](http://127.0.0.1:4322) to launch the Curation Workbench.

## Documentation

- [PoC Workbook & Reproduction Guide](POC_WORKBOOK.md)
- [How-To & Usage Scenarios](HOWTO.md)

## License

AGPL-v3 © Quatrain Technologies
