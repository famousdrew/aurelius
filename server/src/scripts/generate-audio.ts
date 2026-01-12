import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { db, curriculumPassages } from '../db/index.js';
import { eq, asc } from 'drizzle-orm';

// ElevenLabs configuration
const ELEVENLABS_API_KEY = 'sk_49e24f577d6281640fb4474918b416bdba82b65bf368e7e8';
const VOICE_ID = 'UmQN7jS1Ee8B1czsUtQh';
const MODEL_ID = 'eleven_multilingual_v2';

// Get output directory
function getOutputDir(): string {
  const cwd = process.cwd();
  if (cwd.endsWith('/server') || cwd.endsWith('\\server')) {
    return join(cwd, 'public', 'audio');
  }
  return join(cwd, 'server', 'public', 'audio');
}

// Generate audio for a single passage
async function generateAudio(text: string, passageId: string, outputDir: string): Promise<boolean> {
  const outputPath = join(outputDir, `${passageId}.mp3`);

  // Skip if already exists
  if (existsSync(outputPath)) {
    console.log(`  Skipping ${passageId} - already exists`);
    return true;
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`  Error for ${passageId}: ${response.status} - ${errorText}`);
      return false;
    }

    const audioBuffer = await response.arrayBuffer();
    writeFileSync(outputPath, Buffer.from(audioBuffer));
    console.log(`  Generated ${passageId}.mp3 (${Math.round(audioBuffer.byteLength / 1024)} KB)`);
    return true;
  } catch (error) {
    console.error(`  Error generating ${passageId}:`, error);
    return false;
  }
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Audio Generation Script for Enchiridion');
  console.log('========================================\n');

  const outputDir = getOutputDir();

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}\n`);
  }

  // Fetch all Enchiridion passages (text-001)
  console.log('Fetching Enchiridion passages from database...');
  const passages = await db
    .select()
    .from(curriculumPassages)
    .where(eq(curriculumPassages.textId, 'text-001'))
    .orderBy(asc(curriculumPassages.orderIndex));

  console.log(`Found ${passages.length} passages\n`);

  if (passages.length === 0) {
    console.log('No passages found. Make sure the curriculum has been seeded.');
    process.exit(1);
  }

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < passages.length; i++) {
    const passage = passages[i];
    console.log(`[${i + 1}/${passages.length}] Processing ${passage.reference || passage.id}...`);

    const outputPath = join(outputDir, `${passage.id}.mp3`);
    if (existsSync(outputPath)) {
      skipCount++;
      console.log(`  Skipping - already exists`);
    } else {
      const success = await generateAudio(passage.content, passage.id, outputDir);
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }

      // Rate limit: wait between requests (except for last one)
      if (i < passages.length - 1) {
        await sleep(500);
      }
    }
  }

  console.log('\n========================================');
  console.log('Generation Complete!');
  console.log(`  Generated: ${successCount}`);
  console.log(`  Skipped:   ${skipCount}`);
  console.log(`  Errors:    ${errorCount}`);
  console.log(`  Total:     ${passages.length}`);
  console.log(`\nAudio files saved to: ${outputDir}`);

  process.exit(errorCount > 0 ? 1 : 0);
}

main().catch(console.error);
