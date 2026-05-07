import fs from 'fs';
import { parseSimpleTest } from './parse-simple-test.js';

// Parse both MiniIPIP tests
const miniIPIP = parseSimpleTest(
  'public/archive/ipip-mirror/ipip.ori.org/MiniIPIPKey.htm',
  'mini-ipip',
  'Mini-IPIP'
);

const miniIPIP6 = parseSimpleTest(
  'public/archive/ipip-mirror/ipip.ori.org/MiniIPIP6Key.htm',
  'mini-ipip6',
  'Mini-IPIP6'
);

// Load existing data
const scalesPath = 'public/data/scales.json';
const testBatteriesPath = 'public/data/test-batteries.json';

const existingScales = JSON.parse(fs.readFileSync(scalesPath, 'utf-8'));
const existingBatteries = JSON.parse(fs.readFileSync(testBatteriesPath, 'utf-8'));

// Convert parsed scales to the format used in scales.json
function convertScale(scale) {
  return {
    id: scale.id,
    name: scale.name,
    description: scale.description,
    items: scale.items.map(item => ({
      itemId: item.id,
      keying: item.keying
    }))
  };
}

// Add new scales
const newScales = [
  ...miniIPIP.scales.map(convertScale),
  ...miniIPIP6.scales.map(convertScale)
];

// Check for duplicates
const existingScaleIds = new Set(existingScales.map(s => s.id));
const scalesToAdd = newScales.filter(s => !existingScaleIds.has(s.id));

console.log(`Adding ${scalesToAdd.length} new scales...`);
scalesToAdd.forEach(s => console.log(`  - ${s.id}`));

// Add new test batteries
const newBatteries = [miniIPIP.testBattery, miniIPIP6.testBattery];

// Check for duplicates
const existingBatteryIds = new Set(existingBatteries.map(b => b.id));
const batteriesToAdd = newBatteries.filter(b => !existingBatteryIds.has(b.id));

console.log(`\nAdding ${batteriesToAdd.length} new test batteries...`);
batteriesToAdd.forEach(b => console.log(`  - ${b.id} (${b.scales.length} scales)`));

// Merge and save
const updatedScales = [...existingScales, ...scalesToAdd];
const updatedBatteries = [...existingBatteries, ...batteriesToAdd];

fs.writeFileSync(scalesPath, JSON.stringify(updatedScales, null, 2));
fs.writeFileSync(testBatteriesPath, JSON.stringify(updatedBatteries, null, 2));

console.log('\nDone!');
console.log(`Total scales: ${updatedScales.length}`);
console.log(`Total test batteries: ${updatedBatteries.length}`);
