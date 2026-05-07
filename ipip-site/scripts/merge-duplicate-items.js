import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read data files
const itemsPath = path.join(__dirname, '../public/data/items.json');
const scalesPath = path.join(__dirname, '../public/data/scales.json');
const items = JSON.parse(fs.readFileSync(itemsPath, 'utf-8'));
const scales = JSON.parse(fs.readFileSync(scalesPath, 'utf-8'));

// Read all translation files
const translationsDir = path.join(__dirname, '../public/data/translations');
const translationFiles = fs.readdirSync(translationsDir)
  .filter(f => f.endsWith('.json') && f !== 'index.json' && f !== 'battery-translations.json');

const allTranslations = {};
translationFiles.forEach(file => {
  const filePath = path.join(translationsDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (data.translations) {
    Object.entries(data.translations).forEach(([itemId, text]) => {
      if (!allTranslations[itemId]) {
        allTranslations[itemId] = {};
      }
      allTranslations[itemId][data.language] = text;
    });
  }
});

console.log('=== Starting Item Merge Process ===\n');

// Step 1: Group items by normalized text
const textToItems = new Map();
items.forEach(item => {
  const normalizedText = item.text.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!textToItems.has(normalizedText)) {
    textToItems.set(normalizedText, []);
  }
  textToItems.get(normalizedText).push(item);
});

console.log(`Total items: ${items.length}`);
console.log(`Unique texts: ${textToItems.size}`);

// Step 2: Create merged items
const mergedItems = [];
let mergedCount = 0;

textToItems.forEach((itemList, normalizedText) => {
  if (itemList.length === 1) {
    // No duplicates, keep as is but add translations from files
    const item = itemList[0];
    mergedItems.push({
      ids: [item.id],
      text: item.text,
      translations: allTranslations[item.id] || {}
    });
  } else {
    // Merge duplicates
    mergedCount += itemList.length - 1;

    // Collect all IDs
    const ids = itemList.map(i => i.id);

    // Use the first item's text (prefer one without newlines if possible)
    const textWithoutNewline = itemList.find(i => !i.text.includes('\n'));
    const text = textWithoutNewline ? textWithoutNewline.text : itemList[0].text;

    // Merge translations from all IDs
    const mergedTranslations = {};
    ids.forEach(id => {
      if (allTranslations[id]) {
        Object.entries(allTranslations[id]).forEach(([lang, trans]) => {
          if (!mergedTranslations[lang]) {
            mergedTranslations[lang] = trans;
          }
        });
      }
    });

    mergedItems.push({
      ids,
      text,
      translations: mergedTranslations
    });
  }
});

console.log(`Merged items: ${mergedCount}`);
console.log(`Final item count: ${mergedItems.length}\n`);

// Step 3: Update scales to reference merged items
console.log('=== Updating Scales ===\n');

// Create a map from old item ID to merged item
const itemIdToMergedItem = new Map();
mergedItems.forEach(mergedItem => {
  mergedItem.ids.forEach(id => {
    itemIdToMergedItem.set(id, mergedItem);
  });
});

const updatedScales = scales.map(scale => {
  const updatedItems = [];
  const seenTexts = new Set();

  scale.items.forEach(scaleItem => {
    const mergedItem = itemIdToMergedItem.get(scaleItem.itemId);
    if (!mergedItem) {
      console.warn(`Warning: Item ${scaleItem.itemId} not found in merged items`);
      return;
    }

    // Use normalized text as key to avoid duplicates in the same scale
    const normalizedText = mergedItem.text.replace(/\s+/g, ' ').trim().toLowerCase();

    if (!seenTexts.has(normalizedText)) {
      seenTexts.add(normalizedText);
      updatedItems.push({
        itemIds: mergedItem.ids, // Now an array of IDs
        keying: scaleItem.keying
      });
    }
  });

  return {
    ...scale,
    items: updatedItems
  };
});

// Calculate statistics
let totalScaleItemsBefore = scales.reduce((sum, s) => sum + s.items.length, 0);
let totalScaleItemsAfter = updatedScales.reduce((sum, s) => sum + s.items.length, 0);

console.log(`Total scale items before: ${totalScaleItemsBefore}`);
console.log(`Total scale items after: ${totalScaleItemsAfter}`);
console.log(`Removed duplicate scale items: ${totalScaleItemsBefore - totalScaleItemsAfter}\n`);

// Step 4: Save merged data
const mergedItemsPath = path.join(__dirname, '../public/data/items-merged.json');
const mergedScalesPath = path.join(__dirname, '../public/data/scales-merged.json');

fs.writeFileSync(mergedItemsPath, JSON.stringify(mergedItems, null, 2));
fs.writeFileSync(mergedScalesPath, JSON.stringify(updatedScales, null, 2));

console.log('=== Files Saved ===');
console.log(`Merged items: ${mergedItemsPath}`);
console.log(`Merged scales: ${mergedScalesPath}`);

// Step 5: Generate migration report
const report = {
  summary: {
    originalItemCount: items.length,
    mergedItemCount: mergedItems.length,
    itemsMerged: mergedCount,
    uniqueTexts: textToItems.size,
    originalScaleItems: totalScaleItemsBefore,
    mergedScaleItems: totalScaleItemsAfter,
    duplicateScaleItemsRemoved: totalScaleItemsBefore - totalScaleItemsAfter
  },
  examples: []
};

// Add some examples of merged items
let exampleCount = 0;
mergedItems.forEach(item => {
  if (item.ids.length > 1 && exampleCount < 10) {
    report.examples.push({
      text: item.text,
      ids: item.ids,
      translationLanguages: Object.keys(item.translations)
    });
    exampleCount++;
  }
});

const reportPath = path.join(__dirname, '../public/data/merge-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`Merge report: ${reportPath}\n`);

console.log('=== Sample Merged Items ===\n');
report.examples.slice(0, 5).forEach((ex, i) => {
  console.log(`${i + 1}. "${ex.text}"`);
  console.log(`   IDs: ${ex.ids.join(', ')}`);
  console.log(`   Translations: ${ex.translationLanguages.join(', ') || 'none'}`);
  console.log('');
});
