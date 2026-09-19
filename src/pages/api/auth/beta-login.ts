import type { APIRoute } from 'astro';
import * as crypto from 'node:crypto';
import { isBetaAccessCodeValid, config } from '../../../lib/config';

export function createBetaToken(code: string, name?: string): string {
  const secret = process.env.SESSION_SECRET || process.env.PUBLIC_SUPABASE_ANON_KEY || 'modaka-hub-beta-key-2026';
  const payload = {
    code: code.trim().toUpperCase(),
    name: name?.trim() || 'Bêta Testeur',
    exp: Date.now() + 30 * 24 * 3600 * 1000 // 30 days
  };
  const payloadStr = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
  const base64 = Buffer.from(payloadStr, 'utf-8').toString('base64url');
  return `${base64}.${sig}`;
}

export function verifyBetaToken(token: string): { code: string; name: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [base64, sig] = parts;
    const secret = process.env.SESSION_SECRET || process.env.PUBLIC_SUPABASE_ANON_KEY || 'modaka-hub-beta-key-2026';
    const payloadStr = Buffer.from(base64, 'base64url').toString('utf-8');
    const expectedSig = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

    if (sig !== expectedSig) return null;

    const payload = JSON.parse(payloadStr);
    if (payload.exp && Date.now() > payload.exp) return null;

    // Check if the code is still in active beta access codes
    if (!isBetaAccessCodeValid(payload.code)) return null;

    return { code: payload.code, name: payload.name };
  } catch {
    return null;
  }
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  let code = '';
  let name = '';

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}));
    code = body.code || '';
    name = body.name || '';
  } else {
    const formData = await request.formData().catch(() => new FormData());
    code = (formData.get('code') as string) || '';
    name = (formData.get('name') as string) || '';
  }

  code = code.trim().toUpperCase();

  if (!code) {
    if (contentType.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'Code requis' }), { status: 400 });
    }
    return redirect('/login?error=missing_beta_code', 302);
  }

  if (!isBetaAccessCodeValid(code)) {
    if (contentType.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'Code d\'accès bêta invalide' }), { status: 401 });
    }
    return redirect('/login?error=invalid_beta_code', 302);
  }

  const token = createBetaToken(code, name);
  const maxAge = 30 * 24 * 3600;

  cookies.set('modaka-beta-token', token, {
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge
  });

  // Alias cookie for downstream Hey Brad
  cookies.set('hey-brad-beta-token', token, {
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge
  });

  if (contentType.includes('application/json')) {
    return new Response(JSON.stringify({ success: true, redirect: '/' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return redirect('/', 302);
};
