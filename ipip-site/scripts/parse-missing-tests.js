#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHIVE_PATH = path.join(__dirname, '../public/archive/ipip-mirror/ipip.ori.org');
const ITEMS_PATH = path.join(__dirname, '../public/data/items.json');
const SCALES_PATH = path.join(__dirname, '../public/data/scales.json');
const BATTERIES_PATH = path.join(__dirname, '../public/data/test-batteries.json');

// Load existing data
const masterItems = JSON.parse(fs.readFileSync(ITEMS_PATH, 'utf-8'));
const existingScales = JSON.parse(fs.readFileSync(SCALES_PATH, 'utf-8'));
const existingBatteries = JSON.parse(fs.readFileSync(BATTERIES_PATH, 'utf-8'));

// Create item text to ID map
const itemTextToId = new Map();
masterItems.forEach(item => {
  // Items have an 'ids' array, use the first ID
  const itemId = item.ids && item.ids.length > 0 ? item.ids[0] : null;
  if (itemId) {
    itemTextToId.set(item.text.toLowerCase().trim(), itemId);
  }
});

/**
 * Normalize text by removing extra whitespace and special characters
 */
function normalizeText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[–—―]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .trim();
}

/**
 * Match item text to item ID with fuzzy matching
 */
function matchItemToId(itemText) {
  const normalized = itemText.toLowerCase().trim();

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
    console.warn(`Fuzzy matched (${(bestScore * 100).toFixed(1)}%): "${itemText}" -> ${bestMatch}`);
    return bestMatch;
  }

  console.error(`No match found for: "${itemText}"`);
  return null;
}

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
 * Parse a test file and extract scales
 */
function parseTestFile(filename, instrumentName) {
  const filePath = path.join(ARCHIVE_PATH, filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filename}`);
    return null;
  }

  console.log(`\nParsing ${filename}...`);
  const html = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(html);

  const scales = [];
  let tablesProcessed = 0;
  let tablesWithKeyed = 0;

  // Find all tables that contain item data (have + keyed or - keyed)
  $('table').each((tableIndex, table) => {
    const $table = $(table);
    const tableText = $table.text();
    tablesProcessed++;

    // Skip tables that don't have keying indicators
    if (!tableText.includes('keyed')) {
      return;
    }

    tablesWithKeyed++;
    console.log(`  Processing table ${tableIndex} with keyed items`);

    let currentScaleName = null;
    let currentAlpha = null;

    // Look for scale name in parent td, previous siblings, or nearby elements
    const $parentTd = $table.closest('td');
    if ($parentTd.length > 0) {
      const $parentTr = $parentTd.parent('tr');
      const $prevTr = $parentTr.prev('tr');

      if ($prevTr.length > 0) {
        const text = normalizeText($prevTr.text());

        // Check for scale name with alpha or correlation
        const match = text.match(/^(.+?)\s*\(/i);
        if (match && match[1].length > 3) {
          currentScaleName = match[1].trim().replace(/^Factor\s+[IVX]+\s*/i, '');

          // Try to extract alpha or correlation value
          const valueMatch = text.match(/(?:alpha|correlation)\s*=\s*([\d.]+)/i);
          if (valueMatch) {
            currentAlpha = parseFloat(valueMatch[1]);
          }
        } else if (text.length > 3 && text.length < 150 && !text.includes('Items in')) {
          currentScaleName = text.replace(/^Factor\s+[IVX]+\s*/i, '');
        }
      }
    }

    // Alternative: look for scale name before this table
    if (!currentScaleName) {
      let $prev = $table.prev();
      let attempts = 0;
      while ($prev.length > 0 && attempts < 5) {
        const text = normalizeText($prev.text());

        const match = text.match(/^(.+?)\s*\(/i);
        if (match && match[1].length > 3) {
          currentScaleName = match[1].trim().replace(/^Factor\s+[IVX]+\s*/i, '');

          const valueMatch = text.match(/(?:alpha|Alpha)\s*=\s*([\d.]+)/i);
          if (valueMatch) {
            currentAlpha = parseFloat(valueMatch[1]);
          }
          break;
        }

        if (text.length > 3 && text.length < 150 && !text.includes('keyed') && !text.includes('Items in')) {
          currentScaleName = text.replace(/^Factor\s+[IVX]+\s*/i, '');
          break;
        }

        $prev = $prev.prev();
        attempts++;
      }
    }

    if (!currentScaleName) {
      console.warn(`  Could not find scale name for table ${tableIndex}`);
      return;
    }

    console.log(`  Scale name: ${currentScaleName}`);

    const scaleId = `${instrumentName.toLowerCase()}-${currentScaleName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const scaleData = {
      id: scaleId,
      name: currentScaleName,
      instrument: instrumentName,
      alpha: currentAlpha,
      items: []
    };

    let currentKeying = null;

    $table.find('tr').each((rowIndex, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const firstCell = normalizeText($(cells[0]).text());
        const secondCell = normalizeText($(cells[1]).text());

        // Check for keying indicator
        if (firstCell.includes('+ keyed') || firstCell.includes('+keyed') || firstCell === '+') {
          currentKeying = 1;
          if (secondCell.length > 5 && !secondCell.includes('keyed')) {
            const itemId = matchItemToId(secondCell);
            if (itemId) {
              scaleData.items.push({ itemId, keying: 1 });
            }
          }
        } else if (firstCell.includes('- keyed') || firstCell.includes('-keyed') || firstCell === '-') {
          currentKeying = -1;
          if (secondCell.length > 5 && !secondCell.includes('keyed')) {
            const itemId = matchItemToId(secondCell);
            if (itemId) {
              scaleData.items.push({ itemId, keying: -1 });
            }
          }
        } else if (currentKeying !== null && secondCell.length > 5 && !secondCell.includes('Alpha') && !secondCell.includes('keyed') && secondCell !== '') {
          const itemId = matchItemToId(secondCell);
          if (itemId) {
            scaleData.items.push({ itemId, keying: currentKeying });
          }
        }
      }
    });

    if (scaleData.items.length > 0) {
      scales.push(scaleData);
      console.log(`  Found: ${scaleData.name} with ${scaleData.items.length} items`);
    } else {
      console.log(`  No items found for scale: ${scaleData.name}`);
    }
  });

  console.log(`  Total: ${tablesProcessed} tables, ${tablesWithKeyed} with keyed items, ${scales.length} scales extracted`);

  return { filename, instrumentName, scales };
}

/**
 * Main execution
 */
function main() {
  console.log('Parsing missing test files...\n');

  const missingTests = [
    { file: 'MiniIPIP6Key.htm', name: 'MiniIPIP6' },
    { file: 'MiniIPIPKey.htm', name: 'MiniIPIP' },
    { file: 'RaschVIAKey.htm', name: 'RaschVIA' },
    { file: 'newAB5CKey.htm', name: 'AB5C' },
    { file: 'newIPIP-IPCScoringKey.htm', name: 'IPIP-IPC' },
    { file: 'newORAISKey.htm', name: 'ORAIS' },
    { file: 'newORVISKey.htm', name: 'ORVIS' }
  ];

  const newScales = [];
  const newBatteries = [];

  missingTests.forEach(({ file, name }) => {
    const result = parseTestFile(file, name);
    if (result && result.scales.length > 0) {
      newScales.push(...result.scales);

      const totalItems = new Set();
      result.scales.forEach(scale => {
        scale.items.forEach(item => totalItems.add(item.itemId));
      });

      newBatteries.push({
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, ''),
        name: name,
        description: `${name} personality assessment`,
        itemCount: totalItems.size,
        scales: result.scales.map(s => s.id),
        estimatedMinutes: Math.ceil(totalItems.size * 0.5),
        sourceFile: file
      });

      console.log(`  ✓ ${name}: ${result.scales.length} scales, ${totalItems.size} items`);
    }
  });

  // Merge with existing data
  const allScales = [...existingScales, ...newScales];
  const allBatteries = [...existingBatteries, ...newBatteries];

  // Write updated data
  fs.writeFileSync(SCALES_PATH, JSON.stringify(allScales, null, 2));
  fs.writeFileSync(BATTERIES_PATH, JSON.stringify(allBatteries, null, 2));

  console.log(`\n✓ Added ${newScales.length} new scales`);
  console.log(`✓ Added ${newBatteries.length} new test batteries`);
  console.log(`✓ Total scales: ${allScales.length}`);
  console.log(`✓ Total batteries: ${allBatteries.length}`);
}

main();
