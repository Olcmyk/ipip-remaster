import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHIVE_PATH = path.join(__dirname, '../public/archive/ipip-mirror/ipip.ori.org');
const ITEMS_PATH = path.join(__dirname, '../public/data/items.json');
const TRANSLATIONS_OUTPUT_DIR = path.join(__dirname, '../public/data/translations');

// Load the master item list
const masterItems = JSON.parse(fs.readFileSync(ITEMS_PATH, 'utf-8'));
const itemTextToId = new Map();
masterItems.forEach(item => {
  itemTextToId.set(item.text.toLowerCase().trim(), item.id);
});

/**
 * Language code mapping
 */
const LANGUAGE_MAPPINGS = {
  'Arabic': 'ar',
  'Armenian': 'hy',
  'Chinese': 'zh',
  'Croatian': 'hr',
  'Danish': 'da',
  'Dutch': 'nl',
  'Estonian': 'et',
  'Farsi': 'fa',
  'French': 'fr',
  'German': 'de',
  'Hebrew': 'he',
  'Hungarian': 'hu',
  'Icelandic': 'is',
  'Indonesian': 'id',
  'Italian': 'it',
  'Japanese': 'ja',
  'Korean': 'ko',
  'Latvian': 'lv',
  'Macedonian': 'mk',
  'Mexican': 'es-MX',
  'Norwegian': 'no',
  'Portuguese': 'pt',
  'Russian': 'ru',
  'Serbian': 'sr',
  'Slovene': 'sl',
  'Spanish': 'es',
  'Thai': 'th',
  'Turkish': 'tr',
  'Urdu': 'ur',
  'Vietnamese': 'vi'
};

/**
 * Simple similarity function
 */
function similarity(s1, s2) {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

/**
 * Match English text to item ID
 */
function matchItemToId(englishText) {
  const normalized = englishText.toLowerCase().trim();

  if (itemTextToId.has(normalized)) {
    return itemTextToId.get(normalized);
  }

  // Fuzzy match
  let bestMatch = null;
  let bestScore = 0;

  for (const [text, id] of itemTextToId.entries()) {
    const score = similarity(normalized, text);
    if (score > bestScore && score > 0.85) {
      bestScore = score;
      bestMatch = id;
    }
  }

  return bestMatch;
}

/**
 * Parse a translation file
 */
function parseTranslationFile(filename) {
  const filePath = path.join(ARCHIVE_PATH, filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filename}`);
    return null;
  }

  console.log(`Parsing ${filename}...`);
  const html = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(html);

  // Extract language name from filename or title
  let languageName = '';
  const titleMatch = filename.match(/new([A-Za-z]+)IPIP/i);
  if (titleMatch) {
    languageName = titleMatch[1];
  }

  // Try to get language from page title
  const pageTitle = $('title').text();
  for (const [lang, code] of Object.entries(LANGUAGE_MAPPINGS)) {
    if (pageTitle.includes(lang) || filename.toLowerCase().includes(lang.toLowerCase())) {
      languageName = lang;
      break;
    }
  }

  const languageCode = LANGUAGE_MAPPINGS[languageName] || languageName.toLowerCase().substring(0, 2);

  const translations = {};
  let translationCount = 0;

  // Look for tables with English and translated text
  $('table').each((i, table) => {
    $(table).find('tr').each((j, row) => {
      const cells = $(row).find('td');

      if (cells.length >= 2) {
        const firstCell = $(cells[0]).text().trim();
        const secondCell = $(cells[1]).text().trim();

        // Try both orders: English-Translation and Translation-English
        let englishText = '';
        let translatedText = '';

        // Check if first cell looks like English (has common English words)
        const englishIndicators = ['the', 'a', 'an', 'is', 'are', 'to', 'of', 'and', 'in', 'my', 'I'];
        const firstIsEnglish = englishIndicators.some(word =>
          firstCell.toLowerCase().includes(` ${word} `) ||
          firstCell.toLowerCase().startsWith(`${word} `)
        );

        if (firstIsEnglish && secondCell.length > 0) {
          englishText = firstCell;
          translatedText = secondCell;
        } else if (firstCell.length > 0 && secondCell.length > 0) {
          // Assume second cell is English
          englishText = secondCell;
          translatedText = firstCell;
        }

        if (englishText && translatedText && englishText !== translatedText) {
          const itemId = matchItemToId(englishText);
          if (itemId) {
            translations[itemId] = translatedText;
            translationCount++;
          }
        }
      }
    });
  });

  console.log(`  Found ${translationCount} translations for ${languageName} (${languageCode})`);

  return {
    languageCode,
    languageName,
    translations,
    sourceFile: filename,
    coverage: (translationCount / masterItems.length * 100).toFixed(1)
  };
}

/**
 * Get all translation files
 */
function getTranslationFiles() {
  const files = fs.readdirSync(ARCHIVE_PATH);
  // Look for files with language names
  return files.filter(f => {
    const lower = f.toLowerCase();
    return (lower.includes('ipip') || lower.includes('translation')) &&
           (lower.endsWith('.htm') || lower.endsWith('.html')) &&
           !lower.includes('key') &&
           Object.keys(LANGUAGE_MAPPINGS).some(lang =>
             lower.includes(lang.toLowerCase())
           );
  });
}

/**
 * Main execution
 */
function main() {
  console.log('Starting translation extraction...\n');

  try {
    // Ensure output directory exists
    if (!fs.existsSync(TRANSLATIONS_OUTPUT_DIR)) {
      fs.mkdirSync(TRANSLATIONS_OUTPUT_DIR, { recursive: true });
    }

    const translationFiles = getTranslationFiles();
    console.log(`Found ${translationFiles.length} translation files\n`);

    const allTranslations = [];

    translationFiles.forEach(filename => {
      const result = parseTranslationFile(filename);
      if (result && Object.keys(result.translations).length > 0) {
        allTranslations.push(result);

        // Write individual language file
        const outputPath = path.join(TRANSLATIONS_OUTPUT_DIR, `${result.languageCode}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log(`  ✓ Wrote ${result.languageCode}.json (${result.coverage}% coverage)`);
      }
    });

    // Create index file
    const indexPath = path.join(TRANSLATIONS_OUTPUT_DIR, 'index.json');
    const index = allTranslations.map(t => ({
      languageCode: t.languageCode,
      languageName: t.languageName,
      coverage: parseFloat(t.coverage),
      itemCount: Object.keys(t.translations).length,
      sourceFile: t.sourceFile
    }));

    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

    console.log(`\n✓ Successfully processed ${allTranslations.length} languages`);
    console.log(`✓ Translation index written to ${indexPath}`);

  } catch (error) {
    console.error('Error parsing translations:', error);
    process.exit(1);
  }
}

main();
