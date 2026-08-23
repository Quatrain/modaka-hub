import type { APIRoute } from 'astro';
import { gitSync } from '../../../lib/git-sync';

export const GET: APIRoute = async () => {
  try {
    const status = await gitSync.getStatus();
    return new Response(JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
