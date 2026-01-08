import { pgTable, text, timestamp, integer, boolean, jsonb, date, primaryKey } from 'drizzle-orm/pg-core';

// Journal entries
export const entries = pgTable('entries', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'morning', 'evening', 'freeform', 'thought_record'
  content: jsonb('content').notNull(), // Structured content based on entry type
  moodScore: integer('mood_score'), // 1-10
  energyScore: integer('energy_score'), // 1-10
  tags: jsonb('tags').$type<string[]>().default([]),
  isFavorite: boolean('is_favorite').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
});

// Stoic prompts
export const prompts = pgTable('prompts', {
  id: text('id').primaryKey(),
  category: text('category').notNull(), // 'stoic', 'cbt', 'gratitude', 'reflection'
  subcategory: text('subcategory'), // 'dichotomy', 'virtue', 'cognitive_restructuring'
  text: text('text').notNull(),
  source: text('source'), // 'Marcus Aurelius', 'Epictetus', 'Seneca', 'CBT'
  isActive: boolean('is_active').default(true),
});

// Stoic quotes
export const quotes = pgTable('quotes', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  author: text('author').notNull(),
  sourceWork: text('source_work'),
  bookChapter: text('book_chapter'),
  tags: jsonb('tags').$type<string[]>().default([]),
  category: text('category'),
  isFavorite: boolean('is_favorite').default(false),
});

// Streak tracking
export const streaks = pgTable('streaks', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'morning', 'evening', 'combined'
  currentCount: integer('current_count').default(0),
  longestCount: integer('longest_count').default(0),
  lastEntryDate: date('last_entry_date'),
  missedDates: jsonb('missed_dates').$type<string[]>().default([]),
});

// Mood factors
export const moodFactors = pgTable('mood_factors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category'), // 'sleep', 'exercise', 'social', 'work', 'health'
  icon: text('icon'),
});

// Entry-factor associations
export const entryFactors = pgTable('entry_factors', {
  entryId: text('entry_id').references(() => entries.id, { onDelete: 'cascade' }).notNull(),
  factorId: text('factor_id').references(() => moodFactors.id).notNull(),
  impact: integer('impact'), // -2 to +2
}, (table) => ({
  pk: primaryKey({ columns: [table.entryId, table.factorId] }),
}));

// AI-generated insights
export const aiInsights = pgTable('ai_insights', {
  id: text('id').primaryKey(),
  entryId: text('entry_id').references(() => entries.id, { onDelete: 'cascade' }),
  insightType: text('insight_type'), // 'pattern', 'suggestion', 'reframe'
  content: text('content'),
  modelUsed: text('model_used'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Badges/achievements
export const badges = pgTable('badges', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  criteria: jsonb('criteria'), // JSON with unlock conditions
  earnedAt: timestamp('earned_at'),
});

// App settings
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value'),
});

// User (single user app, but structured for auth)
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  passphrase: text('passphrase').notNull(), // Hashed passphrase
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Types for TypeScript
export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
export type Prompt = typeof prompts.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type Streak = typeof streaks.$inferSelect;
export type MoodFactor = typeof moodFactors.$inferSelect;
export type AiInsight = typeof aiInsights.$inferSelect;
export type Badge = typeof badges.$inferSelect;
