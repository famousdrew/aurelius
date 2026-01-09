import postgres from 'postgres';
import { quotes } from './seed-quotes.js';
import { prompts } from './seed-prompts.js';
import { moodFactors } from './seed-mood-factors.js';
import { getCurriculumData } from './seed-curriculum.js';
import { getSenecaData } from './seed-seneca.js';

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

    // Seed curriculum
    console.log('Seeding curriculum data...');
    let curriculumInserted = { phases: 0, texts: 0, passages: 0 };

    try {
      const curriculum = getCurriculumData();

      // Insert phases
      for (const phase of curriculum.phases) {
        await sql`
          INSERT INTO curriculum_phases (id, name, title, description, order_index, estimated_weeks, is_ongoing)
          VALUES (
            ${phase.id},
            ${phase.name},
            ${phase.title},
            ${phase.description},
            ${phase.orderIndex},
            ${phase.estimatedWeeks},
            ${phase.isOngoing}
          )
          ON CONFLICT (id) DO NOTHING
        `;
        curriculumInserted.phases++;
      }
      console.log(`  Inserted ${curriculumInserted.phases} curriculum phases`);

      // Insert texts
      for (const text of curriculum.texts) {
        await sql`
          INSERT INTO curriculum_texts (id, phase_id, title, author, description, order_index, total_passages)
          VALUES (
            ${text.id},
            ${text.phaseId},
            ${text.title},
            ${text.author},
            ${text.description},
            ${text.orderIndex},
            ${text.totalPassages}
          )
          ON CONFLICT (id) DO NOTHING
        `;
        curriculumInserted.texts++;
        console.log(`  Inserted text: ${text.title} (${text.totalPassages} passages)`);
      }

      // Insert passages
      console.log(`  Inserting ${curriculum.passages.length} passages...`);
      for (const passage of curriculum.passages) {
        try {
          await sql`
            INSERT INTO curriculum_passages (id, text_id, session_number, passage_number, reference, content, translation, order_index)
            VALUES (
              ${passage.id},
              ${passage.textId},
              ${passage.sessionNumber},
              ${passage.passageNumber},
              ${passage.reference},
              ${passage.content},
              ${passage.translation},
              ${passage.orderIndex}
            )
            ON CONFLICT (id) DO NOTHING
          `;
          curriculumInserted.passages++;
        } catch (error) {
          console.error(`  Failed to insert passage ${passage.reference}:`, error);
        }
      }
      console.log(`  Inserted ${curriculumInserted.passages} passages\n`);
    } catch (error) {
      console.error('Failed to seed curriculum:', error);
    }

    // Seed Seneca's Letters
    console.log('Seeding Seneca\'s Letters...');
    let senecaInserted = { phases: 0, texts: 0, passages: 0 };

    try {
      const seneca = getSenecaData();

      // Insert phase
      await sql`
        INSERT INTO curriculum_phases (id, name, title, description, order_index, estimated_weeks, is_ongoing)
        VALUES (
          ${seneca.phase.id},
          ${seneca.phase.name},
          ${seneca.phase.title},
          ${seneca.phase.description},
          ${seneca.phase.orderIndex},
          ${seneca.phase.estimatedWeeks},
          ${seneca.phase.isOngoing}
        )
        ON CONFLICT (id) DO NOTHING
      `;
      senecaInserted.phases = 1;
      console.log(`  Inserted Seneca phase: ${seneca.phase.title}`);

      // Insert text
      await sql`
        INSERT INTO curriculum_texts (id, phase_id, title, author, description, order_index, total_passages)
        VALUES (
          ${seneca.text.id},
          ${seneca.text.phaseId},
          ${seneca.text.title},
          ${seneca.text.author},
          ${seneca.text.description},
          ${seneca.text.orderIndex},
          ${seneca.text.totalPassages}
        )
        ON CONFLICT (id) DO NOTHING
      `;
      senecaInserted.texts = 1;
      console.log(`  Inserted text: ${seneca.text.title} (${seneca.letterCount} letters)`);

      // Insert passages
      console.log(`  Inserting ${seneca.passages.length} letters...`);
      for (const passage of seneca.passages) {
        try {
          await sql`
            INSERT INTO curriculum_passages (id, text_id, session_number, passage_number, reference, content, translation, order_index)
            VALUES (
              ${passage.id},
              ${passage.textId},
              ${passage.sessionNumber},
              ${passage.passageNumber},
              ${passage.reference},
              ${passage.content},
              ${passage.translation},
              ${passage.orderIndex}
            )
            ON CONFLICT (id) DO NOTHING
          `;
          senecaInserted.passages++;
        } catch (error) {
          console.error(`  Failed to insert ${passage.reference}:`, error);
        }
      }
      console.log(`  Inserted ${senecaInserted.passages} letters\n`);
    } catch (error) {
      console.error('Failed to seed Seneca:', error);
    }

    console.log('Database seeding completed successfully!');
    console.log(`Summary:`);
    console.log(`  - Quotes: ${quotesInserted}/${quotes.length}`);
    console.log(`  - Prompts: ${promptsInserted}/${prompts.length}`);
    console.log(`  - Mood Factors: ${factorsInserted}/${moodFactors.length}`);
    console.log(`  - Curriculum: ${curriculumInserted.phases} phases, ${curriculumInserted.texts} texts, ${curriculumInserted.passages} passages`);
    console.log(`  - Seneca: ${senecaInserted.phases} phase, ${senecaInserted.texts} text, ${senecaInserted.passages} letters`);

  } catch (error) {
    console.error('Database seeding failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

seedDatabase();
