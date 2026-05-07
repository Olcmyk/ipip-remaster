import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHIVE_PATH = path.join(__dirname, '../public/archive/ipip-mirror/ipip.ori.org');
const ITEMS_PATH = path.join(__dirname, '../public/data/items.json');

// Load the master item list
const masterItems = JSON.parse(fs.readFileSync(ITEMS_PATH, 'utf-8'));
const itemTextToId = new Map();
masterItems.forEach(item => {
  itemTextToId.set(item.text.toLowerCase().trim(), item.id);
});

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

function matchItemToId(itemText) {
  const normalized = itemText.toLowerCase().trim();
  if (itemTextToId.has(normalized)) {
    return itemTextToId.get(normalized);
  }
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

function parseBigFive5Broad() {
  const filePath = path.join(ARCHIVE_PATH, 'newBigFive5broadKey.htm');
  const html = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(html);

  const scales = [];
  let currentFactorName = null;

  // Find all td elements that contain tables (the structure is: outer table > tr > td > inner table)
  $('td').each((i, td) => {
    const $td = $(td);
    const text = $td.text().trim();

    // Check if this td contains a factor name
    const factorMatch = text.match(/Factor\s+([IVX]+)[:\s]*\(([^)]+)\)/i);
    if (factorMatch) {
      currentFactorName = factorMatch[2].trim().split(' or ').pop().trim();
      console.log(`Found factor: ${currentFactorName}`);
    }

    // Find tables inside this td
    const $innerTables = $td.find('table');
    if ($innerTables.length > 0 && currentFactorName) {
      // Process each table (10-item and 20-item versions)
      $innerTables.each((tableIdx, innerTable) => {
        const $innerTable = $(innerTable);

        // Check first row for version info
        const firstRow = $innerTable.find('tr').first();
        const firstRowText = firstRow.text().trim();

        const versionMatch = firstRowText.match(/(\d+)-item\s+scale.*?alpha\s*=\s*([\d.]+)/i);
        if (versionMatch) {
          const versionInfo = versionMatch[1];
          const alpha = parseFloat(versionMatch[2]);

          const scaleId = `bigfive5broad-${currentFactorName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${versionInfo}`;
          console.log(`DEBUG: Creating scale ${scaleId}`);
          const scaleData = {
            id: scaleId,
            name: `${currentFactorName} (${versionInfo}-item)`,
            instrument: 'BigFive5broad',
            alpha: alpha,
            items: []
          };

          let currentKeying = null;

          $innerTable.find('tr').each((rowIndex, row) => {
            const cells = $(row).find('td');

            // Handle rows with only 1 cell (first item after keying marker)
            if (cells.length === 1) {
              const cellText = $(cells[0]).text().trim();
              console.log(`DEBUG: Single cell row - text: "${cellText.substring(0, 50)}", keying: ${currentKeying}, length: ${cellText.length}`);
              if (currentKeying !== null && cellText.length > 5 &&
                  !cellText.includes('Alpha') && !cellText.includes('scale')) {
                const itemId = matchItemToId(cellText);
                console.log(`DEBUG: Matched to ID: ${itemId}`);
                if (itemId) scaleData.items.push({ itemId, keying: currentKeying });
              }
            }
            // Handle rows with 2 cells (keying marker + item, or empty + item)
            else if (cells.length >= 2) {
              const firstCell = $(cells[0]).text().trim();
              const secondCell = $(cells[1]).text().trim();

              // Debug: show character codes for firstCell
              if (firstCell.includes('keyed')) {
                console.log(`DEBUG: firstCell="${firstCell}", charCodes=[${Array.from(firstCell).map(c => c.charCodeAt(0)).join(',')}]`);
              }

              if (firstCell.includes('+ keyed') || firstCell === '+') {
                currentKeying = 1;
                console.log(`DEBUG: + keyed row - secondCell: "${secondCell.substring(0, 50)}", length: ${secondCell.length}`);
                if (secondCell.length > 5 && !secondCell.includes('Alpha') && !secondCell.includes('scale')) {
                  const itemId = matchItemToId(secondCell);
                  console.log(`DEBUG: Matched to ID: ${itemId}`);
                  if (itemId) {
                    scaleData.items.push({ itemId, keying: 1 });
                    console.log(`DEBUG: Added item ${itemId} with keying 1, total items now: ${scaleData.items.length}`);
                  } else {
                    console.log(`DEBUG: No match found for: "${secondCell}"`);
                  }
                }
              } else if (firstCell.includes('keyed') && (firstCell.charCodeAt(0) === 8211 || firstCell.includes('− keyed') || firstCell.includes('- keyed')) ||
                         firstCell === '−' || firstCell === '–' || firstCell === '-' || firstCell.charCodeAt(0) === 8211) {
                currentKeying = -1;
                console.log(`DEBUG: - keyed row - secondCell: "${secondCell.substring(0, 50)}", length: ${secondCell.length}`);
                if (secondCell.length > 5 && !secondCell.includes('Alpha') && !secondCell.includes('scale')) {
                  const itemId = matchItemToId(secondCell);
                  console.log(`DEBUG: Matched to ID: ${itemId}`);
                  if (itemId) {
                    scaleData.items.push({ itemId, keying: -1 });
                    console.log(`DEBUG: Added item ${itemId} with keying -1, total items now: ${scaleData.items.length}`);
                  } else {
                    console.log(`DEBUG: No match found for: "${secondCell}"`);
                  }
                }
              } else if (currentKeying !== null && secondCell.length > 5 &&
                         !secondCell.includes('Alpha') && !secondCell.includes('scale') &&
                         !firstCell.includes('keyed')) {
                console.log(`DEBUG: Empty+item row - secondCell: "${secondCell.substring(0, 50)}", keying: ${currentKeying}`);
                const itemId = matchItemToId(secondCell);
                console.log(`DEBUG: Matched to ID: ${itemId}`);
                if (itemId) {
                  scaleData.items.push({ itemId, keying: currentKeying });
                  console.log(`DEBUG: Added item ${itemId} with keying ${currentKeying}, total items now: ${scaleData.items.length}`);
                } else {
                  console.log(`DEBUG: No match found for: "${secondCell}"`);
                }
              }
            }
          });

          if (scaleData.items.length > 0) {
            // Check for duplicate itemIds
            const itemIds = scaleData.items.map(item => item.itemId);
            const uniqueIds = new Set(itemIds);
            if (itemIds.length !== uniqueIds.size) {
              console.log(`WARNING: Scale ${scaleData.id} has duplicate items!`);
              console.log(`  Total items: ${itemIds.length}, Unique: ${uniqueIds.size}`);
              const duplicates = itemIds.filter((id, index) => itemIds.indexOf(id) !== index);
              console.log(`  Duplicates: ${[...new Set(duplicates)].join(', ')}`);
            }
            scales.push(scaleData);
            console.log(`Found: ${scaleData.name} with ${scaleData.items.length} items (Alpha=${alpha})`);
          }
        }
      });
    }
  });

  return scales;
}

console.log('Testing BigFive5broad parser...\n');
const scales = parseBigFive5Broad();
console.log(`\nTotal scales found: ${scales.length}`);
console.log('\nScale summary:');
scales.forEach(s => {
  console.log(`  ${s.id}: ${s.items.length} items`);
});
