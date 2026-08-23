import type { APIRoute } from 'astro';
import { gitSync } from '../../../lib/git-sync';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const message = body.message || 'feat(curation): sync curated knowledge base';
    const doPush = Boolean(body.push);

    const committed = await gitSync.stageAndCommit(message);
    let pushed = false;
    if (doPush) {
      pushed = await gitSync.push();
    }

    const status = await gitSync.getStatus();
    return new Response(JSON.stringify({ success: committed, pushed, status }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
