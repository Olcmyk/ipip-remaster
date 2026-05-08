#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const batteries = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../public/data/test-batteries.json'),
  'utf-8'
));

const scales = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../public/data/scales.json'),
  'utf-8'
));

console.log('Test Battery Verification Report\n');
console.log('='.repeat(80));

let errorCount = 0;

batteries.forEach(battery => {
  console.log(`\n${battery.name} (${battery.id})`);
  console.log(`  Source: ${battery.sourceFile}`);
  console.log(`  Items: ${battery.itemCount}`);
  console.log(`  Scales: ${battery.scales.length}`);

  battery.scales.forEach(scaleId => {
    const scale = scales.find(s => s.id === scaleId);
    if (scale) {
      console.log(`    - ${scale.name} (${scale.items.length} items, alpha=${scale.alpha || 'N/A'})`);
    } else {
      console.log(`    - ERROR: Scale ${scaleId} not found!`);
      errorCount++;
    }
  });
});

console.log('\n' + '='.repeat(80));
console.log(`\nTotal Batteries: ${batteries.length}`);
console.log(`Total Scales: ${scales.length}`);
console.log(`Errors Found: ${errorCount}`);

if (errorCount > 0) {
  process.exit(1);
}
