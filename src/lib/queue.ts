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
import { initBackend } from './backend';
import { config } from './config';

let backendReady = false;
function ensureBackend() {
   if (!backendReady) {
      initBackend().catch(e => {
         Log.error(`Failed to initialize backend dynamically: ${e.message}`);
      });
      backendReady = true;
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
   url?: string;
   category?: string;
   thematics?: string[];
   soils?: string[];
   climates?: string[];
   latitudes?: string[];
   altitudes?: string[];
   itineraries?: string[];
   crops?: string[];
   soa?: string;
   contextNote?: string;
   fileHash?: string;
   source?: string;
   authors?: string[];
   translators?: string[];
   publisher?: string;
   edition?: string;
   publicationYear?: string;
   language?: string;
   isbn?: string;
   doi?: string;
   copyright?: string;
   originalTitle?: string;
   originalLanguage?: string;
   originalPublisher?: string;
   originalYear?: string;
   originalCopyright?: string;
   citation?: string;
}

class ModakaHubQueueManager {
   protected isListening = false;

   public async startListening() {
      if (this.isListening) return;
      ensureBackend();

      const adapter = Queue.getAdapter();
      if (!adapter) {
         Log.warn('[Modaka-Hub Queue] Queue adapter not yet registered. Retrying later.');
         return;
      }

      this.isListening = true;
      Log.info('[Modaka-Hub Queue] Starting to listen for incoming ingestion jobs...');

      adapter.listen('ingestion', async (task: IngestTask, options: any) => {
         Log.info(`[Modaka-Hub Queue] Processing ingestion task "${task.name || task.id}"...`);
         try {
            await this.executeTask(task, async (progress: number) => {
               await options.updateProgress(progress);
            });
            Log.info(`[Modaka-Hub Queue] Successfully finished task "${task.name || task.id}"`);
         } catch (err: any) {
            Log.error(`[Modaka-Hub Queue] Failed task "${task.name || task.id}": ${err.message}`);
            throw err;
         }
      });
   }

   public async getTasks(): Promise<IngestTask[]> {
      ensureBackend();
      const adapter = Queue.getAdapter();
      if (!adapter) return [];
      return await adapter.getTasks('ingestion');
   }

   public async enqueue(task: IngestTask): Promise<string> {
      ensureBackend();
      const adapter = Queue.getAdapter();
      if (!adapter) throw new Error('Queue not ready');
      const messageId = await adapter.send(task, 'ingestion');
      return messageId;
   }

   public async cancelTask(taskId: string): Promise<boolean> {
      ensureBackend();
      const adapter = Queue.getAdapter();
      if (!adapter || typeof adapter.cancelTask !== 'function') return false;
      return await adapter.cancelTask('ingestion', taskId);
   }

   protected async executeTask(task: IngestTask, updateProgress: (progress: number) => Promise<void>): Promise<void> {
      ensureBackend();

      const gitLocalPath = config.gitLocalPath;
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
            Log.info(`[Modaka-Hub Queue] Parsing PDF contents with pdf-parse (${buffer.length} bytes)...`);
            const parsedPdf = await pdfParse(buffer);
            rawText = parsedPdf.text || '';
         } catch (e: any) {
            Log.warn(`[Modaka-Hub Queue] pdf-parse fallback error: ${e.message}`);
            rawText = '';
         }
      } else if (task.textContent) {
         rawText = task.textContent;
      }

      await updateProgress(45);

      // AI semantic analysis via configured adapter
      let aiResult: any = null;
      const model = config.aiModel || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

      try {
         const ocrAdapter = Ingestion.getAdapter('ocr');
         if (ocrAdapter && (rawText || buffer)) {
            Log.info(`[Modaka-Hub Queue] Running AI multi-axial extraction (provider: ${config.aiProvider}, model: ${model})...`);
            aiResult = await ocrAdapter.process(rawText || buffer!, {
               isText: Boolean(rawText),
               mimeType: isPdf ? 'application/pdf' : 'text/plain',
               contextNote: task.contextNote || 'Ingestion de document pour base de connaissances OKF. Extrais les axes thématiques pertinents, métadonnées, taxonomies et références bibliographiques complètes.',
               model
            });
         }
      } catch (err: any) {
         Log.warn(`[Modaka-Hub Queue] AI structuring error: ${err.message}. Using fallback heuristics.`);
      }

      await updateProgress(70);

      const title = aiResult?.title || task.name.replace(/\.[^/.]+$/, '');
      const summary = aiResult?.summary || (rawText ? rawText.substring(0, 300).replace(/\s+/g, ' ') + '...' : 'Document OKF curé.');
      const tags = Array.isArray(aiResult?.tags) && aiResult.tags.length > 0 ? aiResult.tags : ['connaissances', 'curation'];
      const properNouns = Array.isArray(aiResult?.properNouns) ? aiResult.properNouns : extractProperNouns(rawText);
      const deductedCategory = task.category || aiResult?.category || 'general';

      // Deduce facets if not provided
      const soils = task.soils || aiResult?.soils || [];
      const climates = task.climates || aiResult?.climates || [];
      const latitudes = task.latitudes || aiResult?.latitudes || [];
      const altitudes = task.altitudes || aiResult?.altitudes || [];
      const itineraries = task.itineraries || aiResult?.itineraries || [];
      const crops = task.crops || aiResult?.crops || [];

      const gitStatus = await gitSync.getStatus();
      const currentRev = gitStatus.lastCommit ? `rev-${gitStatus.lastCommit.split(' ')[0]}` : 'rev-1.0.0';
      const soa = task.soa || config.soa;

      const fileHash = buffer ? crypto.createHash('sha256').update(buffer).digest('hex') : undefined;
      const originalFileName = task.name || `${slugify(title)}.pdf`;
      const targetAssetPath = path.join(assetsPath, originalFileName);
      const relativeAssetUri = `assets/documents/${originalFileName}`;

      if (buffer) {
         await fs.writeFile(targetAssetPath, buffer);
         Log.info(`[Modaka-Hub Queue] Saved binary asset to ${targetAssetPath}`);
      }

      const slug = slugify(title) || crypto.randomUUID();
      const contentItem = await ContentItem.factory({
         id: slug,
         title,
         soa,
         revision: currentRev,
         type: aiResult?.type || 'document',
         category: deductedCategory,
         tags,
         thematics: task.thematics || [deductedCategory],
         soils,
         climates,
         latitudes,
         altitudes,
         itineraries,
         crops,
         properNouns,
         summary,
         description: summary,
         originalFileUri: relativeAssetUri,
         fileHash,
         source: task.source || config.appTitle || 'Modaka-Hub',
         documentDate: aiResult?.deductedDate || new Date().toISOString().split('T')[0],
         // Bibliographic & Intellectual Property References
         authors: task.authors || aiResult?.authors || [],
         translators: task.translators || aiResult?.translators || [],
         publisher: task.publisher || aiResult?.publisher || undefined,
         edition: task.edition || aiResult?.edition || undefined,
         publicationYear: task.publicationYear || aiResult?.publicationYear || (aiResult?.deductedDate ? aiResult.deductedDate.split('-')[0] : undefined),
         language: task.language || aiResult?.language || 'fr',
         isbn: task.isbn || aiResult?.isbn || undefined,
         doi: task.doi || aiResult?.doi || undefined,
         copyright: task.copyright || aiResult?.copyright || undefined,
         originalTitle: task.originalTitle || aiResult?.originalTitle || undefined,
         originalLanguage: task.originalLanguage || aiResult?.originalLanguage || undefined,
         originalPublisher: task.originalPublisher || aiResult?.originalPublisher || undefined,
         originalYear: task.originalYear || aiResult?.originalYear || undefined,
         originalCopyright: task.originalCopyright || aiResult?.originalCopyright || undefined,
         citation: task.citation || aiResult?.citation || undefined,
         body: rawText || aiResult?.markdown || summary,
         createdAt: new Date().toISOString()
      });

      const categoryDir = path.join(gitLocalPath, 'content', deductedCategory);
      await fs.mkdir(categoryDir, { recursive: true });

      contentItem.dataObject.uri = new ObjectUri(`content/${slug}`);
      await contentItem.save();
      Log.info(`[Modaka-Hub Queue] Persisted OKF document "content/${deductedCategory}/${slug}.md" with SOA ${soa} and revision ${currentRev}`);

      // Concept auto-linking for top proper nouns
      if (properNouns.length > 0) {
         for (const noun of properNouns.slice(0, 3)) {
            searchAndCreateConcept(noun).catch(() => {});
         }
      }

      // Stage and commit to local Git repo
      await gitSync.stageAndCommit(
         `feat(curation): ingest document "${title}" into ${deductedCategory} [SOA: ${soa}]`,
         [
            path.join('content', deductedCategory, `${slug}.md`),
            relativeAssetUri
         ]
      );

      await updateProgress(100);
   }
}

export const queueManager = new ModakaHubQueueManager();
