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

// ==========================================
// CURRICULUM / LEARNING SYSTEM TABLES
// ==========================================

// Curriculum phases (Foundation, Meditations, Letters, Discourses)
export const curriculumPhases = pgTable('curriculum_phases', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // 'foundation', 'meditations', 'letters', 'discourses'
  title: text('title').notNull(), // 'Phase 1: Foundation'
  description: text('description'),
  orderIndex: integer('order_index').notNull(),
  estimatedWeeks: integer('estimated_weeks'),
  isOngoing: boolean('is_ongoing').default(false),
});

// Text sources (books/works within phases)
export const curriculumTexts = pgTable('curriculum_texts', {
  id: text('id').primaryKey(),
  phaseId: text('phase_id').references(() => curriculumPhases.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(), // 'Enchiridion', 'Meditations', etc.
  author: text('author').notNull(), // 'Epictetus', 'Marcus Aurelius', 'Seneca'
  description: text('description'),
  orderIndex: integer('order_index').notNull(),
  totalPassages: integer('total_passages').default(0),
});

// Individual passages/readings
export const curriculumPassages = pgTable('curriculum_passages', {
  id: text('id').primaryKey(),
  textId: text('text_id').references(() => curriculumTexts.id, { onDelete: 'cascade' }).notNull(),
  sessionNumber: integer('session_number').notNull(), // Which study session this belongs to
  passageNumber: integer('passage_number').notNull(), // Order within session
  reference: text('reference'), // 'Chapter 1', 'Book II.5', 'Letter 1'
  content: text('content').notNull(), // The actual passage text
  translation: text('translation'), // Translation source/note
  orderIndex: integer('order_index').notNull(), // Global order within text
});

// Study guides for each passage
export const studyGuides = pgTable('study_guides', {
  id: text('id').primaryKey(),
  passageId: text('passage_id').references(() => curriculumPassages.id, { onDelete: 'cascade' }).notNull(),
  keyPoints: jsonb('key_points').$type<string[]>().default([]),
  vocabulary: jsonb('vocabulary').$type<{ term: string; definition: string }[]>().default([]),
  reflectionQuestions: jsonb('reflection_questions').$type<string[]>().default([]),
  practicalExercise: text('practical_exercise'),
  relatedPassages: jsonb('related_passages').$type<string[]>().default([]),
  stoicConcepts: jsonb('stoic_concepts').$type<string[]>().default([]),
});

// User's curriculum settings (single row for single-user app)
export const curriculumSettings = pgTable('curriculum_settings', {
  id: text('id').primaryKey(),
  frequency: text('frequency').notNull().default('daily'), // 'daily', 'every_other_day', '3x_week', '2x_week', 'weekly'
  preferredDays: jsonb('preferred_days').$type<number[]>().default([]), // 0-6 for Sun-Sat
  startDate: date('start_date'),
  isActive: boolean('is_active').default(true),
  reminderTime: text('reminder_time'), // '08:00'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
});

// User progress tracking per passage
export const curriculumProgress = pgTable('curriculum_progress', {
  id: text('id').primaryKey(),
  passageId: text('passage_id').references(() => curriculumPassages.id, { onDelete: 'cascade' }).notNull(),
  status: text('status').notNull().default('not_started'), // 'not_started', 'in_progress', 'completed'
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  scheduledDate: date('scheduled_date'),
  actualDate: date('actual_date'),
  timeSpentMinutes: integer('time_spent_minutes'),
});

// Reading journal entries (reflections on specific passages)
export const readingJournal = pgTable('reading_journal', {
  id: text('id').primaryKey(),
  passageId: text('passage_id').references(() => curriculumPassages.id, { onDelete: 'cascade' }).notNull(),
  progressId: text('progress_id').references(() => curriculumProgress.id, { onDelete: 'cascade' }),
  reflection: text('reflection'),
  personalConnection: text('personal_connection'),
  questionsAnswered: jsonb('questions_answered').$type<{ question: string; answer: string }[]>().default([]),
  favoriteQuote: text('favorite_quote'),
  practiceCommitment: text('practice_commitment'),
  moodBefore: integer('mood_before'), // 1-10
  moodAfter: integer('mood_after'), // 1-10
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
});

// AI discussion history per passage
export const curriculumDiscussions = pgTable('curriculum_discussions', {
  id: text('id').primaryKey(),
  passageId: text('passage_id').references(() => curriculumPassages.id, { onDelete: 'cascade' }).notNull(),
  messages: jsonb('messages').$type<{ role: 'user' | 'assistant'; content: string; timestamp: string }[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
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

// Curriculum types
export type CurriculumPhase = typeof curriculumPhases.$inferSelect;
export type CurriculumText = typeof curriculumTexts.$inferSelect;
export type CurriculumPassage = typeof curriculumPassages.$inferSelect;
export type StudyGuide = typeof studyGuides.$inferSelect;
export type CurriculumSettings = typeof curriculumSettings.$inferSelect;
export type CurriculumProgress = typeof curriculumProgress.$inferSelect;
export type ReadingJournal = typeof readingJournal.$inferSelect;
export type CurriculumDiscussion = typeof curriculumDiscussions.$inferSelect;
