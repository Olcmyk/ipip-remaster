import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHIVE_PATH = path.join(__dirname, '../public/archive/ipip-mirror/ipip.ori.org');
const ITEMS_PATH = path.join(__dirname, '../public/data/items.json');
const SCALES_PATH = path.join(__dirname, '../public/data/scales.json');
const BATTERIES_PATH = path.join(__dirname, '../public/data/test-batteries.json');
const TRANSLATIONS_OUTPUT_DIR = path.join(__dirname, '../public/data/translations');

// Load master data
const masterItems = JSON.parse(fs.readFileSync(ITEMS_PATH, 'utf-8'));
const scales = JSON.parse(fs.readFileSync(SCALES_PATH, 'utf-8'));
const batteries = JSON.parse(fs.readFileSync(BATTERIES_PATH, 'utf-8'));

// Create lookup maps
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
 * Map translation filename to test battery ID
 */
function mapFilenameToBattery(filename) {
  const lower = filename.toLowerCase();

  // NEO variants
  if (lower.includes('neofacets') || lower.includes('neo-300')) {
    return 'neofacets';
  }
  if (lower.includes('neodomains') || lower.includes('neo-120') || lower.includes('neo-pi-r-domains')) {
    return 'neodomains';
  }
  if (lower.includes('neo') && !lower.includes('facets') && !lower.includes('domains')) {
    return 'neo';
  }

  // Big Five variants
  if (lower.includes('bigfive') || lower.includes('big-five') || lower.includes('bfm') || lower.includes('bffm')) {
    if (lower.includes('100')) return 'bigfive5broad'; // Assuming 100-item maps to broad
    if (lower.includes('50')) return 'bigfive5broad';
    if (lower.includes('25')) return 'bigfive5broad';
    return 'bigfive5broad';
  }

  // Other tests
  if (lower.includes('hexaco')) return 'hexaco-pi-';
  if (lower.includes('mpq')) return 'mpq';
  if (lower.includes('via')) return 'via';
  if (lower.includes('ab5c')) return '7factor'; // AB5C is related to 7-factor
  if (lower.includes('orvis')) return 'singleconstructs';
  if (lower.includes('ipc')) return 'singleconstructs';
  if (lower.includes('mini-ipip')) return 'singleconstructs';

  return null;
}

/**
 * Get items for a specific battery (to narrow matching scope)
 */
function getBatteryItems(batteryId) {
  const battery = batteries.find(b => b.id === batteryId);
  if (!battery) return new Set();

  const batteryScales = scales.filter(s => battery.scales.includes(s.id));
  const itemIds = new Set();

  batteryScales.forEach(scale => {
    scale.items.forEach(item => {
      itemIds.add(item.itemId);
    });
  });

  return itemIds;
}

/**
 * Similarity function
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
 * Match English text to item ID with optional scope restriction
 */
function matchItemToId(englishText, allowedItemIds = null) {
  const normalized = englishText.toLowerCase().trim();

  // Exact match first
  if (itemTextToId.has(normalized)) {
    const itemId = itemTextToId.get(normalized);
    if (!allowedItemIds || allowedItemIds.has(itemId)) {
      return itemId;
    }
  }

  // Fuzzy match
  let bestMatch = null;
  let bestScore = 0;

  for (const [text, id] of itemTextToId.entries()) {
    // Skip if not in allowed set
    if (allowedItemIds && !allowedItemIds.has(id)) {
      continue;
    }

    const score = similarity(normalized, text);
    if (score > bestScore && score > 0.85) {
      bestScore = score;
      bestMatch = id;
    }
  }

  return bestMatch;
}

/**
 * Extract language name from filename
 */
function extractLanguageName(filename) {
  for (const [lang, code] of Object.entries(LANGUAGE_MAPPINGS)) {
    if (filename.toLowerCase().startsWith(lang.toLowerCase())) {
      return lang;
    }
  }
  return null;
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

  console.log(`\nParsing ${filename}...`);
  const html = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(html);

  // Extract language name
  const languageName = extractLanguageName(filename);
  if (!languageName) {
    console.warn(`  Could not determine language from filename`);
    return null;
  }

  const languageCode = LANGUAGE_MAPPINGS[languageName];

  // Map to battery
  const batteryId = mapFilenameToBattery(filename);
  console.log(`  Language: ${languageName} (${languageCode})`);
  console.log(`  Mapped to battery: ${batteryId || 'UNKNOWN'}`);

  // Get allowed items for this battery
  const allowedItems = batteryId ? getBatteryItems(batteryId) : null;
  if (allowedItems) {
    console.log(`  Restricting matches to ${allowedItems.size} items in this battery`);
  }

  const translations = {};
  let translationCount = 0;

  // Look for tables with English and translated text
  $('table').each((i, table) => {
    $(table).find('tr').each((j, row) => {
      const cells = $(row).find('td');

      if (cells.length >= 2) {
        // Extract text from all cells
        const cellTexts = [];
        for (let k = 0; k < cells.length; k++) {
          cellTexts.push($(cells[k]).text().trim());
        }

        // Skip header rows
        if (cellTexts.some(text =>
          text.toLowerCase().includes('item number') ||
          text.toLowerCase().includes('original goldberg') ||
          text.toLowerCase().includes('arabic adoption')
        )) {
          return;
        }

        // Try to find English and translated text
        let englishText = '';
        let translatedText = '';

        // Check if first cell looks like English
        const englishIndicators = ['the', 'a', 'an', 'is', 'are', 'to', 'of', 'and', 'in', 'my', 'I'];

        // Strategy 1: 2-column format (English | Translation or Translation | English)
        if (cells.length === 2) {
          const firstIsEnglish = englishIndicators.some(word =>
            cellTexts[0].toLowerCase().includes(` ${word} `) ||
            cellTexts[0].toLowerCase().startsWith(`${word} `)
          );

          if (firstIsEnglish && cellTexts[1].length > 0) {
            englishText = cellTexts[0];
            translatedText = cellTexts[1];
          } else if (cellTexts[0].length > 0 && cellTexts[1].length > 0) {
            englishText = cellTexts[1];
            translatedText = cellTexts[0];
          }
        }
        // Strategy 2: Multi-column format - look for English in column 1 or 2, translation in other columns
        else if (cells.length >= 4) {
          // Check columns 1 and 2 for English text
          for (let col = 1; col <= 2 && col < cells.length; col++) {
            const isEnglish = englishIndicators.some(word =>
              cellTexts[col].toLowerCase().includes(` ${word} `) ||
              cellTexts[col].toLowerCase().startsWith(`${word} `)
            );

            if (isEnglish) {
              englishText = cellTexts[col];
              // Look for translation in other columns (skip first column which is usually item number)
              for (let transCol = 1; transCol < cells.length; transCol++) {
                if (transCol !== col && cellTexts[transCol].length > 5 &&
                    cellTexts[transCol] !== englishText &&
                    !cellTexts[transCol].match(/^[\d\+\-\(\)]+$/)) { // Skip score columns like "(1+)"
                  translatedText = cellTexts[transCol];
                  break;
                }
              }
              break;
            }
          }
        }

        if (englishText && translatedText && englishText !== translatedText) {
          const itemId = matchItemToId(englishText, allowedItems);
          if (itemId) {
            translations[itemId] = translatedText;
            translationCount++;
          }
        }
      }
    });
  });

  console.log(`  ✓ Found ${translationCount} translations`);

  if (translationCount === 0) {
    return null;
  }

  return {
    languageCode,
    languageName,
    batteryId,
    translations,
    sourceFile: filename,
    itemCount: translationCount
  };
}

/**
 * Get all translation files
 */
function getTranslationFiles() {
  const files = fs.readdirSync(ARCHIVE_PATH);
  return files.filter(f => {
    const lower = f.toLowerCase();
    return (lower.endsWith('.htm') || lower.endsWith('.html')) &&
           !lower.includes('key') &&
           Object.keys(LANGUAGE_MAPPINGS).some(lang =>
             lower.startsWith(lang.toLowerCase())
           );
  });
}

/**
 * Main execution
 */
function main() {
  console.log('Starting improved translation extraction...\n');
  console.log(`Loaded ${masterItems.length} items`);
  console.log(`Loaded ${scales.length} scales`);
  console.log(`Loaded ${batteries.length} test batteries\n`);

  try {
    // Ensure output directory exists
    if (!fs.existsSync(TRANSLATIONS_OUTPUT_DIR)) {
      fs.mkdirSync(TRANSLATIONS_OUTPUT_DIR, { recursive: true });
    }

    const translationFiles = getTranslationFiles();
    console.log(`Found ${translationFiles.length} translation files\n`);

    const allTranslations = [];
    const batteryTranslations = {}; // Group by battery

    translationFiles.forEach(filename => {
      const result = parseTranslationFile(filename);
      if (result && Object.keys(result.translations).length > 0) {
        allTranslations.push(result);

        // Group by battery
        if (result.batteryId) {
          if (!batteryTranslations[result.batteryId]) {
            batteryTranslations[result.batteryId] = [];
          }
          batteryTranslations[result.batteryId].push({
            languageCode: result.languageCode,
            languageName: result.languageName,
            itemCount: result.itemCount,
            sourceFile: result.sourceFile
          });
        }

        // Write individual language file
        const outputPath = path.join(TRANSLATIONS_OUTPUT_DIR, `${result.languageCode}-${result.batteryId || 'unknown'}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log(`  ✓ Wrote ${path.basename(outputPath)}`);
      }
    });

    // Create index file
    const indexPath = path.join(TRANSLATIONS_OUTPUT_DIR, 'index.json');
    const index = allTranslations.map(t => ({
      languageCode: t.languageCode,
      languageName: t.languageName,
      batteryId: t.batteryId,
      itemCount: t.itemCount,
      sourceFile: t.sourceFile
    }));
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

    // Create battery-translations mapping
    const batteryMapPath = path.join(TRANSLATIONS_OUTPUT_DIR, 'battery-translations.json');
    fs.writeFileSync(batteryMapPath, JSON.stringify(batteryTranslations, null, 2));

    console.log(`\n✓ Successfully processed ${allTranslations.length} translation files`);
    console.log(`✓ Translation index written to ${indexPath}`);
    console.log(`✓ Battery mapping written to ${batteryMapPath}`);

    // Print summary by battery
    console.log('\n=== Translations by Battery ===');
    for (const [batteryId, translations] of Object.entries(batteryTranslations)) {
      console.log(`\n${batteryId}:`);
      translations.forEach(t => {
        console.log(`  - ${t.languageName} (${t.languageCode}): ${t.itemCount} items`);
      });
    }

  } catch (error) {
    console.error('Error parsing translations:', error);
    process.exit(1);
  }
}

main();
