import { Hono } from 'hono';
import { db, prompts } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

export const promptsRouter = new Hono();

// Get daily prompt (deterministic based on date)
promptsRouter.get('/daily', async (c) => {
  const allPrompts = await db
    .select()
    .from(prompts)
    .where(eq(prompts.isActive, true));

  if (allPrompts.length === 0) {
    return c.json({ error: 'No prompts available' }, 404);
  }

  // Use date as seed for consistent daily prompt
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const index = dayOfYear % allPrompts.length;

  return c.json(allPrompts[index]);
});

// Get random prompt, optionally by category
promptsRouter.get('/random', async (c) => {
  const { category, subcategory } = c.req.query();

  const conditions = [eq(prompts.isActive, true)];
  if (category) conditions.push(eq(prompts.category, category));
  if (subcategory) conditions.push(eq(prompts.subcategory, subcategory));

  const allPrompts = await db
    .select()
    .from(prompts)
    .where(and(...conditions));

  if (allPrompts.length === 0) {
    return c.json({ error: 'No prompts found' }, 404);
  }

  const randomIndex = Math.floor(Math.random() * allPrompts.length);
  return c.json(allPrompts[randomIndex]);
});

// Get prompts by category
promptsRouter.get('/category/:category', async (c) => {
  const { category } = c.req.param();

  const results = await db
    .select()
    .from(prompts)
    .where(and(
      eq(prompts.category, category),
      eq(prompts.isActive, true)
    ));

  return c.json(results);
});

// Get all prompts
promptsRouter.get('/', async (c) => {
  const results = await db
    .select()
    .from(prompts)
    .where(eq(prompts.isActive, true));

  return c.json(results);
});
