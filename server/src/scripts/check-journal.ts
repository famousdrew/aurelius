import { db, readingJournal } from '../db/index.js';

async function main() {
  const entries = await db.select().from(readingJournal);
  console.log('Journal entries found:', entries.length);
  entries.forEach(e => {
    console.log('---');
    console.log('Passage:', e.passageId);
    console.log('Reflection:', e.reflection || '(empty)');
    console.log('Personal Connection:', e.personalConnection || '(empty)');
    console.log('Favorite Quote:', e.favoriteQuote || '(empty)');
    console.log('Practice:', e.practiceCommitment || '(empty)');
  });
  process.exit(0);
}

main().catch(console.error);
