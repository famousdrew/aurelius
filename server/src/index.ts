import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { entriesRouter } from './routes/entries.js';
import { promptsRouter } from './routes/prompts.js';
import { quotesRouter } from './routes/quotes.js';
import { analyticsRouter } from './routes/analytics.js';
import { aiRouter } from './routes/ai.js';
import { authRouter } from './routes/auth.js';
import { curriculumRouter } from './routes/curriculum.js';
import { mentorRouter } from './routes/mentor.js';
import { authMiddleware } from './middleware/auth.js';

const app = new Hono();
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: isProduction ? '*' : (process.env.CLIENT_URL || 'http://localhost:5173'),
  credentials: !isProduction,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Serve audio files (path differs between dev and production)
const audioRoot = isProduction ? './server/public' : './public';
app.use('/audio/*', serveStatic({ root: audioRoot }));

// Public routes
app.route('/api/auth', authRouter);

// Protected routes
app.use('/api/*', authMiddleware);
app.route('/api/entries', entriesRouter);
app.route('/api/prompts', promptsRouter);
app.route('/api/quotes', quotesRouter);
app.route('/api/analytics', analyticsRouter);
app.route('/api/ai', aiRouter);
app.route('/api/curriculum', curriculumRouter);
app.route('/api/mentor', mentorRouter);

// Serve static files in production
if (isProduction) {
  app.use('/*', serveStatic({ root: './client/dist' }));

  // SPA fallback - serve index.html for non-API routes
  app.get('*', serveStatic({ path: './client/dist/index.html' }));
}

const port = parseInt(process.env.PORT || '3000');

console.log(`Server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
