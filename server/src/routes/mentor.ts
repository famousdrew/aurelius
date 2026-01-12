import { Hono } from 'hono';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import {
  db,
  entries,
  curriculumProgress,
  curriculumPassages,
  curriculumTexts,
  readingJournal,
  mentorConversations,
} from '../db/index.js';
import { desc, eq, gte, inArray } from 'drizzle-orm';

export const mentorRouter = new Hono();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const chatSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().nullish(), // allows undefined or null
});

// Get user's learning context
async function getUserContext() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get recent journal entries
  const recentEntries = await db
    .select()
    .from(entries)
    .where(gte(entries.createdAt, thirtyDaysAgo))
    .orderBy(desc(entries.createdAt))
    .limit(20);

  // Get curriculum progress - completed passages
  const completedProgress = await db
    .select()
    .from(curriculumProgress)
    .where(eq(curriculumProgress.status, 'completed'));

  const completedPassageIds = completedProgress.map(p => p.passageId);

  // Get details of completed passages
  let completedPassages: Array<{ reference: string; textTitle: string; content: string }> = [];
  if (completedPassageIds.length > 0) {
    const passages = await db
      .select({
        id: curriculumPassages.id,
        reference: curriculumPassages.reference,
        content: curriculumPassages.content,
        textId: curriculumPassages.textId,
      })
      .from(curriculumPassages)
      .where(inArray(curriculumPassages.id, completedPassageIds));

    // Get text titles
    const textIds = [...new Set(passages.map(p => p.textId))];
    const texts = await db
      .select()
      .from(curriculumTexts)
      .where(inArray(curriculumTexts.id, textIds));

    const textMap = new Map(texts.map(t => [t.id, t.title]));

    completedPassages = passages.map(p => ({
      reference: p.reference || 'Unknown',
      textTitle: textMap.get(p.textId) || 'Unknown',
      content: p.content.substring(0, 500), // Truncate for context
    }));
  }

  // Get reading journal reflections
  const reflections = await db
    .select()
    .from(readingJournal)
    .orderBy(desc(readingJournal.createdAt))
    .limit(10);

  return {
    recentEntries,
    completedPassages,
    reflections,
    stats: {
      totalEntriesLast30Days: recentEntries.length,
      passagesCompleted: completedPassageIds.length,
      reflectionsWritten: reflections.length,
    },
  };
}

// Build the mentor system prompt with user context
function buildSystemPrompt(context: Awaited<ReturnType<typeof getUserContext>>) {
  const { recentEntries, completedPassages, reflections, stats } = context;

  // Format recent entries for context
  const entriesSummary = recentEntries.slice(0, 10).map(e => {
    const content = typeof e.content === 'object' ? JSON.stringify(e.content) : e.content;
    return `- ${e.type} entry (${e.createdAt.toLocaleDateString()}): mood ${e.moodScore || 'N/A'}/10. ${String(content).substring(0, 200)}...`;
  }).join('\n');

  // Format completed readings
  const readingsSummary = completedPassages.slice(0, 15).map(p =>
    `- ${p.textTitle}: ${p.reference}`
  ).join('\n');

  // Format reflections
  const reflectionsSummary = reflections.slice(0, 5).map(r =>
    `- Reflection: "${(r.reflection || '').substring(0, 150)}..."`
  ).join('\n');

  return `You are a wise Stoic mentor and philosophy tutor. You are guiding a student through their study of Stoic philosophy, specifically the works of Epictetus (Enchiridion), Marcus Aurelius (Meditations), and Seneca (Letters from a Stoic).

YOUR ROLE:
- Be a thoughtful mentor, not a lecturer
- Use the Socratic method - ask questions to help the student discover insights
- Connect philosophical teachings to the student's real life experiences
- Be warm, encouraging, and genuine - like a trusted friend who happens to be wise
- Keep responses conversational and concise (2-3 paragraphs usually)
- When relevant, quote or reference specific passages the student has read

STUDENT'S JOURNEY:
- Passages completed: ${stats.passagesCompleted}
- Journal entries (last 30 days): ${stats.totalEntriesLast30Days}
- Reading reflections: ${stats.reflectionsWritten}

TEXTS THE STUDENT HAS STUDIED:
${readingsSummary || 'Just beginning their journey'}

RECENT JOURNAL ENTRIES (for context on their life):
${entriesSummary || 'No recent entries'}

THEIR REFLECTIONS ON READINGS:
${reflectionsSummary || 'No reflections yet'}

GUIDELINES:
1. Only reference material they have actually read (listed above)
2. If they haven't read much yet, focus on foundational Stoic concepts
3. When they share struggles, connect to relevant Stoic teachings they've encountered
4. Proactively suggest relevant passages they've read when appropriate
5. Celebrate their progress and insights
6. If they ask about material they haven't read, let them know it's coming up in their curriculum
7. Never be preachy or condescending - be a fellow traveler on the path

Remember: You're helping a real person live a better life through ancient wisdom. Be practical, not academic.`;
}

// Chat with mentor
mentorRouter.post('/chat', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    console.error('Failed to parse request body:', e);
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const result = chatSchema.safeParse(body);

  if (!result.success) {
    console.error('Validation failed:', result.error.errors, 'Body:', body);
    return c.json({ error: 'Invalid request', details: result.error.errors }, 400);
  }

  const { message, conversationId } = result.data;
  const convId = conversationId || crypto.randomUUID();

  // Get or create conversation from database
  let existingConv = await db
    .select()
    .from(mentorConversations)
    .where(eq(mentorConversations.id, convId))
    .limit(1);

  let history: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }> = [];

  if (existingConv.length > 0) {
    history = existingConv[0].messages || [];
  }

  // Add user message
  history.push({ role: 'user', content: message, timestamp: new Date().toISOString() });

  // Get user context for personalized responses
  const context = await getUserContext();
  const systemPrompt = buildSystemPrompt(context);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: history.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Add assistant response to history
    history.push({ role: 'assistant', content: assistantMessage, timestamp: new Date().toISOString() });

    // Keep conversation history manageable (last 20 messages)
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    // Save to database
    if (existingConv.length === 0) {
      await db.insert(mentorConversations).values({
        id: convId,
        messages: history,
        createdAt: new Date(),
      });
    } else {
      await db
        .update(mentorConversations)
        .set({ messages: history, updatedAt: new Date() })
        .where(eq(mentorConversations.id, convId));
    }

    return c.json({
      message: assistantMessage,
      conversationId: convId,
    });
  } catch (error) {
    console.error('Mentor chat error:', error);
    return c.json({ error: 'Failed to get response from mentor' }, 500);
  }
});

// Get conversation history
mentorRouter.get('/conversation/:id', async (c) => {
  const { id } = c.req.param();
  const conv = await db
    .select()
    .from(mentorConversations)
    .where(eq(mentorConversations.id, id))
    .limit(1);

  return c.json({ messages: conv[0]?.messages || [] });
});

// Get most recent conversation (for resuming)
mentorRouter.get('/conversation', async (c) => {
  const conv = await db
    .select()
    .from(mentorConversations)
    .orderBy(desc(mentorConversations.updatedAt))
    .limit(1);

  if (conv.length === 0) {
    return c.json({ conversationId: null, messages: [] });
  }

  return c.json({
    conversationId: conv[0].id,
    messages: conv[0].messages || [],
  });
});

// Clear conversation
mentorRouter.delete('/conversation/:id', async (c) => {
  const { id } = c.req.param();
  await db.delete(mentorConversations).where(eq(mentorConversations.id, id));
  return c.json({ success: true });
});

// Get mentor context summary (for UI display)
mentorRouter.get('/context', async (c) => {
  const context = await getUserContext();

  // Get a suggested topic based on recent activity
  let suggestedTopic = '';
  if (context.recentEntries.length > 0) {
    const lastEntry = context.recentEntries[0];
    if (lastEntry.moodScore && lastEntry.moodScore < 5) {
      suggestedTopic = 'It looks like you had a challenging day recently. Would you like to explore what Stoic wisdom might help?';
    }
  }
  if (!suggestedTopic && context.completedPassages.length > 0) {
    const lastPassage = context.completedPassages[0];
    suggestedTopic = `Would you like to discuss ${lastPassage.reference} from ${lastPassage.textTitle} further?`;
  }
  if (!suggestedTopic) {
    suggestedTopic = 'What\'s on your mind today? Or shall we explore some Stoic fundamentals?';
  }

  return c.json({
    stats: context.stats,
    suggestedTopic,
    recentTexts: context.completedPassages.slice(0, 5).map(p => ({
      text: p.textTitle,
      reference: p.reference,
    })),
  });
});
