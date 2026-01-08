import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(connectionString as string);

async function initDatabase() {
  console.log('Initializing database schema...');

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        passphrase TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content JSONB NOT NULL,
        mood_score INTEGER,
        energy_score INTEGER,
        tags JSONB DEFAULT '[]',
        is_favorite BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS prompts (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        subcategory TEXT,
        text TEXT NOT NULL,
        source TEXT,
        is_active BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS quotes (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        author TEXT NOT NULL,
        source_work TEXT,
        book_chapter TEXT,
        tags JSONB DEFAULT '[]',
        category TEXT,
        is_favorite BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS streaks (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        current_count INTEGER DEFAULT 0,
        longest_count INTEGER DEFAULT 0,
        last_entry_date DATE,
        missed_dates JSONB DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS mood_factors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        icon TEXT
      );

      CREATE TABLE IF NOT EXISTS entry_factors (
        entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        factor_id TEXT NOT NULL REFERENCES mood_factors(id),
        impact INTEGER,
        PRIMARY KEY (entry_id, factor_id)
      );

      CREATE TABLE IF NOT EXISTS ai_insights (
        id TEXT PRIMARY KEY,
        entry_id TEXT REFERENCES entries(id) ON DELETE CASCADE,
        insight_type TEXT,
        content TEXT,
        model_used TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS badges (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        criteria JSONB,
        earned_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value JSONB
      );
    `;

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

initDatabase();
