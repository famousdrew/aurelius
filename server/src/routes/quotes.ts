import { Hono } from 'hono';
import { db, quotes } from '../db/index.js';
import { eq } from 'drizzle-orm';

export const quotesRouter = new Hono();

// Get daily quote (deterministic based on date)
quotesRouter.get('/daily', async (c) => {
  const allQuotes = await db.select().from(quotes);

  if (allQuotes.length === 0) {
    return c.json({ error: 'No quotes available' }, 404);
  }

  // Use date as seed for consistent daily quote
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const index = dayOfYear % allQuotes.length;

  return c.json(allQuotes[index]);
});

// Get random quote
quotesRouter.get('/random', async (c) => {
  const { author, category } = c.req.query();

  let allQuotes = await db.select().from(quotes);

  if (author) {
    allQuotes = allQuotes.filter(q => q.author.toLowerCase().includes(author.toLowerCase()));
  }
  if (category) {
    allQuotes = allQuotes.filter(q => q.category === category);
  }

  if (allQuotes.length === 0) {
    return c.json({ error: 'No quotes found' }, 404);
  }

  const randomIndex = Math.floor(Math.random() * allQuotes.length);
  return c.json(allQuotes[randomIndex]);
});

// Get favorite quotes
quotesRouter.get('/favorites', async (c) => {
  const results = await db
    .select()
    .from(quotes)
    .where(eq(quotes.isFavorite, true));

  return c.json(results);
});

// Toggle favorite
quotesRouter.post('/:id/favorite', async (c) => {
  const { id } = c.req.param();

  const existing = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, id))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: 'Quote not found' }, 404);
  }

  await db
    .update(quotes)
    .set({ isFavorite: !existing[0].isFavorite })
    .where(eq(quotes.id, id));

  return c.json({ success: true, isFavorite: !existing[0].isFavorite });
});

// Get all quotes
quotesRouter.get('/', async (c) => {
  const { author, category, limit = '100', offset = '0' } = c.req.query();

  let results = await db.select().from(quotes);

  if (author) {
    results = results.filter(q => q.author.toLowerCase().includes(author.toLowerCase()));
  }
  if (category) {
    results = results.filter(q => q.category === category);
  }

  const startIdx = parseInt(offset);
  const endIdx = startIdx + parseInt(limit);

  return c.json(results.slice(startIdx, endIdx));
});

// Get quotes by author
quotesRouter.get('/author/:author', async (c) => {
  const { author } = c.req.param();

  const results = await db.select().from(quotes);
  const filtered = results.filter(q =>
    q.author.toLowerCase().includes(author.toLowerCase())
  );

  return c.json(filtered);
});
