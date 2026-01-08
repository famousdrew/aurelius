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
    // Create tables one at a time
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        passphrase TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;

    await sql`
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
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS prompts (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        subcategory TEXT,
        text TEXT NOT NULL,
        source TEXT,
        is_active BOOLEAN DEFAULT TRUE
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS quotes (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        author TEXT NOT NULL,
        source_work TEXT,
        book_chapter TEXT,
        tags JSONB DEFAULT '[]',
        category TEXT,
        is_favorite BOOLEAN DEFAULT FALSE
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS streaks (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        current_count INTEGER DEFAULT 0,
        longest_count INTEGER DEFAULT 0,
        last_entry_date DATE,
        missed_dates JSONB DEFAULT '[]'
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS mood_factors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        icon TEXT
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS entry_factors (
        entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        factor_id TEXT NOT NULL REFERENCES mood_factors(id),
        impact INTEGER,
        PRIMARY KEY (entry_id, factor_id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS ai_insights (
        id TEXT PRIMARY KEY,
        entry_id TEXT REFERENCES entries(id) ON DELETE CASCADE,
        insight_type TEXT,
        content TEXT,
        model_used TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS badges (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        criteria JSONB,
        earned_at TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value JSONB
      )
    `;

    // Curriculum tables
    await sql`
      CREATE TABLE IF NOT EXISTS curriculum_phases (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        order_index INTEGER NOT NULL,
        estimated_weeks INTEGER,
        is_ongoing BOOLEAN DEFAULT FALSE
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS curriculum_texts (
        id TEXT PRIMARY KEY,
        phase_id TEXT NOT NULL REFERENCES curriculum_phases(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        description TEXT,
        order_index INTEGER NOT NULL,
        total_passages INTEGER DEFAULT 0
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS curriculum_passages (
        id TEXT PRIMARY KEY,
        text_id TEXT NOT NULL REFERENCES curriculum_texts(id) ON DELETE CASCADE,
        session_number INTEGER NOT NULL,
        passage_number INTEGER NOT NULL,
        reference TEXT,
        content TEXT NOT NULL,
        translation TEXT,
        order_index INTEGER NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS study_guides (
        id TEXT PRIMARY KEY,
        passage_id TEXT NOT NULL REFERENCES curriculum_passages(id) ON DELETE CASCADE,
        key_points JSONB DEFAULT '[]',
        vocabulary JSONB DEFAULT '[]',
        reflection_questions JSONB DEFAULT '[]',
        practical_exercise TEXT,
        related_passages JSONB DEFAULT '[]',
        stoic_concepts JSONB DEFAULT '[]'
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS curriculum_settings (
        id TEXT PRIMARY KEY,
        frequency TEXT NOT NULL DEFAULT 'daily',
        preferred_days JSONB DEFAULT '[]',
        start_date DATE,
        is_active BOOLEAN DEFAULT TRUE,
        reminder_time TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS curriculum_progress (
        id TEXT PRIMARY KEY,
        passage_id TEXT NOT NULL REFERENCES curriculum_passages(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'not_started',
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        scheduled_date DATE,
        actual_date DATE,
        time_spent_minutes INTEGER
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS reading_journal (
        id TEXT PRIMARY KEY,
        passage_id TEXT NOT NULL REFERENCES curriculum_passages(id) ON DELETE CASCADE,
        progress_id TEXT REFERENCES curriculum_progress(id) ON DELETE CASCADE,
        reflection TEXT,
        personal_connection TEXT,
        questions_answered JSONB DEFAULT '[]',
        favorite_quote TEXT,
        practice_commitment TEXT,
        mood_before INTEGER,
        mood_after INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS curriculum_discussions (
        id TEXT PRIMARY KEY,
        passage_id TEXT NOT NULL REFERENCES curriculum_passages(id) ON DELETE CASCADE,
        messages JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP
      )
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
