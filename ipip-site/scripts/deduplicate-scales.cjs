const fs = require('fs');
const path = require('path');

const scalesPath = path.join(__dirname, '../public/data/scales.json');
const scales = JSON.parse(fs.readFileSync(scalesPath, 'utf-8'));

console.log('Original scales count:', scales.length);

// Group scales by ID
const scalesByID = new Map();
scales.forEach(scale => {
  if (!scalesByID.has(scale.id)) {
    scalesByID.set(scale.id, []);
  }
  scalesByID.get(scale.id).push(scale);
});

// Find duplicates
const duplicates = Array.from(scalesByID.entries())
  .filter(([id, scales]) => scales.length > 1);

console.log('\nDuplicate scale IDs:', duplicates.length);
duplicates.forEach(([id, scales]) => {
  console.log(`  ${id}: ${scales.length} copies`);
});

// Merge duplicates: keep first occurrence, merge items arrays
const deduplicatedScales = [];
scalesByID.forEach((scaleGroup, id) => {
  if (scaleGroup.length === 1) {
    deduplicatedScales.push(scaleGroup[0]);
  } else {
    // Merge all items from duplicate scales
    const mergedScale = { ...scaleGroup[0] };
    const allItems = [];
    const seenItemKeys = new Set();

    scaleGroup.forEach(scale => {
      scale.items.forEach(item => {
        // Create a unique key for this item based on itemIds and keying
        const key = `${item.itemIds.sort().join(',')}_${item.keying}`;
        if (!seenItemKeys.has(key)) {
          seenItemKeys.add(key);
          allItems.push(item);
        }
      });
    });

    mergedScale.items = allItems;
    deduplicatedScales.push(mergedScale);

    console.log(`\nMerged ${id}:`);
    console.log(`  Original items: ${scaleGroup.map(s => s.items.length).join(', ')}`);
    console.log(`  Merged items: ${allItems.length}`);
  }
});

console.log('\nDeduplicated scales count:', deduplicatedScales.length);

// Backup original file
const backupPath = scalesPath.replace('.json', '-backup.json');
fs.writeFileSync(backupPath, fs.readFileSync(scalesPath));
console.log(`\nBackup saved to: ${backupPath}`);

// Write deduplicated scales
fs.writeFileSync(scalesPath, JSON.stringify(deduplicatedScales, null, 2));
console.log(`Deduplicated scales written to: ${scalesPath}`);
