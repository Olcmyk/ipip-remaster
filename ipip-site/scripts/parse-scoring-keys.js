import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHIVE_PATH = path.join(__dirname, '../public/archive/ipip-mirror/ipip.ori.org');
const ITEMS_PATH = path.join(__dirname, '../public/data/items.json');
const SCALES_OUTPUT = path.join(__dirname, '../public/data/scales.json');
const BATTERIES_OUTPUT = path.join(__dirname, '../public/data/test-batteries.json');

// Load the master item list
const masterItems = JSON.parse(fs.readFileSync(ITEMS_PATH, 'utf-8'));
const itemTextToId = new Map();
masterItems.forEach(item => {
  itemTextToId.set(item.text.toLowerCase().trim(), item.id);
});

/**
 * Calculate similarity between two strings (simple Levenshtein-based)
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
 * Match item text to item ID from master list
 */
function matchItemToId(itemText) {
  const normalized = itemText.toLowerCase().trim();

  // Try exact match first
  if (itemTextToId.has(normalized)) {
    return itemTextToId.get(normalized);
  }

  // Try fuzzy match
  let bestMatch = null;
  let bestScore = 0;

  for (const [text, id] of itemTextToId.entries()) {
    const score = similarity(normalized, text);
    if (score > bestScore && score > 0.90) {
      bestScore = score;
      bestMatch = id;
    }
  }

  if (bestMatch) {
    console.warn(`Fuzzy matched (${(bestScore * 100).toFixed(1)}%): "${itemText}" → ${bestMatch}`);
    return bestMatch;
  }

  console.error(`No match found for: "${itemText}"`);
  return null;
}

/**
 * Parse a scoring key file
 */
function parseScoringKeyFile(filename) {
  const filePath = path.join(ARCHIVE_PATH, filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filename}`);
    return null;
  }

  console.log(`Parsing ${filename}...`);
  const html = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(html);

  const scales = [];
  let currentScale = null;

  // Extract instrument name from filename
  const instrumentMatch = filename.match(/new(.+?)Key\.htm/i);
  const instrumentName = instrumentMatch ? instrumentMatch[1] : filename.replace('.htm', '');

  // Look for scale sections - they're usually marked by headers or bold text
  $('*').each((i, elem) => {
    const tagName = elem.tagName.toLowerCase();
    const text = $(elem).text().trim();

    // Check if this is a scale header (h2, h3, b, strong, or specific patterns)
    if (['h2', 'h3', 'h4'].includes(tagName) ||
        (tagName === 'b' && text.length > 0 && text.length < 100)) {

      // Extract alpha reliability if present
      const alphaMatch = text.match(/alpha\s*=\s*([\d.]+)/i);
      const alpha = alphaMatch ? parseFloat(alphaMatch[1]) : null;

      // Clean scale name - prefer parenthetical content for factor names
      let scaleName = text;
      const factorMatch = text.match(/Factor\s+([IVX]+|[A-Z]\d+)\s*(?:\(([^)]+)\))?/i);
      if (factorMatch && factorMatch[2]) {
        // Use the parenthetical name for factors (e.g., "Agreeableness" from "Factor II (Agreeableness)")
        scaleName = factorMatch[2].trim();
      } else {
        // For non-factor scales, remove parenthetical content
        scaleName = text.replace(/\(.*?\)/g, '').trim();
      }

      if (scaleName.length > 0 && scaleName.length < 100) {
        currentScale = {
          id: `${instrumentName.toLowerCase()}-${scaleName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          name: scaleName,
          instrument: instrumentName,
          alpha: alpha,
          items: []
        };
      }
    }

    // Look for tables with items
    if (tagName === 'table' && currentScale) {
      let currentKeying = null;

      $(elem).find('tr').each((j, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 2) {
          const firstCell = $(cells[0]).text().trim();
          const secondCell = $(cells[1]).text().trim();

          // Check if first cell contains keying indicator
          if (firstCell.includes('+ keyed') || firstCell.includes('+keyed') || firstCell === '+') {
            currentKeying = 1;
            // If second cell has item text, use it
            if (secondCell.length > 5 && !secondCell.includes('Alpha')) {
              const itemId = matchItemToId(secondCell);
              if (itemId) {
                currentScale.items.push({ itemId, keying: 1 });
              }
            }
          } else if (firstCell.includes('− keyed') || firstCell.includes('−keyed') ||
                     firstCell.includes('- keyed') || firstCell.includes('-keyed') ||
                     firstCell === '−' || firstCell === '–' || firstCell === '-') {
            currentKeying = -1;
            // If second cell has item text, use it
            if (secondCell.length > 5 && !secondCell.includes('Alpha')) {
              const itemId = matchItemToId(secondCell);
              if (itemId) {
                currentScale.items.push({ itemId, keying: -1 });
              }
            }
          } else if (currentKeying !== null && secondCell.length > 5 &&
                     !secondCell.includes('Alpha') && !secondCell.includes('scale')) {
            // This row inherits keying from previous row
            const itemId = matchItemToId(secondCell);
            if (itemId) {
              currentScale.items.push({ itemId, keying: currentKeying });
            }
          }
        }
      });

      // If we found items, save this scale
      if (currentScale.items.length > 0) {
        scales.push(currentScale);
        currentScale = null;
      }
    }
  });

  return { filename, instrumentName, scales };
}

/**
 * Get all scoring key files
 */
function getScoringKeyFiles() {
  const files = fs.readdirSync(ARCHIVE_PATH);
  return files.filter(f => f.match(/new.*Key\.htm$/i));
}

/**
 * Main execution
 */
function main() {
  console.log('Starting scoring key extraction...\n');

  try {
    const keyFiles = getScoringKeyFiles();
    console.log(`Found ${keyFiles.length} scoring key files\n`);

    const allScales = [];
    const testBatteries = [];

    // Parse each scoring key file
    keyFiles.forEach(filename => {
      const result = parseScoringKeyFile(filename);
      if (result && result.scales.length > 0) {
        allScales.push(...result.scales);

        // Create test battery entry
        const totalItems = new Set();
        result.scales.forEach(scale => {
          scale.items.forEach(item => totalItems.add(item.itemId));
        });

        testBatteries.push({
          id: result.instrumentName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          name: result.instrumentName,
          description: `${result.instrumentName} personality assessment`,
          itemCount: totalItems.size,
          scales: result.scales.map(s => s.id),
          estimatedMinutes: Math.ceil(totalItems.size * 0.5), // ~30 seconds per item
          sourceFile: filename
        });

        console.log(`  ✓ ${result.instrumentName}: ${result.scales.length} scales, ${totalItems.size} items`);
      }
    });

    // Write scales
    fs.writeFileSync(SCALES_OUTPUT, JSON.stringify(allScales, null, 2));
    console.log(`\n✓ Successfully wrote ${allScales.length} scales to ${SCALES_OUTPUT}`);

    // Write test batteries
    fs.writeFileSync(BATTERIES_OUTPUT, JSON.stringify(testBatteries, null, 2));
    console.log(`✓ Successfully wrote ${testBatteries.length} test batteries to ${BATTERIES_OUTPUT}`);

  } catch (error) {
    console.error('Error parsing scoring keys:', error);
    process.exit(1);
  }
}

main();
