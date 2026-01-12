import { readFileSync } from 'fs';
import { join } from 'path';
import { db, curriculumPassages, curriculumTexts } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

// Get the script directory
function getScriptDir(): string {
  const cwd = process.cwd();
  if (cwd.endsWith('/server') || cwd.endsWith('\\server')) {
    return cwd;
  }
  return join(cwd, 'server');
}

interface Chapter {
  chapter: number;
  reference: string;
  content: string;
}

interface ModernEnchiridion {
  translation: string;
  source: string;
  chapters: Chapter[];
}

async function main() {
  console.log('Updating Enchiridion with Modern Translations');
  console.log('=============================================\n');

  // Load the modern translations
  const dataPath = join(getScriptDir(), 'src', 'data', 'enchiridion-modern.json');
  console.log(`Loading modern translations from: ${dataPath}`);

  const data: ModernEnchiridion = JSON.parse(readFileSync(dataPath, 'utf-8'));
  console.log(`Loaded ${data.chapters.length} chapters\n`);
  console.log(`Translation: ${data.translation}\n`);

  // Update the text record to reflect the new translation
  await db
    .update(curriculumTexts)
    .set({ description: data.translation })
    .where(eq(curriculumTexts.id, 'text-001'));
  console.log('Updated curriculum text description\n');

  // Update each passage
  let updateCount = 0;
  let errorCount = 0;

  for (const chapter of data.chapters) {
    const passageId = `passage-${String(chapter.chapter).padStart(3, '0')}`;

    try {
      const result = await db
        .update(curriculumPassages)
        .set({
          content: chapter.content,
          translation: data.translation
        })
        .where(
          and(
            eq(curriculumPassages.id, passageId),
            eq(curriculumPassages.textId, 'text-001')
          )
        );

      console.log(`[${chapter.chapter}/51] Updated ${chapter.reference}`);
      updateCount++;
    } catch (error) {
      console.error(`Error updating ${passageId}:`, error);
      errorCount++;
    }
  }

  console.log('\n=============================================');
  console.log('Update Complete!');
  console.log(`  Updated: ${updateCount}`);
  console.log(`  Errors:  ${errorCount}`);

  process.exit(errorCount > 0 ? 1 : 0);
}

main().catch(console.error);
