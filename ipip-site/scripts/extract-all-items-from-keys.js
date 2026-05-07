import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHIVE_PATH = path.join(__dirname, '../public/archive/ipip-mirror/ipip.ori.org');
const ITEMS_PATH = path.join(__dirname, '../public/data/items.json');

// Load existing items
const existingItems = JSON.parse(fs.readFileSync(ITEMS_PATH, 'utf-8'));
const existingTexts = new Set(existingItems.map(item => item.text.toLowerCase().trim()));

console.log(`Loaded ${existingItems.length} existing items from items.json\n`);

// Get all Key files
const keyFiles = fs.readdirSync(ARCHIVE_PATH)
  .filter(f => f.endsWith('Key.htm') || f.endsWith('Key.html'))
  .sort();

console.log(`Found ${keyFiles.length} Key files:\n${keyFiles.join('\n')}\n`);

// Extract all unique item texts from all Key files
const allItemTexts = new Set();
const itemsByFile = {};

keyFiles.forEach(filename => {
  const filePath = path.join(ARCHIVE_PATH, filename);
  const html = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(html);

  const items = new Set();

  // Strategy 1: Find all table cells that look like item text
  $('td').each((i, elem) => {
    const text = $(elem).text().trim();

    // Skip if too short, too long, or contains metadata keywords
    if (text.length < 5 || text.length > 200) return;
    if (text.match(/alpha|keyed|scale|correlation|loading|factor/i)) return;
    if (text.match(/^\d+$/)) return; // Just numbers
    if (text.match(/^[+\-−–]\s*$/)) return; // Just keying symbols

    // Must look like a sentence (starts with capital, ends with punctuation or is a phrase)
    if (text.match(/^[A-Z]/) && (text.match(/[.!?]$/) || text.split(' ').length >= 2)) {
      items.add(text);
      allItemTexts.add(text);
    }
  });

  itemsByFile[filename] = items;
  console.log(`${filename}: ${items.size} items`);
});

console.log(`\nTotal unique items across all Key files: ${allItemTexts.size}`);

// Find items that are NOT in existing items.json
const missingItems = [];
allItemTexts.forEach(text => {
  const normalized = text.toLowerCase().trim();
  if (!existingTexts.has(normalized)) {
    missingItems.push(text);
  }
});

console.log(`\nMissing items (in Key files but not in items.json): ${missingItems.length}`);

if (missingItems.length > 0) {
  console.log('\n=== MISSING ITEMS ===\n');
  missingItems.sort().forEach((text, i) => {
    console.log(`${i + 1}. "${text}"`);

    // Show which files use this item
    const filesUsingThis = [];
    Object.entries(itemsByFile).forEach(([file, items]) => {
      if (items.has(text)) filesUsingThis.push(file);
    });
    console.log(`   Used in: ${filesUsingThis.join(', ')}\n`);
  });

  // Save to file for review
  const outputPath = path.join(__dirname, '../public/data/missing-items.json');
  fs.writeFileSync(outputPath, JSON.stringify(missingItems, null, 2));
  console.log(`\nMissing items saved to: ${outputPath}`);
}
