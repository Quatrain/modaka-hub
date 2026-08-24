import type { APIRoute } from 'astro'
import crypto from 'node:crypto'

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const clientId = import.meta.env.OAUTH_CLIENT_ID || process.env.OAUTH_CLIENT_ID
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

  if (!clientId || !supabaseUrl) {
    console.error('[OAuth Login] Missing OAUTH_CLIENT_ID or SUPABASE_URL in environment.')
    return redirect('/login?error=server_misconfigured', 302)
  }

  // 1. Generate PKCE code_verifier and code_challenge (RFC 7636)
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')

  // 2. Store code_verifier in a temporary cookie for callback verification
  cookies.set('sb-code-verifier', codeVerifier, {
    path: '/',
    httpOnly: true,
    secure: false, // local dev compatible
    sameSite: 'lax',
    maxAge: 600 // 10 minutes
  })

  const redirectUri = `${url.origin}/api/auth/callback`
  const authorizeEndpoint = `${supabaseUrl}/auth/v1/oauth/authorize`
  const targetUrl = `${authorizeEndpoint}?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256`

  return redirect(targetUrl, 302)
}
