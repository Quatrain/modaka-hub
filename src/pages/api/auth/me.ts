import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ authenticated: false, user: null }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const isAdmin =
    locals.user.roles.includes('admin-brad') || locals.user.roles.includes('admin');

  return new Response(
    JSON.stringify({
      authenticated: true,
      user: {
        ...locals.user,
        isAdmin
      }
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};
