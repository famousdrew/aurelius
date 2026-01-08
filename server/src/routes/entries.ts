import { Hono } from 'hono';
import { z } from 'zod';
import { db, entries, entryFactors } from '../db/index.js';
import { eq, desc, and, gte, lte, like } from 'drizzle-orm';

export const entriesRouter = new Hono();

const createEntrySchema = z.object({
  type: z.enum(['morning', 'evening', 'freeform', 'thought_record']),
  content: z.record(z.any()),
  moodScore: z.number().min(1).max(10).optional(),
  energyScore: z.number().min(1).max(10).optional(),
  tags: z.array(z.string()).optional(),
  factors: z.array(z.object({
    factorId: z.string(),
    impact: z.number().min(-2).max(2),
  })).optional(),
});

// Create entry
entriesRouter.post('/', async (c) => {
  const body = await c.req.json();
  const result = createEntrySchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: 'Invalid entry data', details: result.error }, 400);
  }

  const { factors, ...entryData } = result.data;
  const id = crypto.randomUUID();

  await db.insert(entries).values({
    id,
    ...entryData,
    createdAt: new Date(),
  });

  // Insert factors if provided
  if (factors && factors.length > 0) {
    await db.insert(entryFactors).values(
      factors.map(f => ({
        entryId: id,
        factorId: f.factorId,
        impact: f.impact,
      }))
    );
  }

  return c.json({ id, success: true }, 201);
});

// List entries
entriesRouter.get('/', async (c) => {
  const { type, startDate, endDate, limit = '50', offset = '0' } = c.req.query();

  let query = db.select().from(entries);

  const conditions = [];
  if (type) conditions.push(eq(entries.type, type));
  if (startDate) conditions.push(gte(entries.createdAt, new Date(startDate)));
  if (endDate) conditions.push(lte(entries.createdAt, new Date(endDate)));

  const results = await db
    .select()
    .from(entries)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(entries.createdAt))
    .limit(parseInt(limit))
    .offset(parseInt(offset));

  return c.json(results);
});

// Get today's entries
entriesRouter.get('/today', async (c) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const results = await db
    .select()
    .from(entries)
    .where(and(
      gte(entries.createdAt, today),
      lte(entries.createdAt, tomorrow)
    ))
    .orderBy(desc(entries.createdAt));

  return c.json(results);
});

// Get single entry
entriesRouter.get('/:id', async (c) => {
  const { id } = c.req.param();

  const result = await db
    .select()
    .from(entries)
    .where(eq(entries.id, id))
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: 'Entry not found' }, 404);
  }

  // Get factors for this entry
  const factors = await db
    .select()
    .from(entryFactors)
    .where(eq(entryFactors.entryId, id));

  return c.json({ ...result[0], factors });
});

// Update entry
entriesRouter.put('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();

  const { factors, ...updateData } = body;

  await db
    .update(entries)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(entries.id, id));

  // Update factors if provided
  if (factors) {
    await db.delete(entryFactors).where(eq(entryFactors.entryId, id));
    if (factors.length > 0) {
      await db.insert(entryFactors).values(
        factors.map((f: { factorId: string; impact: number }) => ({
          entryId: id,
          factorId: f.factorId,
          impact: f.impact,
        }))
      );
    }
  }

  return c.json({ success: true });
});

// Delete entry
entriesRouter.delete('/:id', async (c) => {
  const { id } = c.req.param();
  await db.delete(entries).where(eq(entries.id, id));
  return c.json({ success: true });
});

// Search entries
entriesRouter.get('/search', async (c) => {
  const { q } = c.req.query();

  if (!q) {
    return c.json({ error: 'Search query required' }, 400);
  }

  // Note: For full-text search, you'd want to use PostgreSQL's full-text search
  // This is a simple LIKE query for now
  const results = await db
    .select()
    .from(entries)
    .orderBy(desc(entries.createdAt))
    .limit(50);

  // Filter in memory (replace with proper FTS later)
  const filtered = results.filter(entry => {
    const contentStr = JSON.stringify(entry.content).toLowerCase();
    return contentStr.includes(q.toLowerCase());
  });

  return c.json(filtered);
});
