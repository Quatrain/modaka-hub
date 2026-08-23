import type { APIRoute } from 'astro';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { initBackend } from '../../lib/backend';
import { queueManager } from '../../lib/queue';

export const POST: APIRoute = async ({ request }) => {
  await initBackend();

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const category = (formData.get('category') as string) || 'soil-health';
    const thematicsJson = formData.get('thematics') as string;
    const thematics = thematicsJson ? JSON.parse(thematicsJson) : [category];
    const source = (formData.get('source') as string) || 'Curation Bookworm';

    const tempDir = path.resolve(process.cwd(), '.bookworm-temp');
    await fs.mkdir(tempDir, { recursive: true });

    const createdTasks = [];

    for (const file of files) {
      if (!file || typeof file.arrayBuffer !== 'function') continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      const tempFileName = `${Date.now()}-${file.name}`;
      const tempFilePath = path.join(tempDir, tempFileName);
      await fs.writeFile(tempFilePath, buffer);

      const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

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
