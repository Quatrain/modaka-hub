import * as path from 'node:path';
import * as fs from 'node:fs';
import dotenv from 'dotenv';
import { Log, DefaultLoggerAdapter, LogLevel } from '@quatrain/log';
import { Backend } from '@quatrain/backend';
import { OKFBackendAdapter } from '@quatrain/okf';
import { Storage } from '@quatrain/storage';
import { LocalStorageAdapter } from '@quatrain/storage-local';
import { Ai } from '@quatrain/ai';
import { GeminiAdapter } from '@quatrain/ai-gemini';
import { Ingestion } from '@quatrain/ingestion';
import { OcrIngestionAdapter } from '@quatrain/ingestion-ocr';
import { WebIngestionAdapter } from '@quatrain/ingestion-web';
import { Queue } from '@quatrain/queue';
import { SQLiteQueueAdapter } from '@quatrain/queue-sqlite';
import { queueManager } from './queue';
import { config } from './config';
import { OpenAiAdapter } from '@quatrain/ai-openai';

dotenv.config();

let initialized = false;

export async function initBackend() {
   if (initialized) return;
   initialized = true;

   Log.addLogger('default', new DefaultLoggerAdapter('', LogLevel.INFO), true);
   Log.info(`[${config.appTitle}] Initializing backend adapters and OKF storage...`);

   const gitLocalPath = config.gitLocalPath;
   const documentStoragePath = config.documentStoragePath;

   // 1. Initialize Document Storage
   let docAdapter: any;
   if (config.s3AccessKey && config.s3SecretKey) {
      const { S3StorageAdapter } = await import('@quatrain/storage-s3');
      docAdapter = new S3StorageAdapter({
         config: {
            region: config.s3Region || 'us-east-1',
            endpoint: config.s3Endpoint,
            accesskey: config.s3AccessKey,
            secret: config.s3SecretKey,
            bucket: config.s3Bucket
         }
      } as any);
      Log.info(`Document storage configured with S3StorageAdapter on bucket '${config.s3Bucket}'`);
   } else {
      docAdapter = new LocalStorageAdapter({
         config: { bucket: 'documents' },
         basePath: documentStoragePath
      } as any);
      Log.info(`Document storage configured with LocalStorageAdapter at: ${documentStoragePath}`);
   }
   Storage.addStorage(docAdapter, 'document-storage', false);

   // 2. Configure OKF Backend Adapter pointing to the root of the git repo
   const okfAdapter = new OKFBackendAdapter({
      config: {
         database: gitLocalPath
      }
   });
   Backend.addBackend(okfAdapter, 'default', true);

   // 3. Configure Multi-LLM AI Adapter (Gemini, DeepSeek, Qwen, OpenAI)
   if (config.aiProvider === 'gemini' && config.aiApiKey) {
      Ai.setAdapter(new GeminiAdapter(config.aiApiKey));
      Log.info(`AI Gemini adapter registered (model: ${config.aiModel || 'gemini-2.5-flash'})`);
   } else if (config.aiApiKey) {
      Ai.setAdapter(
         new OpenAiAdapter({
            apiKey: config.aiApiKey,
            baseUrl: config.aiBaseUrl,
            defaultModel: config.aiModel
         })
      );
      Log.info(`AI OpenAI adapter registered (provider: ${config.aiProvider}, model: ${config.aiModel}, endpoint: ${config.aiBaseUrl})`);
   } else {
      Log.warn(`[${config.appTitle}] No AI API key provided. AI structuring will run in fallback heuristic mode.`);
   }

   // 4. Configure Ingestion OCR / Web
   Ingestion.addAdapter(new OcrIngestionAdapter(), 'ocr');
   Ingestion.addAdapter(new WebIngestionAdapter(), 'web');

   // 5. Configure SQLite background queue
   const queueDbDir = path.resolve(process.cwd(), '.modaka-hub-queue');
   try {
      fs.mkdirSync(queueDbDir, { recursive: true });
   } catch {}
   Queue.addQueue(new SQLiteQueueAdapter({
      config: { database: path.join(queueDbDir, 'queue.sqlite') }
   }), 'default', true);

   // 6. Start listening to queue
   await queueManager.startListening();
   Log.info(`[${config.appTitle}] Backend ready. Targeting OKF repo at: ${gitLocalPath}`);
}

// Auto initialize
initBackend().catch(err => {
   Log.error(`[${config.appTitle}] Initialization error: ${err.message}`);
});
