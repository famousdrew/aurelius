import { Hono } from 'hono';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { db, entries, aiInsights } from '../db/index.js';
import { gte, desc } from 'drizzle-orm';

export const aiRouter = new Hono();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const reflectSchema = z.object({
  entryContent: z.string(),
  entryType: z.string().optional(),
});

const reframeSchema = z.object({
  thought: z.string(),
  situation: z.string().optional(),
});

const transcribeSchema = z.object({
  audio: z.string(), // Base64 encoded audio
});

// Generate reflection on journal entry
aiRouter.post('/reflect', async (c) => {
  const body = await c.req.json();
  const result = reflectSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: 'Invalid request' }, 400);
  }

  const { entryContent, entryType } = result.data;

  const systemPrompt = `You are a wise Stoic philosophy teacher helping with personal reflection. Your role is to:
1. Acknowledge the writer's experience with empathy and understanding
2. Offer a Stoic perspective on the situation, drawing from Marcus Aurelius, Epictetus, or Seneca
3. Ask one thoughtful follow-up question for deeper reflection

Keep your response warm but wise. Be concise - 2-3 short paragraphs maximum. Avoid being preachy or lecturing.`;

  const userPrompt = `Here is my journal entry${entryType ? ` (${entryType} reflection)` : ''}:

${entryContent}

Please share your thoughts.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const reflection = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    return c.json({ reflection });
  } catch (error) {
    console.error('AI reflection error:', error);
    return c.json({ error: 'Failed to generate reflection' }, 500);
  }
});

// Generate cognitive reframe suggestions
aiRouter.post('/reframe', async (c) => {
  const body = await c.req.json();
  const result = reframeSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: 'Invalid request' }, 400);
  }

  const { thought, situation } = result.data;

  const systemPrompt = `You are a CBT-informed assistant helping with cognitive restructuring. Analyze the thought/situation and provide:

1. Identify any cognitive distortions (e.g., catastrophizing, black-and-white thinking, mind reading, fortune telling, emotional reasoning)
2. 2-3 alternative interpretations of the situation
3. A balanced thought that acknowledges reality while reducing distress

Be supportive and non-judgmental. Use simple language.`;

  const userPrompt = `Original thought: "${thought}"${situation ? `\nSituation: ${situation}` : ''}

Please help me see this differently.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const reframe = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    return c.json({ reframe });
  } catch (error) {
    console.error('AI reframe error:', error);
    return c.json({ error: 'Failed to generate reframe' }, 500);
  }
});

// Generate follow-up questions
aiRouter.post('/followup', async (c) => {
  const body = await c.req.json();
  const { entryContent } = body;

  if (!entryContent) {
    return c.json({ error: 'Entry content required' }, 400);
  }

  const systemPrompt = `You are a thoughtful journal companion. Based on the journal entry, generate 2-3 follow-up questions that could help the writer explore their thoughts more deeply. Questions should be:
- Open-ended (not yes/no)
- Grounded in Stoic principles or CBT techniques
- Gentle and non-judgmental
- Focused on actionable insight or self-understanding

Return only the questions, numbered 1-3.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: entryContent }],
    });

    const questions = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    return c.json({ questions });
  } catch (error) {
    console.error('AI followup error:', error);
    return c.json({ error: 'Failed to generate questions' }, 500);
  }
});

// Analyze patterns over time
aiRouter.post('/patterns', async (c) => {
  const { days = 30 } = await c.req.json();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const recentEntries = await db
    .select()
    .from(entries)
    .where(gte(entries.createdAt, startDate))
    .orderBy(desc(entries.createdAt));

  if (recentEntries.length < 3) {
    return c.json({
      patterns: 'Not enough entries for pattern analysis. Keep journaling!',
    });
  }

  const entriesSummary = recentEntries.map(e => ({
    date: e.createdAt.toISOString().split('T')[0],
    type: e.type,
    mood: e.moodScore,
    content: JSON.stringify(e.content).slice(0, 500),
  }));

  const systemPrompt = `You are analyzing a user's journal entries to identify patterns. Look for:
1. Recurring themes or concerns
2. Mood patterns and what might influence them
3. Progress or positive changes over time
4. Gentle suggestions based on Stoic philosophy

Be encouraging and focus on growth. Keep your analysis to 3-4 short paragraphs.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Here are my recent journal entries:\n\n${JSON.stringify(entriesSummary, null, 2)}`,
      }],
    });

    const patterns = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Store insight
    await db.insert(aiInsights).values({
      id: crypto.randomUUID(),
      insightType: 'pattern',
      content: patterns,
      modelUsed: 'claude-sonnet-4-20250514',
    });

    return c.json({ patterns });
  } catch (error) {
    console.error('AI patterns error:', error);
    return c.json({ error: 'Failed to analyze patterns' }, 500);
  }
});

// Transcribe audio using Whisper
aiRouter.post('/transcribe', async (c) => {
  const formData = await c.req.formData();
  const audioFile = formData.get('audio') as File;

  if (!audioFile) {
    return c.json({ error: 'Audio file required' }, 400);
  }

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
    });

    return c.json({ text: transcription.text });
  } catch (error) {
    console.error('Transcription error:', error);
    return c.json({ error: 'Failed to transcribe audio' }, 500);
  }
});

// Get accumulated insights
aiRouter.get('/insights', async (c) => {
  const { limit = '10' } = c.req.query();

  const insights = await db
    .select()
    .from(aiInsights)
    .orderBy(desc(aiInsights.createdAt))
    .limit(parseInt(limit));

  return c.json(insights);
});
