import type { APIRoute } from 'astro';
import { initBackend } from '../../../lib/backend';
import { queueManager } from '../../../lib/queue';

export const GET: APIRoute = async () => {
  await initBackend();
  try {
    const tasks = await queueManager.getTasks();
    return new Response(JSON.stringify({ tasks }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
