import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db, users } from '../db/index.js';
import { eq } from 'drizzle-orm';

export const authRouter = new Hono();

const loginSchema = z.object({
  passphrase: z.string().min(8),
});

// Login with passphrase
authRouter.post('/login', async (c) => {
  const body = await c.req.json();
  const result = loginSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: 'Invalid passphrase format' }, 400);
  }

  const { passphrase } = result.data;

  // Get the single user (or create if first time)
  const existingUsers = await db.select().from(users).limit(1);

  if (existingUsers.length === 0) {
    // First time setup - create user with this passphrase
    const hashedPassphrase = await bcrypt.hash(passphrase, 12);
    await db.insert(users).values({
      id: 'user-1',
      passphrase: hashedPassphrase,
    });
  } else {
    // Verify passphrase
    const user = existingUsers[0];
    const isValid = await bcrypt.compare(passphrase, user.passphrase);

    if (!isValid) {
      return c.json({ error: 'Invalid passphrase' }, 401);
    }
  }

  // Create session token (simple implementation)
  const sessionToken = crypto.randomUUID();

  setCookie(c, 'session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  return c.json({ success: true });
});

// Logout
authRouter.post('/logout', async (c) => {
  deleteCookie(c, 'session');
  return c.json({ success: true });
});

// Check auth status
authRouter.get('/status', async (c) => {
  const existingUsers = await db.select().from(users).limit(1);
  return c.json({
    isSetup: existingUsers.length > 0,
  });
});
