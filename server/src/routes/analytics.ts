import { Hono } from 'hono';
import { db, entries, streaks, entryFactors, moodFactors } from '../db/index.js';
import { eq, gte, desc, and } from 'drizzle-orm';

export const analyticsRouter = new Hono();

// Get mood trends
analyticsRouter.get('/mood', async (c) => {
  const { days = '30' } = c.req.query();
  const daysNum = parseInt(days);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysNum);

  const results = await db
    .select({
      createdAt: entries.createdAt,
      moodScore: entries.moodScore,
      energyScore: entries.energyScore,
      type: entries.type,
    })
    .from(entries)
    .where(gte(entries.createdAt, startDate))
    .orderBy(entries.createdAt);

  // Group by date
  const grouped = results.reduce((acc, entry) => {
    const dateKey = entry.createdAt.toISOString().split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = { moods: [], energies: [] };
    }
    if (entry.moodScore) acc[dateKey].moods.push(entry.moodScore);
    if (entry.energyScore) acc[dateKey].energies.push(entry.energyScore);
    return acc;
  }, {} as Record<string, { moods: number[]; energies: number[] }>);

  // Calculate daily averages
  const trends = Object.entries(grouped).map(([date, data]) => ({
    date,
    avgMood: data.moods.length > 0
      ? data.moods.reduce((a, b) => a + b, 0) / data.moods.length
      : null,
    avgEnergy: data.energies.length > 0
      ? data.energies.reduce((a, b) => a + b, 0) / data.energies.length
      : null,
    entryCount: data.moods.length + data.energies.length,
  }));

  return c.json(trends);
});

// Get factor correlations with mood
analyticsRouter.get('/factors', async (c) => {
  const { days = '30' } = c.req.query();
  const daysNum = parseInt(days);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysNum);

  // Get all factors
  const factors = await db.select().from(moodFactors);

  // Get entries with mood scores and their factors
  const recentEntries = await db
    .select()
    .from(entries)
    .where(and(
      gte(entries.createdAt, startDate),
      gte(entries.moodScore, 1)
    ));

  const entryIds = recentEntries.map(e => e.id);

  if (entryIds.length === 0) {
    return c.json([]);
  }

  // Get all entry-factor associations
  const associations = await db
    .select()
    .from(entryFactors);

  // Calculate correlation for each factor
  const correlations = factors.map(factor => {
    const relevantAssociations = associations.filter(a =>
      a.factorId === factor.id && entryIds.includes(a.entryId)
    );

    if (relevantAssociations.length === 0) {
      return { factor: factor.name, correlation: 0, count: 0 };
    }

    const moods = relevantAssociations.map(a => {
      const entry = recentEntries.find(e => e.id === a.entryId);
      return { mood: entry?.moodScore || 0, impact: a.impact || 0 };
    });

    // Simple correlation: average mood when factor is positive vs negative
    const avgMood = moods.reduce((sum, m) => sum + m.mood, 0) / moods.length;
    const avgImpact = moods.reduce((sum, m) => sum + m.impact, 0) / moods.length;

    return {
      factor: factor.name,
      factorId: factor.id,
      avgImpact,
      avgMoodWhenPresent: avgMood,
      count: relevantAssociations.length,
    };
  });

  return c.json(correlations.filter(c => c.count > 0));
});

// Get streak status
analyticsRouter.get('/streaks', async (c) => {
  const allStreaks = await db.select().from(streaks);

  // Calculate current streaks based on entries
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const recentEntries = await db
    .select()
    .from(entries)
    .orderBy(desc(entries.createdAt))
    .limit(365);

  // Group by date and type
  const entryDates = new Map<string, Set<string>>();
  recentEntries.forEach(entry => {
    const dateKey = entry.createdAt.toISOString().split('T')[0];
    if (!entryDates.has(dateKey)) {
      entryDates.set(dateKey, new Set());
    }
    entryDates.get(dateKey)!.add(entry.type);
  });

  // Calculate streaks
  const calculateStreak = (type: string | null) => {
    let streak = 0;
    const checkDate = new Date(today);

    while (true) {
      const dateKey = checkDate.toISOString().split('T')[0];
      const types = entryDates.get(dateKey);

      if (!types) break;
      if (type && !types.has(type)) break;
      if (!type && types.size === 0) break;

      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  };

  return c.json({
    morning: calculateStreak('morning'),
    evening: calculateStreak('evening'),
    combined: calculateStreak(null),
    totalEntries: recentEntries.length,
  });
});

// Get AI-detected patterns (placeholder - actual patterns come from AI)
analyticsRouter.get('/patterns', async (c) => {
  // This would typically call the AI service to analyze recent entries
  // For now, return basic stats
  const { days = '30' } = c.req.query();
  const daysNum = parseInt(days);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysNum);

  const recentEntries = await db
    .select()
    .from(entries)
    .where(gte(entries.createdAt, startDate));

  const typeCounts = recentEntries.reduce((acc, entry) => {
    acc[entry.type] = (acc[entry.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const avgMood = recentEntries
    .filter(e => e.moodScore)
    .reduce((sum, e) => sum + (e.moodScore || 0), 0) /
    recentEntries.filter(e => e.moodScore).length || 0;

  return c.json({
    totalEntries: recentEntries.length,
    entriesByType: typeCounts,
    averageMood: Math.round(avgMood * 10) / 10,
    period: `${daysNum} days`,
  });
});
