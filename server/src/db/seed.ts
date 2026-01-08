import postgres from 'postgres';
import { quotes } from './seed-quotes.js';
import { prompts } from './seed-prompts.js';
import { moodFactors } from './seed-mood-factors.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(connectionString as string);

async function seedDatabase() {
  console.log('Starting database seed...\n');

  try {
    // Seed quotes
    console.log(`Seeding ${quotes.length} quotes...`);
    let quotesInserted = 0;

    for (const quote of quotes) {
      try {
        await sql`
          INSERT INTO quotes (id, text, author, source_work, book_chapter, tags, category, is_favorite)
          VALUES (
            ${quote.id},
            ${quote.text},
            ${quote.author},
            ${quote.sourceWork || null},
            ${quote.bookChapter || null},
            ${JSON.stringify(quote.tags)},
            ${quote.category || null},
            false
          )
          ON CONFLICT (id) DO NOTHING
        `;
        quotesInserted++;
      } catch (error) {
        console.error(`Failed to insert quote: ${quote.text.substring(0, 50)}...`, error);
      }
    }
    console.log(`  Inserted ${quotesInserted} quotes\n`);

    // Seed prompts
    console.log(`Seeding ${prompts.length} prompts...`);
    let promptsInserted = 0;

    for (const prompt of prompts) {
      try {
        await sql`
          INSERT INTO prompts (id, category, subcategory, text, source, is_active)
          VALUES (
            ${prompt.id},
            ${prompt.category},
            ${prompt.subcategory || null},
            ${prompt.text},
            ${prompt.source || null},
            true
          )
          ON CONFLICT (id) DO NOTHING
        `;
        promptsInserted++;
      } catch (error) {
        console.error(`Failed to insert prompt: ${prompt.text.substring(0, 50)}...`, error);
      }
    }
    console.log(`  Inserted ${promptsInserted} prompts\n`);

    // Seed mood factors
    console.log(`Seeding ${moodFactors.length} mood factors...`);
    let factorsInserted = 0;

    for (const factor of moodFactors) {
      try {
        await sql`
          INSERT INTO mood_factors (id, name, category, icon)
          VALUES (
            ${factor.id},
            ${factor.name},
            ${factor.category || null},
            ${factor.icon || null}
          )
          ON CONFLICT (id) DO NOTHING
        `;
        factorsInserted++;
      } catch (error) {
        console.error(`Failed to insert mood factor: ${factor.name}`, error);
      }
    }
    console.log(`  Inserted ${factorsInserted} mood factors\n`);

    console.log('Database seeding completed successfully!');
    console.log(`Summary:`);
    console.log(`  - Quotes: ${quotesInserted}/${quotes.length}`);
    console.log(`  - Prompts: ${promptsInserted}/${prompts.length}`);
    console.log(`  - Mood Factors: ${factorsInserted}/${moodFactors.length}`);

  } catch (error) {
    console.error('Database seeding failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

seedDatabase();
