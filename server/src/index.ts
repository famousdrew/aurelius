import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { entriesRouter } from './routes/entries.js';
import { promptsRouter } from './routes/prompts.js';
import { quotesRouter } from './routes/quotes.js';
import { analyticsRouter } from './routes/analytics.js';
import { aiRouter } from './routes/ai.js';
import { authRouter } from './routes/auth.js';
import { authMiddleware } from './middleware/auth.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Public routes
app.route('/api/auth', authRouter);

// Protected routes
app.use('/api/*', authMiddleware);
app.route('/api/entries', entriesRouter);
app.route('/api/prompts', promptsRouter);
app.route('/api/quotes', quotesRouter);
app.route('/api/analytics', analyticsRouter);
app.route('/api/ai', aiRouter);

const port = parseInt(process.env.PORT || '3000');

console.log(`Server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
