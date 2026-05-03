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
  const toggleButton = `<button id="style-toggle-btn" onclick="toggleStyles()">显示原始样式</button>`;
  const toggleScript = `<script>
function toggleStyles() {
  const body = document.body;
  const btn = document.getElementById('style-toggle-btn');
  body.classList.toggle('no-custom-styles');
  if (body.classList.contains('no-custom-styles')) {
    btn.textContent = '显示现代样式';
  } else {
    btn.textContent = '显示原始样式';
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

  // Inject button and script before closing body tag, or at the end
  if (html.includes('</body>')) {
    html = html.replace(/<\/body>/i, `${toggleButton}\n${toggleScript}\n</body>`);
  } else {
    html += `\n${toggleButton}\n${toggleScript}`;
  }

  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log(`✓ Styled: ${path.basename(htmlPath)}`);
  return true;
}

// Main execution
const publicArchiveDir = path.join(__dirname, '..', 'ipip-site', 'public', 'archive');
const cssFile = path.join(publicArchiveDir, 'archive-styles.css');

console.log('🎨 Injecting unified styles into public archive HTML files...\n');

const htmlFiles = findHtmlFiles(publicArchiveDir);
let modifiedCount = 0;

htmlFiles.forEach(htmlFile => {
  if (injectStylesheet(htmlFile, cssFile)) {
    modifiedCount++;
  }
});

console.log(`\n✨ Done! Modified ${modifiedCount} of ${htmlFiles.length} HTML files.`);
