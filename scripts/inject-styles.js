#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Find all HTML files in archive directory
function findHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findHtmlFiles(filePath, fileList);
    } else if (file.endsWith('.html') || file.endsWith('.htm')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Inject stylesheet link into HTML
function injectStylesheet(htmlPath, cssPath) {
  let html = fs.readFileSync(htmlPath, 'utf-8');

  // Calculate relative path from HTML file to CSS file
  const htmlDir = path.dirname(htmlPath);
  const relativeCssPath = path.relative(htmlDir, cssPath).replace(/\\/g, '/');

  const styleLink = `<link rel="stylesheet" href="${relativeCssPath}">`;

  // Check if stylesheet is already injected
  if (html.includes('archive-styles.css')) {
    console.log(`✓ Already styled: ${path.basename(htmlPath)}`);
    return false;
  }

  // Add toggle button and script
  const toggleButton = `<button id="style-toggle-btn" onclick="toggleStyles()">View Original</button>`;
  const toggleScript = `<script>
function toggleStyles() {
  const body = document.body;
  const btn = document.getElementById('style-toggle-btn');
  body.classList.toggle('no-custom-styles');
  if (body.classList.contains('no-custom-styles')) {
    btn.textContent = 'View Styled';
  } else {
    btn.textContent = 'View Original';
  }
}
</script>`;

  // Try to inject after <head> tag
  if (html.includes('<head>')) {
    html = html.replace(/<head>/i, `<head>\n${styleLink}`);
  }
  // If no <head>, try after <html>
  else if (html.includes('<html>')) {
    html = html.replace(/<html[^>]*>/i, match => `${match}\n<head>\n${styleLink}\n</head>`);
  }
  // If no proper structure, add at the beginning
  else {
    html = `<head>\n${styleLink}\n</head>\n${html}`;
  }

  // Inject button after first h1 tag
  if (html.match(/<h1[^>]*>[\s\S]*?<\/h1>/i)) {
    html = html.replace(/(<h1[^>]*>[\s\S]*?<\/h1>)/i, `$1${toggleButton}`);
  }
  // If no h1, inject before closing body tag
  else if (html.includes('</body>')) {
    html = html.replace(/<\/body>/i, `${toggleButton}\n</body>`);
  } else {
    html += `\n${toggleButton}`;
  }

  // Inject script before closing body tag, or at the end
  if (html.includes('</body>')) {
    html = html.replace(/<\/body>/i, `${toggleScript}\n</body>`);
  } else {
    html += `\n${toggleScript}`;
  }

  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log(`✓ Styled: ${path.basename(htmlPath)}`);
  return true;
}

// Main execution
const archiveDir = path.join(__dirname, '..', 'archive');
const cssFile = path.join(archiveDir, 'archive-styles.css');

console.log('🎨 Injecting unified styles into archive HTML files...\n');

const htmlFiles = findHtmlFiles(archiveDir);
let modifiedCount = 0;

htmlFiles.forEach(htmlFile => {
  if (injectStylesheet(htmlFile, cssFile)) {
    modifiedCount++;
  }
});

console.log(`\n✨ Done! Modified ${modifiedCount} of ${htmlFiles.length} HTML files.`);
