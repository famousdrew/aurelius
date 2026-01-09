import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Get the project root (handle both running from root and from server/)
function getProjectRoot(): string {
  const cwd = process.cwd();
  // If we're in the server directory, go up one level
  if (cwd.endsWith('/server') || cwd.endsWith('\\server')) {
    return join(cwd, '..');
  }
  return cwd;
}

// Roman numerals for parsing
const ROMAN_NUMERALS = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
  'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX',
  'XXXI', 'XXXII', 'XXXIII', 'XXXIV', 'XXXV', 'XXXVI', 'XXXVII', 'XXXVIII', 'XXXIX', 'XL',
  'XLI', 'XLII', 'XLIII', 'XLIV', 'XLV', 'XLVI', 'XLVII', 'XLVIII', 'XLIX', 'L', 'LI'
];

const BOOK_NAMES = [
  'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH',
  'SEVENTH', 'EIGHTH', 'NINTH', 'TENTH', 'ELEVENTH', 'TWELFTH'
];

// Parse the Enchiridion text file and extract chapters
function parseEnchiridion(): { chapter: number; romanNumeral: string; content: string }[] {
  const filePath = join(getProjectRoot(), 'Enchiridion.txt');
  if (!existsSync(filePath)) {
    console.warn('Enchiridion.txt not found, skipping...');
    return [];
  }
  const text = readFileSync(filePath, 'utf-8');

  const lines = text.split('\n');
  const chapters: { chapter: number; romanNumeral: string; content: string }[] = [];

  let currentChapter = -1;
  let currentContent: string[] = [];
  let inEnchiridion = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Start capturing after "THE ENCHIRIDION" header
    if (line === 'THE ENCHIRIDION' && !inEnchiridion) {
      inEnchiridion = true;
      continue;
    }

    // Stop at footnotes
    if (line === 'Footnotes') {
      if (currentChapter >= 0 && currentContent.length > 0) {
        chapters.push({
          chapter: currentChapter + 1,
          romanNumeral: ROMAN_NUMERALS[currentChapter],
          content: currentContent.join('\n').trim()
        });
      }
      break;
    }

    if (!inEnchiridion) continue;

    // Check if this line is a chapter header
    const cleanLine = line.replace(/\[\d+\]/g, '').trim();
    const chapterIndex = ROMAN_NUMERALS.indexOf(cleanLine);
    if (chapterIndex !== -1 && cleanLine === ROMAN_NUMERALS[chapterIndex]) {
      if (currentChapter >= 0 && currentContent.length > 0) {
        chapters.push({
          chapter: currentChapter + 1,
          romanNumeral: ROMAN_NUMERALS[currentChapter],
          content: currentContent.join('\n').trim()
        });
      }
      currentChapter = chapterIndex;
      currentContent = [];
    } else if (currentChapter >= 0) {
      currentContent.push(lines[i]);
    }
  }

  return chapters;
}

// Parse Meditations and extract passages by book
function parseMeditations(): { book: number; passage: number; romanNumeral: string; content: string }[] {
  const filePath = join(getProjectRoot(), 'meditations.txt');
  if (!existsSync(filePath)) {
    console.warn('meditations.txt not found, skipping...');
    return [];
  }
  const text = readFileSync(filePath, 'utf-8');

  const lines = text.split('\n');
  const passages: { book: number; passage: number; romanNumeral: string; content: string }[] = [];

  let currentBook = 0;
  let currentPassage = -1;
  let currentContent: string[] = [];
  let inMeditations = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for book headers like "THE FIRST BOOK"
    const bookMatch = line.match(/^THE (FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH) BOOK$/);
    if (bookMatch) {
      // Save previous passage if exists
      if (currentPassage >= 0 && currentContent.length > 0) {
        passages.push({
          book: currentBook,
          passage: currentPassage + 1,
          romanNumeral: ROMAN_NUMERALS[currentPassage],
          content: currentContent.join('\n').trim()
        });
      }
      currentBook = BOOK_NAMES.indexOf(bookMatch[1]) + 1;
      currentPassage = -1;
      currentContent = [];
      inMeditations = true;
      continue;
    }

    // Stop at appendix/glossary/end markers (but only after we've started parsing)
    if (inMeditations && currentBook > 0 && (line === 'APPENDIX' || line === 'GLOSSARY' || line.includes('*** END OF'))) {
      if (currentPassage >= 0 && currentContent.length > 0) {
        passages.push({
          book: currentBook,
          passage: currentPassage + 1,
          romanNumeral: ROMAN_NUMERALS[currentPassage],
          content: currentContent.join('\n').trim()
        });
      }
      break;
    }

    if (!inMeditations) continue;

    // Check for passage headers like "I.", "II.", "III." at start of line
    const passageMatch = line.match(/^([IVXL]+)\.\s/);
    if (passageMatch) {
      const romanNum = passageMatch[1];
      const passageIndex = ROMAN_NUMERALS.indexOf(romanNum);

      if (passageIndex !== -1) {
        // Save previous passage
        if (currentPassage >= 0 && currentContent.length > 0) {
          passages.push({
            book: currentBook,
            passage: currentPassage + 1,
            romanNumeral: ROMAN_NUMERALS[currentPassage],
            content: currentContent.join('\n').trim()
          });
        }
        currentPassage = passageIndex;
        // Start content with the rest of this line (after "I. ")
        const restOfLine = line.substring(passageMatch[0].length);
        currentContent = restOfLine ? [restOfLine] : [];
        continue;
      }
    }

    // Add line to current passage content
    if (currentPassage >= 0) {
      currentContent.push(lines[i]);
    }
  }

  return passages;
}

// Generate unique IDs
function generateId(prefix: string, index: number): string {
  return `${prefix}-${String(index).padStart(3, '0')}`;
}

// Export the curriculum data for both texts
export function getCurriculumData() {
  const enchiridionChapters = parseEnchiridion();
  const meditationsPassages = parseMeditations();

  // Phases
  const phases = [
    {
      id: 'phase-001',
      name: 'foundation',
      title: 'Phase 1: Foundation',
      description: 'Begin your Stoic journey with the Enchiridion, a practical manual of Stoic ethical advice compiled by Arrian from the teachings of Epictetus.',
      orderIndex: 1,
      estimatedWeeks: 8,
      isOngoing: false
    },
    {
      id: 'phase-002',
      name: 'meditations',
      title: 'Phase 2: Meditations',
      description: 'Deepen your practice with the personal writings of Marcus Aurelius, Roman Emperor and Stoic philosopher. These private reflections show Stoicism applied to the challenges of leadership and daily life.',
      orderIndex: 2,
      estimatedWeeks: 16,
      isOngoing: false
    }
  ];

  // Texts
  const texts = [
    {
      id: 'text-001',
      phaseId: 'phase-001',
      title: 'Enchiridion',
      author: 'Epictetus',
      description: 'The Enchiridion, or "Handbook," is a short manual of Stoic ethical advice compiled by Arrian, a student of Epictetus. It summarizes the practical philosophy of Epictetus, focusing on what is within our control and what is not.',
      orderIndex: 1,
      totalPassages: enchiridionChapters.length
    },
    {
      id: 'text-002',
      phaseId: 'phase-002',
      title: 'Meditations',
      author: 'Marcus Aurelius',
      description: 'The Meditations is a series of personal writings by Marcus Aurelius, Roman Emperor 161-180 CE. Written as a source for his own guidance and self-improvement, it offers profound insights into Stoic philosophy applied to the challenges of power, duty, and mortality.',
      orderIndex: 2,
      totalPassages: meditationsPassages.length
    }
  ];

  // Passages - Enchiridion (IDs 001-051)
  const enchiridionPassageData = enchiridionChapters.map((chapter, index) => ({
    id: generateId('passage', index + 1),
    textId: 'text-001',
    sessionNumber: index + 1,
    passageNumber: 1,
    reference: `Chapter ${chapter.romanNumeral}`,
    content: chapter.content,
    translation: 'Thomas Wentworth Higginson translation (1865)',
    orderIndex: index + 1
  }));

  // Passages - Meditations (IDs 052+)
  const meditationsPassageData = meditationsPassages.map((passage, index) => ({
    id: generateId('passage', enchiridionChapters.length + index + 1),
    textId: 'text-002',
    sessionNumber: passage.book,
    passageNumber: passage.passage,
    reference: `Book ${passage.book}, Passage ${passage.romanNumeral}`,
    content: passage.content,
    translation: 'George Long translation',
    orderIndex: enchiridionChapters.length + index + 1
  }));

  const passages = [...enchiridionPassageData, ...meditationsPassageData];

  return { phases, texts, passages };
}
