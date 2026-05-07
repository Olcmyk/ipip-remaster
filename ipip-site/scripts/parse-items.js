import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHIVE_PATH = path.join(__dirname, '../public/archive/ipip-mirror/ipip.ori.org');
const OUTPUT_PATH = path.join(__dirname, '../public/data/items.json');

/**
 * Parse the AlphabeticalItemList.htm file to extract all IPIP items
 */
function parseAlphabeticalItemList() {
  const filePath = path.join(ARCHIVE_PATH, 'AlphabeticalItemList.htm');

  console.log('Reading AlphabeticalItemList.htm...');
  const html = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(html);

  const items = [];
  const itemMap = new Map(); // To track duplicates

  // Find all table rows
  $('table tr').each((i, row) => {
    const cells = $(row).find('td');

    // Skip header rows or rows without enough cells
    if (cells.length < 2) return;

    // Extract item text and code
    // The structure varies, but typically: [item text] [item code(s)]
    const firstCell = $(cells[0]).text().trim();
    const secondCell = $(cells[1]).text().trim();

    // Item codes follow pattern: Letter + Numbers (e.g., H34, X244, Q253)
    // Can be single code or multiple codes separated by comma (e.g., "H34, X94")
    const singleCodePattern = /^[A-Z]\d+$/;
    const multiCodePattern = /^[A-Z]\d+(?:,\s*[A-Z]\d+)+$/;

    let itemText = '';
    let itemCodes = [];

    // Check which cell contains the item code(s)
    if (singleCodePattern.test(firstCell)) {
      itemCodes = [firstCell];
      itemText = secondCell;
    } else if (multiCodePattern.test(firstCell)) {
      itemCodes = firstCell.split(',').map(c => c.trim());
      itemText = secondCell;
    } else if (singleCodePattern.test(secondCell)) {
      itemCodes = [secondCell];
      itemText = firstCell;
    } else if (multiCodePattern.test(secondCell)) {
      itemCodes = secondCell.split(',').map(c => c.trim());
      itemText = firstCell;
    }

    // Validate we have both text and code(s)
    if (itemText && itemCodes.length > 0 && itemText.length > 0) {
      // Create an item for each code (same text, different IDs)
      itemCodes.forEach(itemCode => {
        // Skip if we've already seen this item code
        if (itemMap.has(itemCode)) {
          console.warn(`Duplicate item code found: ${itemCode}`);
          return;
        }

        const item = {
          id: itemCode,
          text: itemText,
          translations: {},
          scales: [],
          keying: {}
        };

        items.push(item);
        itemMap.set(itemCode, item);
      });
    }
  });

  console.log(`Extracted ${items.length} items`);

  // Sort items by ID for consistency
  items.sort((a, b) => {
    // Extract letter and number parts
    const aLetter = a.id.match(/^[A-Z]/)[0];
    const aNumber = parseInt(a.id.match(/\d+$/)[0]);
    const bLetter = b.id.match(/^[A-Z]/)[0];
    const bNumber = parseInt(b.id.match(/\d+$/)[0]);

    // Sort by letter first, then by number
    if (aLetter !== bLetter) {
      return aLetter.localeCompare(bLetter);
    }
    return aNumber - bNumber;
  });

  return items;
}

/**
 * Main execution
 */
function main() {
  console.log('Starting item extraction...\n');

  try {
    const items = parseAlphabeticalItemList();

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write to JSON file
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(items, null, 2));

    console.log(`\n✓ Successfully wrote ${items.length} items to ${OUTPUT_PATH}`);

    // Print some statistics
    const letterCounts = {};
    items.forEach(item => {
      const letter = item.id.match(/^[A-Z]/)[0];
      letterCounts[letter] = (letterCounts[letter] || 0) + 1;
    });

    console.log('\nItems by letter prefix:');
    Object.keys(letterCounts).sort().forEach(letter => {
      console.log(`  ${letter}: ${letterCounts[letter]} items`);
    });

  } catch (error) {
    console.error('Error parsing items:', error);
    process.exit(1);
  }
}

main();
