import { Hono } from 'hono';
import { z } from 'zod';
import {
  db,
  curriculumPhases,
  curriculumTexts,
  curriculumPassages,
  studyGuides,
  curriculumSettings,
  curriculumProgress,
  readingJournal,
  curriculumDiscussions,
} from '../db/index.js';
import { eq, desc, asc, and, isNull } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';

export const curriculumRouter = new Hono();

const anthropic = new Anthropic();

// ==========================================
// SETTINGS
// ==========================================

const settingsSchema = z.object({
  frequency: z.enum(['daily', 'every_other_day', '3x_week', '2x_week', 'weekly']),
  preferredDays: z.array(z.number().min(0).max(6)).optional(),
  reminderTime: z.string().optional(),
});

// Get or create settings
curriculumRouter.get('/settings', async (c) => {
  const results = await db.select().from(curriculumSettings).limit(1);

  if (results.length === 0) {
    // Return defaults
    return c.json({
      frequency: 'daily',
      preferredDays: [],
      startDate: null,
      isActive: false,
      reminderTime: null,
    });
  }

  return c.json(results[0]);
});

// Update settings
curriculumRouter.post('/settings', async (c) => {
  const body = await c.req.json();
  const result = settingsSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: 'Invalid settings', details: result.error }, 400);
  }

  const existing = await db.select().from(curriculumSettings).limit(1);

  if (existing.length === 0) {
    const id = crypto.randomUUID();
    await db.insert(curriculumSettings).values({
      id,
      ...result.data,
      startDate: new Date().toISOString().split('T')[0],
      isActive: true,
      createdAt: new Date(),
    });
    return c.json({ id, success: true }, 201);
  } else {
    await db
      .update(curriculumSettings)
      .set({ ...result.data, updatedAt: new Date() })
      .where(eq(curriculumSettings.id, existing[0].id));
    return c.json({ success: true });
  }
});

// ==========================================
// OVERVIEW & PROGRESS
// ==========================================

// Get overall curriculum overview
curriculumRouter.get('/overview', async (c) => {
  // Get all phases with their texts
  const phases = await db
    .select()
    .from(curriculumPhases)
    .orderBy(asc(curriculumPhases.orderIndex));

  const texts = await db
    .select()
    .from(curriculumTexts)
    .orderBy(asc(curriculumTexts.orderIndex));

  // Get progress
  const progress = await db
    .select()
    .from(curriculumProgress)
    .where(eq(curriculumProgress.status, 'completed'));

  // Get total passages
  const allPassages = await db.select().from(curriculumPassages);

  // Get settings for journey info
  const settings = await db.select().from(curriculumSettings).limit(1);

  // Calculate stats
  const completedCount = progress.length;
  const totalCount = allPassages.length;
  const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Calculate journey days
  let daysOnJourney = 0;
  if (settings.length > 0 && settings[0].startDate) {
    const startDate = new Date(settings[0].startDate);
    const today = new Date();
    daysOnJourney = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Build phase progress data
  const phasesWithProgress = phases.map(phase => {
    const phaseTexts = texts.filter(t => t.phaseId === phase.id);
    const phasePassageIds = allPassages
      .filter(p => phaseTexts.some(t => t.id === p.textId))
      .map(p => p.id);
    const phaseCompleted = progress.filter(p => phasePassageIds.includes(p.passageId)).length;

    return {
      phase,
      texts: phaseTexts,
      passagesCompleted: phaseCompleted,
      passagesTotal: phasePassageIds.length,
      isUnlocked: phase.orderIndex === 0 || phaseCompleted > 0 ||
        phases.findIndex(p => p.id === phase.id) <=
        phases.findIndex(p => {
          const pTexts = texts.filter(t => t.phaseId === p.id);
          const pPassageIds = allPassages.filter(pa => pTexts.some(t => t.id === pa.textId)).map(pa => pa.id);
          const pCompleted = progress.filter(pr => pPassageIds.includes(pr.passageId)).length;
          return pCompleted < pPassageIds.length;
        }),
    };
  });

  // Find current phase (first incomplete one)
  const currentPhase = phasesWithProgress.find(p => p.passagesCompleted < p.passagesTotal) || phasesWithProgress[0];

  return c.json({
    progress: {
      totalPassages: totalCount,
      completedPassages: completedCount,
      percentComplete,
      daysOnJourney,
      dayNumber: completedCount + 1,
    },
    currentPhase: currentPhase?.phase || null,
    phases: phasesWithProgress,
  });
});

// Get today's reading
curriculumRouter.get('/today', async (c) => {
  // Get the next unread passage
  const completedProgress = await db
    .select()
    .from(curriculumProgress)
    .where(eq(curriculumProgress.status, 'completed'));

  const completedPassageIds = completedProgress.map(p => p.passageId);

  // Get all passages in order
  const allPassages = await db
    .select()
    .from(curriculumPassages)
    .orderBy(asc(curriculumPassages.orderIndex));

  // Find next unread
  const nextPassage = allPassages.find(p => !completedPassageIds.includes(p.id));

  if (!nextPassage) {
    return c.json({
      currentReading: null,
      dayNumber: completedPassageIds.length,
      totalCompleted: completedPassageIds.length,
      totalPassages: allPassages.length,
      message: 'You have completed all readings!',
    });
  }

  // Get text and phase info
  const text = await db
    .select()
    .from(curriculumTexts)
    .where(eq(curriculumTexts.id, nextPassage.textId))
    .limit(1);

  let phase = null;
  if (text.length > 0) {
    const phaseResult = await db
      .select()
      .from(curriculumPhases)
      .where(eq(curriculumPhases.id, text[0].phaseId))
      .limit(1);
    phase = phaseResult[0] || null;
  }

  // Get study guide
  const guide = await db
    .select()
    .from(studyGuides)
    .where(eq(studyGuides.passageId, nextPassage.id))
    .limit(1);

  // Get existing progress record if any
  const existingProgress = await db
    .select()
    .from(curriculumProgress)
    .where(eq(curriculumProgress.passageId, nextPassage.id))
    .limit(1);

  return c.json({
    currentReading: {
      passage: nextPassage,
      studyGuide: guide[0] || null,
      text: text[0] || null,
      phase: phase,
      progress: existingProgress[0] || null,
    },
    dayNumber: completedPassageIds.length + 1,
    totalCompleted: completedPassageIds.length,
    totalPassages: allPassages.length,
  });
});

// Update progress for a passage
curriculumRouter.post('/progress/:passageId', async (c) => {
  const { passageId } = c.req.param();
  const body = await c.req.json();
  const { status, timeSpentMinutes } = body;

  // Check if progress record exists
  const existing = await db
    .select()
    .from(curriculumProgress)
    .where(eq(curriculumProgress.passageId, passageId))
    .limit(1);

  const today = new Date().toISOString().split('T')[0];

  if (existing.length === 0) {
    const id = crypto.randomUUID();
    await db.insert(curriculumProgress).values({
      id,
      passageId,
      status: status || 'in_progress',
      startedAt: new Date(),
      completedAt: status === 'completed' ? new Date() : null,
      actualDate: status === 'completed' ? today : null,
      timeSpentMinutes,
    });
    return c.json({ id, success: true }, 201);
  } else {
    const updateData: Record<string, unknown> = { status };
    if (status === 'completed') {
      updateData.completedAt = new Date();
      updateData.actualDate = today;
    }
    if (timeSpentMinutes !== undefined) {
      updateData.timeSpentMinutes = timeSpentMinutes;
    }

    await db
      .update(curriculumProgress)
      .set(updateData)
      .where(eq(curriculumProgress.id, existing[0].id));
    return c.json({ success: true });
  }
});

// Get detailed progress
curriculumRouter.get('/progress', async (c) => {
  const progress = await db
    .select()
    .from(curriculumProgress)
    .orderBy(desc(curriculumProgress.completedAt));

  return c.json(progress);
});

// ==========================================
// CONTENT (PHASES, TEXTS, PASSAGES)
// ==========================================

// List all phases
curriculumRouter.get('/phases', async (c) => {
  const phases = await db
    .select()
    .from(curriculumPhases)
    .orderBy(asc(curriculumPhases.orderIndex));

  // Get texts for each phase
  const texts = await db
    .select()
    .from(curriculumTexts)
    .orderBy(asc(curriculumTexts.orderIndex));

  const phasesWithTexts = phases.map(phase => ({
    ...phase,
    texts: texts.filter(t => t.phaseId === phase.id),
  }));

  return c.json(phasesWithTexts);
});

// Get single passage with study guide
curriculumRouter.get('/passages/:id', async (c) => {
  const { id } = c.req.param();

  const passage = await db
    .select()
    .from(curriculumPassages)
    .where(eq(curriculumPassages.id, id))
    .limit(1);

  if (passage.length === 0) {
    return c.json({ error: 'Passage not found' }, 404);
  }

  // Get study guide
  const guide = await db
    .select()
    .from(studyGuides)
    .where(eq(studyGuides.passageId, id))
    .limit(1);

  // Get text and phase
  const text = await db
    .select()
    .from(curriculumTexts)
    .where(eq(curriculumTexts.id, passage[0].textId))
    .limit(1);

  let phase = null;
  if (text.length > 0) {
    const phaseResult = await db
      .select()
      .from(curriculumPhases)
      .where(eq(curriculumPhases.id, text[0].phaseId))
      .limit(1);
    phase = phaseResult[0] || null;
  }

  // Get progress
  const progress = await db
    .select()
    .from(curriculumProgress)
    .where(eq(curriculumProgress.passageId, id))
    .limit(1);

  return c.json({
    passage: passage[0],
    studyGuide: guide[0] || null,
    text: text[0] || null,
    phase,
    progress: progress[0] || null,
  });
});

// ==========================================
// READING JOURNAL
// ==========================================

const journalSchema = z.object({
  passageId: z.string(),
  reflection: z.string().optional(),
  personalConnection: z.string().optional(),
  questionsAnswered: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).optional(),
  favoriteQuote: z.string().optional(),
  practiceCommitment: z.string().optional(),
  moodBefore: z.number().min(1).max(10).optional(),
  moodAfter: z.number().min(1).max(10).optional(),
});

// Create journal entry
curriculumRouter.post('/journal', async (c) => {
  const body = await c.req.json();
  const result = journalSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: 'Invalid journal data', details: result.error }, 400);
  }

  // Check if entry already exists for this passage
  const existing = await db
    .select()
    .from(readingJournal)
    .where(eq(readingJournal.passageId, result.data.passageId))
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    await db
      .update(readingJournal)
      .set({ ...result.data, updatedAt: new Date() })
      .where(eq(readingJournal.id, existing[0].id));
    return c.json({ id: existing[0].id, success: true });
  }

  // Get progress ID if exists
  const progress = await db
    .select()
    .from(curriculumProgress)
    .where(eq(curriculumProgress.passageId, result.data.passageId))
    .limit(1);

  const id = crypto.randomUUID();
  await db.insert(readingJournal).values({
    id,
    ...result.data,
    progressId: progress[0]?.id || null,
    createdAt: new Date(),
  });

  return c.json({ id, success: true }, 201);
});

// List journal entries
curriculumRouter.get('/journal', async (c) => {
  const { limit = '50', offset = '0' } = c.req.query();

  const entries = await db
    .select()
    .from(readingJournal)
    .orderBy(desc(readingJournal.createdAt))
    .limit(parseInt(limit))
    .offset(parseInt(offset));

  // Enrich with passage info
  const enrichedEntries = await Promise.all(
    entries.map(async (entry) => {
      const passage = await db
        .select()
        .from(curriculumPassages)
        .where(eq(curriculumPassages.id, entry.passageId))
        .limit(1);
      return { ...entry, passage: passage[0] || null };
    })
  );

  return c.json(enrichedEntries);
});

// Get journal entry for specific passage
curriculumRouter.get('/journal/:passageId', async (c) => {
  const { passageId } = c.req.param();

  const entry = await db
    .select()
    .from(readingJournal)
    .where(eq(readingJournal.passageId, passageId))
    .limit(1);

  if (entry.length === 0) {
    return c.json({ error: 'Journal entry not found' }, 404);
  }

  return c.json(entry[0]);
});

// Update journal entry
curriculumRouter.put('/journal/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();

  await db
    .update(readingJournal)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(readingJournal.id, id));

  return c.json({ success: true });
});

// ==========================================
// AI DISCUSSION
// ==========================================

const discussSchema = z.object({
  passageId: z.string(),
  message: z.string().min(1),
});

// Send message to AI about a passage
curriculumRouter.post('/discuss', async (c) => {
  const body = await c.req.json();
  const result = discussSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: 'Invalid discussion data', details: result.error }, 400);
  }

  const { passageId, message } = result.data;

  // Get passage content
  const passage = await db
    .select()
    .from(curriculumPassages)
    .where(eq(curriculumPassages.id, passageId))
    .limit(1);

  if (passage.length === 0) {
    return c.json({ error: 'Passage not found' }, 404);
  }

  // Get text and study guide for context
  const text = await db
    .select()
    .from(curriculumTexts)
    .where(eq(curriculumTexts.id, passage[0].textId))
    .limit(1);

  const guide = await db
    .select()
    .from(studyGuides)
    .where(eq(studyGuides.passageId, passageId))
    .limit(1);

  // Get or create discussion
  let discussion = await db
    .select()
    .from(curriculumDiscussions)
    .where(eq(curriculumDiscussions.passageId, passageId))
    .limit(1);

  const existingMessages = discussion[0]?.messages || [];

  // Build system prompt
  const systemPrompt = `You are a wise Stoic philosophy teacher helping a student understand an ancient text.

The student is reading: ${passage[0].reference || 'a passage'}
From: "${text[0]?.title || 'Unknown'}" by ${text[0]?.author || 'Unknown'}

The passage reads:
"${passage[0].content}"

${guide[0]?.stoicConcepts?.length ? `Key Stoic concepts in this passage: ${guide[0].stoicConcepts.join(', ')}` : ''}

Your role:
1. Help explain difficult concepts in accessible language
2. Draw connections to the student's modern life
3. Reference other Stoic teachings when relevant
4. Encourage practical application
5. Ask thoughtful follow-up questions to deepen understanding

Be warm and encouraging. Keep responses concise (2-3 paragraphs).
Avoid being preachy. Meet the student where they are.`;

  // Build conversation history for API
  const apiMessages = existingMessages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));
  apiMessages.push({ role: 'user', content: message });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: apiMessages,
    });

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Save updated conversation
    const newMessages = [
      ...existingMessages,
      { role: 'user' as const, content: message, timestamp: new Date().toISOString() },
      { role: 'assistant' as const, content: assistantMessage, timestamp: new Date().toISOString() },
    ];

    if (discussion.length === 0) {
      const id = crypto.randomUUID();
      await db.insert(curriculumDiscussions).values({
        id,
        passageId,
        messages: newMessages,
        createdAt: new Date(),
      });
    } else {
      await db
        .update(curriculumDiscussions)
        .set({ messages: newMessages, updatedAt: new Date() })
        .where(eq(curriculumDiscussions.id, discussion[0].id));
    }

    return c.json({ response: assistantMessage });
  } catch (error) {
    console.error('AI discussion error:', error);
    return c.json({ error: 'Failed to generate response' }, 500);
  }
});

// Get discussion history for a passage
curriculumRouter.get('/discuss/:passageId', async (c) => {
  const { passageId } = c.req.param();

  const discussion = await db
    .select()
    .from(curriculumDiscussions)
    .where(eq(curriculumDiscussions.passageId, passageId))
    .limit(1);

  if (discussion.length === 0) {
    return c.json({ messages: [] });
  }

  return c.json({ messages: discussion[0].messages });
});

// Clear discussion history
curriculumRouter.delete('/discuss/:passageId', async (c) => {
  const { passageId } = c.req.param();

  await db
    .delete(curriculumDiscussions)
    .where(eq(curriculumDiscussions.passageId, passageId));

  return c.json({ success: true });
});
