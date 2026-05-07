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
 * Parse a scoring key file with proper multi-version support
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

  // Extract instrument name from filename
  const instrumentMatch = filename.match(/new(.+?)Key\.htm/i);
  const instrumentName = instrumentMatch ? instrumentMatch[1] : filename.replace('.htm', '');

  // Track current factor/facet name for multi-version scales
  let currentFactorName = null;
  let currentVersionSuffix = null;

  // Parse the HTML structure more carefully
  $('table').each((tableIndex, table) => {
    const $table = $(table);

    // Look for scale header in the rows before this table or in first row
    let scaleName = null;
    let alpha = null;
    let versionInfo = null;

    // Check previous siblings for headers
    let $prev = $table.prev();
    while ($prev.length > 0 && !scaleName) {
      const text = $prev.text().trim();

      // Check for factor/facet name (e.g., "Factor I (Surgency or Extraversion)")
      const factorMatch = text.match(/Factor\s+([IVX]+|[A-Z]\d+)[:\s]*([^(]+?)(?:\(([^)]+)\))?$/i);
      if (factorMatch) {
        currentFactorName = factorMatch[2].trim();
        if (factorMatch[3]) {
          currentFactorName = factorMatch[3].trim();
        }
      }

      // Check for version info (e.g., "10-item scale (Alpha = .87)")
      const versionMatch = text.match(/(\d+)-item\s+scale.*?alpha\s*=\s*([\d.]+)/i);
      if (versionMatch) {
        versionInfo = versionMatch[1]; // "10" or "20"
        alpha = parseFloat(versionMatch[2]);
        scaleName = currentFactorName;
        break;
      }

      $prev = $prev.prev();
    }

    // If we found a scale name and version, parse the items
    if (scaleName && versionInfo) {
      const scaleId = `${instrumentName.toLowerCase()}-${scaleName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${versionInfo}`;

      const scaleData = {
        id: scaleId,
        name: `${scaleName} (${versionInfo}-item)`,
        instrument: instrumentName,
        alpha: alpha,
        items: []
      };

      let currentKeying = null;

      $table.find('tr').each((rowIndex, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 2) {
          const firstCell = $(cells[0]).text().trim();
          const secondCell = $(cells[1]).text().trim();

          // Check if first cell contains keying indicator
          if (firstCell.includes('+ keyed') || firstCell.includes('+keyed') || firstCell === '+') {
            currentKeying = 1;
            // If second cell has item text, use it
            if (secondCell.length > 5 && !secondCell.includes('Alpha') && !secondCell.includes('scale')) {
              const itemId = matchItemToId(secondCell);
              if (itemId) {
                scaleData.items.push({ itemId, keying: 1 });
              }
            }
          } else if (firstCell.includes('− keyed') || firstCell.includes('−keyed') ||
                     firstCell.includes('- keyed') || firstCell.includes('-keyed') ||
                     firstCell === '−' || firstCell === '–' || firstCell === '-') {
            currentKeying = -1;
            // If second cell has item text, use it
            if (secondCell.length > 5 && !secondCell.includes('Alpha') && !secondCell.includes('scale')) {
              const itemId = matchItemToId(secondCell);
              if (itemId) {
                scaleData.items.push({ itemId, keying: -1 });
              }
            }
          } else if (currentKeying !== null && secondCell.length > 5 &&
                     !secondCell.includes('Alpha') && !secondCell.includes('scale') &&
                     !firstCell.includes('keyed')) {
            // This row inherits keying from previous row
            const itemId = matchItemToId(secondCell);
            if (itemId) {
              scaleData.items.push({ itemId, keying: currentKeying });
            }
          }
        }
      });

      // Only save if we found items
      if (scaleData.items.length > 0) {
        scales.push(scaleData);
        console.log(`  Found: ${scaleData.name} with ${scaleData.items.length} items`);
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
  console.log('Starting scoring key extraction (FIXED VERSION)...\n');

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
          id: result.instrumentName.toLowerCase().replace(/[^a-z0-9]+/g, ''),
          name: result.instrumentName,
          description: `${result.instrumentName} personality assessment`,
          itemCount: totalItems.size,
          scales: result.scales.map(s => s.id),
          estimatedMinutes: Math.ceil(totalItems.size * 0.5), // ~30 seconds per item
          sourceFile: filename
        });

        console.log(`  ✓ ${result.instrumentName}: ${result.scales.length} scales, ${totalItems.size} items\n`);
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
