import type { APIRoute } from 'astro';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { initBackend } from '../../lib/backend';
import { queueManager } from '../../lib/queue';


// In-memory cache to prevent duplicate rapid uploads
const recentUploads = new Map<string, number>();

function isDuplicateUpload(hash: string): boolean {
  const now = Date.now();
  const lastTime = recentUploads.get(hash);
  if (lastTime && (now - lastTime) < 4000) {
    return true;
  }
  recentUploads.set(hash, now);
  // Clean up old entries
  if (recentUploads.size > 200) {
    for (const [k, v] of recentUploads.entries()) {
      if (now - v > 10000) recentUploads.delete(k);
    }
  }
  return false;
}

export const POST: APIRoute = async ({ request }) => {
  await initBackend();

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const category = (formData.get('category') as string) || 'soil-health';
    const thematicsJson = formData.get('thematics') as string;
    const thematics = thematicsJson ? JSON.parse(thematicsJson) : [category];
    const source = (formData.get('source') as string) || 'Curation Modaka-Hub';

    const tempDir = path.resolve(process.cwd(), '.modaka-hub-temp');
    await fs.mkdir(tempDir, { recursive: true });

    const createdTasks = [];

    for (const file of files) {
      if (!file || typeof file.arrayBuffer !== 'function') continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      const tempFileName = `${Date.now()}-${file.name}`;
      const tempFilePath = path.join(tempDir, tempFileName);
      await fs.writeFile(tempFilePath, buffer);

      const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
      if (isDuplicateUpload(fileHash)) {
        console.log(`[Upload API] Ignored rapid duplicate upload for ${file.name} (hash: ${fileHash.substring(0, 8)})`);
        continue;
      }

      const task = await queueManager.addTask({
        name: file.name,
        type: 'pdf',
        tempFilePath,
        category,
        thematics,
        source,
        fileHash
      });

      createdTasks.push(task);
    }

    return new Response(JSON.stringify({ success: true, tasks: createdTasks }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
