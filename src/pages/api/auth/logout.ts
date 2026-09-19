import type { APIRoute } from 'astro'

export const ALL: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('sb-access-token', { path: '/' })
  cookies.delete('sb-refresh-token', { path: '/' })
  cookies.delete('modaka-beta-token', { path: '/' })
  cookies.delete('hey-brad-beta-token', { path: '/' })
  return redirect('/login', 302)
}
