import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ITEMS_PATH = path.join(__dirname, '../public/data/items.json');
const MISSING_PATH = path.join(__dirname, '../public/data/missing-items.json');

// Load existing items and missing items
const existingItems = JSON.parse(fs.readFileSync(ITEMS_PATH, 'utf-8'));
const missingTexts = JSON.parse(fs.readFileSync(MISSING_PATH, 'utf-8'));

console.log(`Loaded ${existingItems.length} existing items`);
console.log(`Found ${missingTexts.length} missing items\n`);

// Find all used IDs
const usedIds = new Set(existingItems.map(item => item.id));

// Function to generate next available ID
function generateNextId(letter, startNum = 1) {
  let num = startNum;
  while (usedIds.has(`${letter}${num}`)) {
    num++;
  }
  return `${letter}${num}`;
}

// Generate IDs for missing items
// Use letters that are underutilized: G, I, J, K, L, O, U, Z
const newItems = [];
const letters = ['G', 'I', 'J', 'K', 'L', 'O', 'U', 'Z'];
let letterIndex = 0;
let currentNum = 1;

missingTexts.forEach((text, index) => {
  // Get current letter
  const letter = letters[letterIndex];

  // Generate ID
  const id = generateNextId(letter, currentNum);
  usedIds.add(id);

  // Create item
  newItems.push({
    id: id,
    text: text,
    translations: {}
  });

  // Move to next number
  currentNum++;

  // If we've used too many numbers for this letter, move to next letter
  if (currentNum > 500) {
    letterIndex++;
    currentNum = 1;
    if (letterIndex >= letters.length) {
      console.error(`ERROR: Ran out of letters! Only processed ${index + 1} of ${missingTexts.length} items`);
      process.exit(1);
    }
  }
});

console.log(`Generated ${newItems.length} new items`);
console.log(`ID ranges used:`);
const byLetter = {};
newItems.forEach(item => {
  const letter = item.id.match(/^[A-Z]/)[0];
  const num = parseInt(item.id.match(/\d+$/)[0]);
  if (!byLetter[letter]) byLetter[letter] = { min: num, max: num, count: 0 };
  byLetter[letter].min = Math.min(byLetter[letter].min, num);
  byLetter[letter].max = Math.max(byLetter[letter].max, num);
  byLetter[letter].count++;
});
Object.keys(byLetter).sort().forEach(letter => {
  const info = byLetter[letter];
  console.log(`  ${letter}: ${info.count} items, range ${letter}${info.min}-${letter}${info.max}`);
});

// Merge with existing items and sort by ID
const allItems = [...existingItems, ...newItems];
allItems.sort((a, b) => {
  const aLetter = a.id.match(/^[A-Z]/)[0];
  const bLetter = b.id.match(/^[A-Z]/)[0];
  if (aLetter !== bLetter) return aLetter.localeCompare(bLetter);

  const aNum = parseInt(a.id.match(/\d+$/)[0]);
  const bNum = parseInt(b.id.match(/\d+$/)[0]);
  return aNum - bNum;
});

console.log(`\nTotal items after merge: ${allItems.length}`);

// Save to new file (don't overwrite original yet)
const outputPath = path.join(__dirname, '../public/data/items-complete.json');
fs.writeFileSync(outputPath, JSON.stringify(allItems, null, 2));
console.log(`\nSaved complete items to: ${outputPath}`);
console.log(`\nTo use this file, run:`);
console.log(`  mv public/data/items-complete.json public/data/items.json`);
