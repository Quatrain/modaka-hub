import type { AppCompositionInterface, PWAContentInterface } from '@quatrain/types';
import { config } from './lib/config';

/**
 * Official Modaka-Hub application composition definition.
 * Connects the Modaka-Hub curation UI with Modaka runtime adapters.
 */
export const modakaHubComposition: AppCompositionInterface<PWAContentInterface> = {
   content: {
      type: 'pwa',
      name: 'modaka-hub',
      version: '0.1.0',
      distPath: './dist',
      manifest: {
         name: config.appTitle,
         short_name: 'Modaka-Hub',
         theme_color: '#1a202c',
         background_color: '#1a202c'
      }
   },
   adapters: {
      ai: {
         default: { package: '@quatrain/ai-gemini', adapter: 'GeminiAdapter' },
         openai: { package: '@quatrain/ai-openai', adapter: 'OpenAiAdapter' },
         ocr: { package: '@quatrain/ingestion-ocr', adapter: 'OcrIngestionAdapter' },
         audio: { package: '@quatrain/ingestion-audio', adapter: 'AudioIngestionAdapter' }
      },
      backend: { package: '@quatrain/backend', adapter: 'OKFBackendAdapter' },
      storage: { package: '@quatrain/storage-local', adapter: 'LocalStorageAdapter' },
      searchengine: { package: '@quatrain/searchengine-qmd', adapter: 'QmdSearchEngineAdapter' },
      queue: { package: '@quatrain/queue-sqlite', adapter: 'SQLiteQueueAdapter' }
   },
   config: {
      okfRoot: config.gitLocalPath,
      defaultCategory: 'inbox'
   }
};
