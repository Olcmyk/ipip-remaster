import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read items.json
const itemsPath = path.join(__dirname, '../public/data/items.json');
const items = JSON.parse(fs.readFileSync(itemsPath, 'utf-8'));

// Group items by their text (normalized)
const textToItems = new Map();

items.forEach(item => {
  // Normalize text: remove extra whitespace and newlines
  const normalizedText = item.text.replace(/\s+/g, ' ').trim().toLowerCase();

  if (!textToItems.has(normalizedText)) {
    textToItems.set(normalizedText, []);
  }

  textToItems.get(normalizedText).push({
    id: item.id,
    originalText: item.text,
    hasTranslations: Object.keys(item.translations || {}).length > 0
  });
});

// Find duplicates
const duplicates = [];
textToItems.forEach((itemList, text) => {
  if (itemList.length > 1) {
    duplicates.push({
      text: itemList[0].originalText,
      count: itemList.length,
      items: itemList
    });
  }
});

// Sort by count (most duplicates first)
duplicates.sort((a, b) => b.count - a.count);

console.log(`\n=== Duplicate Item Analysis ===`);
console.log(`Total unique texts: ${textToItems.size}`);
console.log(`Texts with duplicates: ${duplicates.length}`);
console.log(`Total items: ${items.length}`);
console.log(`\n=== Top Duplicates ===\n`);

// Show top 20 duplicates
duplicates.slice(0, 20).forEach((dup, index) => {
  console.log(`${index + 1}. "${dup.text}" (${dup.count} items)`);
  dup.items.forEach(item => {
    const translationInfo = item.hasTranslations ? '✓ has translations' : '✗ no translations';
    console.log(`   - ${item.id} ${translationInfo}`);
  });
  console.log('');
});

// Statistics
const totalDuplicateItems = duplicates.reduce((sum, dup) => sum + dup.count, 0);
const duplicateItemsWithTranslations = duplicates.reduce((sum, dup) => {
  return sum + dup.items.filter(item => item.hasTranslations).length;
}, 0);

console.log(`\n=== Statistics ===`);
console.log(`Total duplicate items: ${totalDuplicateItems}`);
console.log(`Duplicate items with translations: ${duplicateItemsWithTranslations}`);
console.log(`Duplicate items without translations: ${totalDuplicateItems - duplicateItemsWithTranslations}`);

// Save full report to file
const reportPath = path.join(__dirname, '../public/data/duplicate-items-report.json');
fs.writeFileSync(reportPath, JSON.stringify(duplicates, null, 2));
console.log(`\nFull report saved to: ${reportPath}`);
