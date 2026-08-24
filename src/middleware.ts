import { defineMiddleware } from 'astro:middleware'

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/callback',
  '/api/auth/logout',
  '/api/auth/password-login',
  '/favicon.ico',
  '/favicon.svg'
]

const ALLOWED_DOMAIN = '@brad.ag'

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url

  // 1. Allow public paths and Astro static assets
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith('/_astro/') ||
    pathname.startsWith('/@') ||
    pathname.startsWith('/assets/')
  ) {
    return next()
  }

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    console.error('[Middleware] Missing SUPABASE_URL or ANON_KEY.')
    return context.redirect('/login?error=server_misconfigured', 302)
  }

  // 2. Extract tokens from cookies or header
  let accessToken = context.cookies.get('sb-access-token')?.value
  const refreshToken = context.cookies.get('sb-refresh-token')?.value

  if (!accessToken) {
    const authHeader = context.request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7).trim()
    }
  }

  let user: any = null

  // 3. If access_token exists, test validity
  if (accessToken) {
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': anonKey
        }
      })
      if (res.ok) {
        user = await res.json()
      }
    } catch {
      user = null
    }
  }

  // 4. 🔄 Silent Refresh: If access token is missing or expired, attempt refresh using refresh_token
  if (!user && refreshToken) {
    try {
      const refreshRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      })

      if (refreshRes.ok) {
        const tokenData = await refreshRes.json()
        accessToken = tokenData.access_token
        const newRefreshToken = tokenData.refresh_token || refreshToken

        // Update session cookies
        const maxAge = tokenData.expires_in || 3600 * 24 * 7
        context.cookies.set('sb-access-token', accessToken!, {
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge
        })
        context.cookies.set('sb-refresh-token', newRefreshToken, {
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 3600 * 24 * 30
        })

        // Fetch user with refreshed token
        const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': anonKey
          }
        })
        if (userRes.ok) {
          user = await userRes.json()
        }
      }
    } catch (refreshErr) {
      console.error('[Middleware] Silent token refresh failed:', refreshErr)
    }
  }

  // 5. If still no valid user, reject or redirect
  if (!user) {
    context.cookies.delete('sb-access-token', { path: '/' })
    context.cookies.delete('sb-refresh-token', { path: '/' })

    if (pathname.startsWith('/api/')) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Session expirée, authentification requise (@brad.ag)'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    return context.redirect('/login?error=auth_required', 302)
  }

  const email = (user.email || '').toLowerCase().trim()

  // 6. Strict @brad.ag email check
  if (!email.endsWith(ALLOWED_DOMAIN)) {
    context.cookies.delete('sb-access-token', { path: '/' })
    context.cookies.delete('sb-refresh-token', { path: '/' })

    if (pathname.startsWith('/api/')) {
      return new Response(
        JSON.stringify({ error: 'Forbidden', message: 'Accès réservé au domaine @brad.ag' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }
    return context.redirect(`/login?error=domain_restricted&email=${encodeURIComponent(email)}`, 302)
  }

  // 7. 🛡️ Custom Claims & Roles Extraction
  // Checks app_metadata (admin/hook assigned), custom_claims, and user_metadata
  const extractedRoles: string[] = []

  // app_metadata roles (e.g. ['admin-brad'], 'user-brad')
  if (Array.isArray(user.app_metadata?.roles)) {
    extractedRoles.push(...user.app_metadata.roles)
  } else if (typeof user.app_metadata?.role === 'string') {
    extractedRoles.push(user.app_metadata.role)
  }

  // custom_claims in user_metadata or app_metadata
  const customClaims = user.app_metadata?.custom_claims || user.user_metadata?.custom_claims
  if (customClaims) {
    if (Array.isArray(customClaims.roles)) extractedRoles.push(...customClaims.roles)
    if (typeof customClaims.role === 'string') extractedRoles.push(customClaims.role)
  }

  // user_metadata direct role
  if (typeof user.user_metadata?.role === 'string') {
    extractedRoles.push(user.user_metadata.role)
  }

  // Fallback defaults if no specific role is defined
  const finalRoles = extractedRoles.length > 0 
    ? Array.from(new Set(extractedRoles)) 
    : ['user-brad', 'curator']

  // 8. Inject authenticated user into context.locals
  context.locals.user = {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0],
    roles: finalRoles,
    customClaims: customClaims || {},
    subjectType: 'human'
  }

  return next()
})
