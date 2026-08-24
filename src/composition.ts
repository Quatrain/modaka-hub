import type { AppCompositionInterface, PWAContentInterface } from '@quatrain/types';

/**
 * Official Anemorph application composition definition.
 * Connects the Anemorph curation UI with Modaka runtime adapters.
 */
export const anemorphComposition: AppCompositionInterface<PWAContentInterface> = {
   content: {
      type: 'pwa',
      name: 'anemorph',
      version: '0.1.0',
      distPath: './dist',
      manifest: {
         name: 'Anemorph OKF Curation Workbench',
         short_name: 'Anemorph',
         theme_color: '#1a202c',
         background_color: '#1a202c'
      }
   },
   adapters: {
      ai: {
         default: { package: '@quatrain/ai-gemini', adapter: 'GeminiAdapter' },
         ocr: { package: '@quatrain/ingestion-ocr', adapter: 'OcrIngestionAdapter' },
         audio: { package: '@quatrain/ingestion-audio', adapter: 'AudioIngestionAdapter' }
      },
      backend: { package: '@quatrain/backend', adapter: 'OKFBackendAdapter' },
      storage: { package: '@quatrain/storage-local', adapter: 'LocalStorageAdapter' },
      searchengine: { package: '@quatrain/searchengine-qmd', adapter: 'QmdSearchEngineAdapter' },
      queue: { package: '@quatrain/queue-sqlite', adapter: 'SQLiteQueueAdapter' }
   },
   config: {
      okfRoot: process.env.GIT_LOCAL_PATH || '/Users/crapougnax/CODE/BRAD2026/world-agronomy',
      defaultCategory: 'inbox'
   }
};
