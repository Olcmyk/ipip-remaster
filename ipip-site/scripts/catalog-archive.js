import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHIVE_PATH = path.join(__dirname, '../public/archive/ipip-mirror/ipip.ori.org');
const OUTPUT_PATH = path.join(__dirname, '../public/data/archive-catalog.json');

/**
 * Categorize files
 */
function categorizeFile(filename) {
  const lower = filename.toLowerCase();

  if (lower.includes('key') || lower.includes('table') && !lower.includes('assignment')) {
    return 'test-batteries';
  }

  if (lower.includes('translation') ||
      ['arabic', 'armenian', 'chinese', 'croatian', 'danish', 'dutch', 'estonian',
       'farsi', 'french', 'german', 'hebrew', 'hungarian', 'icelandic', 'indonesian',
       'italian', 'japanese', 'korean', 'latvian', 'macedonian', 'mexican',
       'norwegian', 'portuguese', 'russian', 'serbian', 'slovene', 'spanish',
       'thai', 'turkish', 'urdu', 'vietnamese'].some(lang => lower.includes(lang))) {
    return 'translations';
  }

  if (lower.includes('technical') || lower.includes('report') || lower.endsWith('.pdf')) {
    return 'technical';
  }

  if (lower.includes('scoring') || lower.includes('interpreting') ||
      lower.includes('creating') || lower.includes('instruction') ||
      lower.includes('guide') || lower.includes('construction')) {
    return 'guides';
  }

  if (lower.includes('item') && (lower.includes('list') || lower.includes('assignment'))) {
    return 'reference';
  }

  if (lower.includes('about') || lower.includes('history') || lower.includes('rationale')) {
    return 'about';
  }

  return 'other';
}

/**
 * Generate title from filename
 */
function generateTitle(filename) {
  let title = filename.replace(/\.(htm|html|pdf|xlsx|docx)$/i, '');

  // Handle camelCase
  title = title.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Handle specific patterns
  title = title.replace(/new/gi, '');
  title = title.replace(/IPIP/g, 'IPIP');
  title = title.replace(/NEO/g, 'NEO');
  title = title.replace(/Key$/i, 'Scoring Key');

  // Capitalize words
  title = title.split(/[\s-_]+/).map(word => {
    if (word.length === 0) return word;
    if (['IPIP', 'NEO', 'VIA', 'CPI', 'PDF'].includes(word.toUpperCase())) {
      return word.toUpperCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');

  return title.trim();
}

/**
 * Generate description
 */
function generateDescription(filename, category) {
  const title = generateTitle(filename);

  switch (category) {
    case 'test-batteries':
      return `Scoring key and item list for ${title}`;
    case 'translations':
      return `Translated items for ${title}`;
    case 'technical':
      return `Technical documentation: ${title}`;
    case 'guides':
      return `Guide: ${title}`;
    case 'reference':
      return `Reference material: ${title}`;
    case 'about':
      return `About: ${title}`;
    default:
      return title;
  }
}

/**
 * Scan archive directory
 */
function scanArchive() {
  console.log('Scanning archive directory...\n');

  const files = fs.readdirSync(ARCHIVE_PATH);
  const documents = [];

  files.forEach(filename => {
    const filePath = path.join(ARCHIVE_PATH, filename);
    const stats = fs.statSync(filePath);

    // Skip directories and very small files
    if (stats.isDirectory() || stats.size < 100) {
      return;
    }

    const ext = path.extname(filename).toLowerCase();

    // Only process HTML and PDF files
    if (!['.htm', '.html', '.pdf', '.xlsx', '.docx'].includes(ext)) {
      return;
    }

    // Skip index.html if index.htm exists (avoid route conflicts)
    if (filename === 'index.html' && files.includes('index.htm')) {
      return;
    }

    const category = categorizeFile(filename);
    const type = ext === '.pdf' ? 'pdf' :
                 ['.xlsx', '.docx'].includes(ext) ? 'document' : 'html';

    documents.push({
      id: filename.replace(/\.(htm|html|pdf|xlsx|docx)$/i, '').toLowerCase(),
      title: generateTitle(filename),
      category: category,
      path: `/archive/ipip-mirror/ipip.ori.org/${filename}`,
      type: type,
      description: generateDescription(filename, category),
      filename: filename,
      size: stats.size
    });
  });

  // Sort by category, then by title
  documents.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.title.localeCompare(b.title);
  });

  return documents;
}

/**
 * Main execution
 */
function main() {
  console.log('Starting archive cataloging...\n');

  try {
    const documents = scanArchive();

    // Group by category
    const byCategory = {};
    documents.forEach(doc => {
      if (!byCategory[doc.category]) {
        byCategory[doc.category] = [];
      }
      byCategory[doc.category].push(doc);
    });

    // Write catalog
    const catalog = {
      totalDocuments: documents.length,
      categories: Object.keys(byCategory).sort(),
      byCategory: byCategory,
      allDocuments: documents
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(catalog, null, 2));

    console.log(`✓ Successfully cataloged ${documents.length} documents`);
    console.log('\nDocuments by category:');
    Object.keys(byCategory).sort().forEach(category => {
      console.log(`  ${category}: ${byCategory[category].length} documents`);
    });

    console.log(`\n✓ Catalog written to ${OUTPUT_PATH}`);

  } catch (error) {
    console.error('Error cataloging archive:', error);
    process.exit(1);
  }
}

main();
