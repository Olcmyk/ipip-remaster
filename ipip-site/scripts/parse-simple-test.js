#!/usr/bin/env node

/**
 * Generic parser for simple IPIP tests with straightforward factor structure
 * (no multiple versions, just one scale per factor)
 *
 * Usage: node parse-simple-test.js <html-file> <test-id> <test-name>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load items.json to match item text to IDs
const itemsPath = path.join(__dirname, '../public/data/items.json');
const items = JSON.parse(fs.readFileSync(itemsPath, 'utf-8'));

// Create a map from item text to item IDs
const itemTextToIds = new Map();
items.forEach(item => {
  const normalizedText = item.text.trim().toLowerCase();
  if (!itemTextToIds.has(normalizedText)) {
    itemTextToIds.set(normalizedText, []);
  }
  itemTextToIds.get(normalizedText).push(item.id);
});

function parseSimpleTest(htmlPath, testId, testName) {
  console.log(`\nParsing ${testName} from ${htmlPath}...`);

  const html = fs.readFileSync(htmlPath, 'utf-8');
  const $ = cheerio.load(html);

  const scales = [];
  const testBattery = {
    id: testId,
    name: testName,
    description: '',
    scales: []
  };

  // Find all factor headings (they contain "Factor" in the text)
  $('td').each((i, elem) => {
    const text = $(elem).text().replace(/\s+/g, ' ').trim();

    // Match patterns like "Factor I Extraversion" or "Factor V Honesty-Humility"
    // Allow for multiple spaces/newlines between Factor and roman numeral
    const factorMatch = text.match(/Factor\s+([IVX]+)\s+(.+?)(?:\s*\(|$)/);
    if (!factorMatch) return;

    const factorNumber = factorMatch[1];
    let factorName = factorMatch[2].trim();

    // Handle cases like "Surgency or Extraversion" - take the last part
    if (factorName.includes(' or ')) {
      factorName = factorName.split(' or ').pop().trim();
    }

    console.log(`\nFound factor: ${factorNumber} - ${factorName}`);

    // Find the next table after this heading
    const table = $(elem).parent().next().find('table').first();
    if (table.length === 0) {
      console.log(`  Warning: No table found for factor ${factorName}`);
      return;
    }

    // Extract items from the table
    const scaleItems = [];
    let currentKeying = null;
    let nestedFactorDetected = false;

    table.find('tr').each((j, row) => {
      const cells = $(row).find('td');
      if (cells.length === 0) return;

      // Check for single-cell rows that might contain a nested factor heading
      if (cells.length === 1) {
        const cellText = $(cells[0]).text().replace(/\s+/g, ' ').trim();
        const nestedFactorMatch = cellText.match(/Factor\s+([IVX]+)\s+(.+?)(?:\s*\(|$)/);

        if (nestedFactorMatch) {
          // Mark that we found a nested factor
          nestedFactorDetected = true;

          // First, save the main scale with items collected so far
          if (scaleItems.length > 0) {
            const mainScaleId = `${testId}-${factorName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            const mainScale = {
              id: mainScaleId,
              name: factorName,
              description: `${factorName} scale from ${testName}`,
              items: scaleItems
            };
            scales.push(mainScale);
            testBattery.scales.push(mainScaleId);
            console.log(`  Created main scale: ${mainScaleId} with ${scaleItems.length} items`);
          }

          // Create a new scale for the nested factor
          const nestedFactorName = nestedFactorMatch[2].trim();
          console.log(`\n  Found nested factor: ${nestedFactorName}`);

          // Process remaining rows for the nested factor
          const nestedScaleItems = [];
          let nestedKeying = null;

          // Continue from current row
          $(row).nextAll('tr').each((k, nestedRow) => {
            const nestedCells = $(nestedRow).find('td');
            if (nestedCells.length < 2) return;

            const nestedFirstCell = $(nestedCells[0]).text().trim();
            const nestedSecondCell = $(nestedCells[1]).text().trim();

            if (nestedFirstCell.includes('keyed')) {
              if (nestedFirstCell.includes('-') || nestedFirstCell.charCodeAt(0) === 8211 || nestedFirstCell.includes('−')) {
                nestedKeying = -1;
              } else if (nestedFirstCell.includes('+')) {
                nestedKeying = 1;
              }

              if (nestedSecondCell && nestedSecondCell !== '&nbsp;') {
                const itemText = nestedSecondCell.trim();
                const normalizedText = itemText.toLowerCase();
                const itemIds = itemTextToIds.get(normalizedText);
                if (itemIds && itemIds.length > 0) {
                  nestedScaleItems.push({ id: itemIds[0], keying: nestedKeying });
                  console.log(`    Added item: ${itemIds[0]} (${nestedKeying > 0 ? '+' : '-'}) - ${itemText}`);
                }
              }
            } else if (nestedKeying !== null && nestedSecondCell && nestedSecondCell !== '&nbsp;') {
              const itemText = nestedSecondCell.trim();
              const normalizedText = itemText.toLowerCase();
              const itemIds = itemTextToIds.get(normalizedText);
              if (itemIds && itemIds.length > 0) {
                nestedScaleItems.push({ id: itemIds[0], keying: nestedKeying });
                console.log(`    Added item: ${itemIds[0]} (${nestedKeying > 0 ? '+' : '-'}) - ${itemText}`);
              }
            }
          });

          // Create the nested scale
          if (nestedScaleItems.length > 0) {
            const nestedScaleId = `${testId}-${nestedFactorName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            const nestedScale = {
              id: nestedScaleId,
              name: nestedFactorName,
              description: `${nestedFactorName} scale from ${testName}`,
              items: nestedScaleItems
            };
            scales.push(nestedScale);
            testBattery.scales.push(nestedScaleId);
            console.log(`    Created nested scale: ${nestedScaleId} with ${nestedScaleItems.length} items`);
          }

          return false; // Stop processing this table
        }
        return; // Skip single-cell rows that aren't factor headings
      }

      if (cells.length < 2) return;

      const firstCell = $(cells[0]).text().trim();
      const secondCell = $(cells[1]).text().trim();
      // Check if this row defines keying
      if (firstCell.includes('keyed')) {
        // Check for both regular minus and en dash (character code 8211)
        if (firstCell.includes('-') || firstCell.charCodeAt(0) === 8211 || firstCell.includes('−')) {
          currentKeying = -1;
        } else if (firstCell.includes('+')) {
          currentKeying = 1;
        }

        // If there's item text in the same row, process it
        if (secondCell && secondCell !== '&nbsp;') {
          const itemText = secondCell.trim();
          const normalizedText = itemText.toLowerCase();
          const itemIds = itemTextToIds.get(normalizedText);

          if (itemIds && itemIds.length > 0) {
            scaleItems.push({
              id: itemIds[0],
              keying: currentKeying
            });
            console.log(`  Added item: ${itemIds[0]} (${currentKeying > 0 ? '+' : '-'}) - ${itemText}`);
          } else {
            console.log(`  Warning: Item not found in items.json: "${itemText}"`);
          }
        }
      } else if (currentKeying !== null && secondCell && secondCell !== '&nbsp;') {
        // This is an item row
        const itemText = secondCell.trim();
        const normalizedText = itemText.toLowerCase();
        const itemIds = itemTextToIds.get(normalizedText);

        if (itemIds && itemIds.length > 0) {
          scaleItems.push({
            id: itemIds[0],
            keying: currentKeying
          });
          console.log(`  Added item: ${itemIds[0]} (${currentKeying > 0 ? '+' : '-'}) - ${itemText}`);
        } else {
          console.log(`  Warning: Item not found in items.json: "${itemText}"`);
        }
      }
    });

    // Only create the main scale if we didn't encounter a nested factor
    if (!nestedFactorDetected && scaleItems.length > 0) {
      // Create scale object
      const scaleId = `${testId}-${factorName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const scale = {
        id: scaleId,
        name: factorName,
        description: `${factorName} scale from ${testName}`,
        items: scaleItems
      };

      scales.push(scale);
      testBattery.scales.push(scaleId);

      console.log(`  Created scale: ${scaleId} with ${scaleItems.length} items`);
    }
  });

  return { scales, testBattery };
}

export { parseSimpleTest };

// Main execution (only run if this file is executed directly)
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: node parse-simple-test.js <html-file> <test-id> <test-name>');
    process.exit(1);
  }

  const [htmlFile, testId, ...testNameParts] = args;
  const testName = testNameParts.join(' ');

  const result = parseSimpleTest(htmlFile, testId, testName);

  console.log(`\n\nSummary:`);
  console.log(`  Scales created: ${result.scales.length}`);
  console.log(`  Total items: ${result.scales.reduce((sum, s) => sum + s.items.length, 0)}`);

  // Output the results
  console.log('\n\nScales JSON:');
  console.log(JSON.stringify(result.scales, null, 2));

  console.log('\n\nTest Battery JSON:');
  console.log(JSON.stringify(result.testBattery, null, 2));
}
