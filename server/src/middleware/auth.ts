import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';

export async function authMiddleware(c: Context, next: Next) {
  const sessionToken = getCookie(c, 'session');

  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // For this single-user app, we just check if a valid session exists
  // In a production app, you'd validate the token against the database
  const isValid = sessionToken && sessionToken.length > 0;

  if (!isValid) {
    return c.json({ error: 'Invalid session' }, 401);
  }

  await next();
}
