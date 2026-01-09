import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface Letter {
  number: string;
  romanNumeral: string;
  content: string;
}

// Convert Roman numeral to Arabic number for sorting
function romanToArabic(roman: string): number {
  const values: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  let result = 0;
  for (let i = 0; i < roman.length; i++) {
    const current = values[roman[i]];
    const next = values[roman[i + 1]];
    if (next && current < next) {
      result -= current;
    } else {
      result += current;
    }
  }
  return result;
}

// Strip HTML tags and clean text
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .trim();
}

// Parse Seneca's Letters from the epub HTML files
function parseSenecaLetters(): Letter[] {
  const epubDir = join(process.cwd(), '..', 'seneca_epub', 'EPUB');

  // Get all page files and sort numerically
  const pageFiles = readdirSync(epubDir)
    .filter(f => f.startsWith('page_') && f.endsWith('.html'))
    .sort((a, b) => {
      const numA = parseInt(a.replace('page_', '').replace('.html', ''));
      const numB = parseInt(b.replace('page_', '').replace('.html', ''));
      return numA - numB;
    });

  const letterPattern = /LETTER ([IVXLC]+)/;
  const letters: Map<string, string[]> = new Map();
  let currentLetter: string | null = null;
  let inLettersSection = false;

  for (const file of pageFiles) {
    const content = readFileSync(join(epubDir, file), 'utf-8');
    let text = stripHtml(content);

    // Remove page title prefix (e.g., "Page 31 ")
    text = text.replace(/^Page \d+\s*/, '');

    // Check if we've reached the LETTERS section
    if (text === 'LETTERS') {
      inLettersSection = true;
      continue;
    }

    // Skip pages before the letters section starts
    if (!inLettersSection) continue;

    // Stop at notes/appendix section (if it exists)
    if (text.startsWith('NOTES') || text.startsWith('APPENDIX')) break;

    // Check for a new letter
    const match = text.match(letterPattern);
    if (match) {
      currentLetter = match[1];
      if (!letters.has(currentLetter)) {
        letters.set(currentLetter, []);
      }
    }

    // Add content to current letter
    if (currentLetter && text.length > 10) {
      letters.get(currentLetter)!.push(text);
    }
  }

  // Convert to sorted array
  const result: Letter[] = [];
  for (const [numeral, pages] of letters) {
    // Clean up the content - remove the letter header from first page
    let fullContent = pages.join('\n\n');
    // Remove the "LETTER XX" header that appears at start
    fullContent = fullContent.replace(new RegExp(`^.*?LETTER ${numeral}\\s*`), '').trim();
    // Also remove page numbers that appear at the end of text
    fullContent = fullContent.replace(/\s+\d+$/gm, '').trim();

    result.push({
      number: String(romanToArabic(numeral)),
      romanNumeral: numeral,
      content: fullContent
    });
  }

  // Sort by letter number
  result.sort((a, b) => parseInt(a.number) - parseInt(b.number));

  return result;
}

// Generate unique IDs
function generateId(prefix: string, index: number): string {
  return `${prefix}-${String(index).padStart(3, '0')}`;
}

// Export the Seneca curriculum data
export function getSenecaData() {
  const letters = parseSenecaLetters();

  // Phase 3: Letters (Seneca) - assuming Phase 2 is Meditations
  const phase = {
    id: 'phase-003',
    name: 'letters',
    title: 'Phase 3: Letters from a Stoic',
    description: 'Study Seneca\'s Letters to Lucilius, a collection of 124 moral epistles addressing practical Stoic philosophy and the art of living.',
    orderIndex: 3,
    estimatedWeeks: 16,
    isOngoing: false
  };

  // Seneca's Letters text
  const text = {
    id: 'text-003',
    phaseId: 'phase-003',
    title: 'Letters from a Stoic',
    author: 'Seneca',
    description: 'The Epistulae Morales ad Lucilium (Moral Letters to Lucilius) are a collection of letters written by Seneca the Younger at the end of his life, addressed to Lucilius Junior, the procurator of Sicily. The letters cover topics such as friendship, death, virtue, wealth, and the proper way to live.',
    orderIndex: 1,
    totalPassages: letters.length
  };

  // Create passages from letters - offset by existing passages (51 Enchiridion + 12 Meditations = 63)
  // Using 200 as base to leave room for other texts
  const passages = letters.map((letter, index) => ({
    id: generateId('passage', 200 + index + 1),
    textId: 'text-003',
    sessionNumber: index + 1,
    passageNumber: 1,
    reference: `Letter ${letter.romanNumeral}`,
    content: letter.content,
    translation: 'Robin Campbell translation (Penguin Classics)',
    orderIndex: 200 + index + 1
  }));

  return { phase, text, passages, letterCount: letters.length };
}
