import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import pdfParse from 'pdf-parse';
import { Queue } from '@quatrain/queue';
import { Log } from '@quatrain/log';
import { Ingestion } from '@quatrain/ingestion';
import { ObjectUri } from '@quatrain/types';
import { ContentItem } from './models/ContentItem';
import { slugify, extractProperNouns } from './utils';
import { searchAndCreateConcept } from './concept-autolink';
import { gitSync } from './git-sync';

let backendPromise: Promise<void> | null = null;
function ensureBackend() {
   if (!backendPromise) {
      backendPromise = import('./backend').then(({ initBackend }) => {
         return initBackend();
      }).catch(e => {
         Log.error(`Failed to initialize backend dynamically: ${e.message}`);
      });
   }
}

export interface IngestTask {
   id: string;
   status: 'pending' | 'processing' | 'completed' | 'failed';
   type: 'pdf' | 'image' | 'text' | 'url';
   name: string;
   progress: number;
   error?: string;
   createdAt: string;
   startedAt?: string;
   completedAt?: string;
   tempFilePath?: string;
   textContent?: string;
   category?: string;
   thematics?: string[];
   contextNote?: string;
   fileHash?: string;
   source?: string;
}

class BookwormQueueManager {
   protected isListening = false;

   public async startListening() {
      if (this.isListening) return;
      this.isListening = true;
      Log.info('[Bookworm Queue] Starting background queue worker for "ingestion"');

      const adapter = Queue.getQueue<any>();
      adapter.listen('ingestion', async (task: any, options: { updateProgress: Function }) => {
         Log.info(`[Bookworm Queue] Processing ingestion task "${task.name || task.id}"`);
         try {
            await this.executeTask(task, async (progress: number) => {
               await options.updateProgress(progress);
            });
            Log.info(`[Bookworm Queue] Completed task "${task.name || task.id}"`);
         } catch (err: any) {
            Log.error(`[Bookworm Queue] Failed task "${task.name || task.id}": ${err.message}`);
            throw err;
         }
      });
   }

   public async getTasks(): Promise<IngestTask[]> {
      ensureBackend();
      const adapter = Queue.getQueue<any>();
      return await adapter.getTasks('ingestion');
   }

   public async addTask(task: Omit<IngestTask, 'id' | 'status' | 'progress' | 'createdAt'>): Promise<IngestTask> {
      ensureBackend();
      const adapter = Queue.getQueue<any>();
      const messageId = await adapter.send(task, 'ingestion');
      return {
         ...task,
         id: messageId,
         status: 'pending',
         progress: 0,
         createdAt: new Date().toISOString()
      } as IngestTask;
   }

   protected async executeTask(task: IngestTask, updateProgress: (progress: number) => Promise<void>): Promise<void> {
      ensureBackend();

      const gitLocalPath = process.env.GIT_LOCAL_PATH || '/Users/crapougnax/CODE/BRAD2026/world-agronomy';
      const assetsPath = path.join(gitLocalPath, 'assets', 'documents');
      await fs.mkdir(assetsPath, { recursive: true });

      await updateProgress(20);

      let buffer: Buffer | null = null;
      let rawText = '';

      if (task.tempFilePath) {
         buffer = await fs.readFile(task.tempFilePath);
      }

      const isPdf = task.type === 'pdf' || (task.name && task.name.toLowerCase().endsWith('.pdf'));

      if (isPdf && buffer) {
         try {
            Log.info(`[Bookworm Queue] Parsing PDF contents with pdf-parse (${buffer.length} bytes)...`);
            const parsedPdf = await pdfParse(buffer);
            rawText = parsedPdf.text || '';
         } catch (e: any) {
            Log.warn(`[Bookworm Queue] pdf-parse fallback error: ${e.message}`);
            rawText = '';
         }
      } else if (task.textContent) {
         rawText = task.textContent;
      }

      await updateProgress(45);

      // AI semantic analysis via Gemini adapter
      let aiResult: any = null;
      const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

      try {
         const ocrAdapter = Ingestion.getAdapter('ocr');
         if (ocrAdapter && (rawText || buffer)) {
            Log.info(`[Bookworm Queue] Running Gemini AI semantic extraction (model: ${model})...`);
            aiResult = await ocrAdapter.process(rawText || buffer!, {
               isText: Boolean(rawText),
               mimeType: isPdf ? 'application/pdf' : 'text/plain',
               contextNote: task.contextNote || 'Ingestion pour base de connaissances agronomique OKF',
               model
            });
         }
      } catch (err: any) {
         Log.warn(`[Bookworm Queue] AI structuring error: ${err.message}. Using fallback heuristics.`);
      }

      await updateProgress(70);

      const title = aiResult?.title || task.name.replace(/\.[^/.]+$/, '');
      const summary = aiResult?.summary || (rawText ? rawText.substring(0, 300).replace(/\s+/g, ' ') + '...' : 'Document curé.');
      const tags = Array.isArray(aiResult?.tags) && aiResult.tags.length > 0 ? aiResult.tags : ['agronomie', 'curation'];
      const properNouns = Array.isArray(aiResult?.properNouns) ? aiResult.properNouns : extractProperNouns(rawText);
      const deductedCategory = task.category || aiResult?.category || 'soil-health';

      const fileHash = buffer ? crypto.createHash('sha256').update(buffer).digest('hex') : undefined;
      const originalFileName = task.name || `${slugify(title)}.pdf`;
      const targetAssetPath = path.join(assetsPath, originalFileName);
      const relativeAssetUri = `assets/documents/${originalFileName}`;

      if (buffer) {
         await fs.writeFile(targetAssetPath, buffer);
         Log.info(`[Bookworm Queue] Saved binary asset to ${targetAssetPath}`);
      }

      const slug = slugify(title) || crypto.randomUUID();
      const contentItem = await ContentItem.factory({
         id: slug,
         title,
         type: aiResult?.type || 'document',
         category: deductedCategory,
         tags,
         thematics: task.thematics || [deductedCategory],
         properNouns,
         summary,
         description: summary,
         originalFileUri: relativeAssetUri,
         fileHash,
         source: task.source || 'Curation Bookworm',
         documentDate: aiResult?.deductedDate || new Date().toISOString().split('T')[0],
         body: rawText || aiResult?.markdown || summary,
         createdAt: new Date().toISOString()
      });

      contentItem.dataObject.uri = new ObjectUri(`content/${slug}`);
      await contentItem.save();
      Log.info(`[Bookworm Queue] Persisted OKF document "content/${deductedCategory}/${slug}.md"`);

      // Concept auto-linking for top proper nouns
      if (properNouns.length > 0) {
         for (const noun of properNouns.slice(0, 3)) {
            searchAndCreateConcept(noun).catch(() => {});
         }
      }

      // Stage and commit to local Git repo
      await gitSync.stageAndCommit(
         `feat(curation): ingest document "${title}" into ${deductedCategory}`,
         [
            path.join('content', deductedCategory, `${slug}.md`),
            relativeAssetUri
         ]
      );

      await updateProgress(100);
   }
}

export const queueManager = new BookwormQueueManager();
