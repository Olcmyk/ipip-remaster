#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Find all HTML files in archive directory
function findHtmlFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory ${dir} does not exist, skipping...`);
    return fileList;
  }

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

// Remove injected styles from HTML
function removeInjectedStyles(htmlPath) {
  let html = fs.readFileSync(htmlPath, 'utf-8');
  let modified = false;

  // Remove stylesheet link
  if (html.includes('archive-styles.css')) {
    html = html.replace(/<link rel="stylesheet" href="[^"]*archive-styles\.css">\n?/g, '');
    modified = true;
  }

  // Remove toggle button
  if (html.includes('style-toggle-btn')) {
    html = html.replace(/<button id="style-toggle-btn"[^>]*>.*?<\/button>\n?/g, '');
    modified = true;
  }

  // Remove toggle script
  if (html.includes('toggleStyles')) {
    html = html.replace(/<script>\s*function toggleStyles\(\)[\s\S]*?<\/script>\n?/g, '');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(htmlPath, html, 'utf-8');
    return true;
  }
  return false;
}

// Main execution
const distArchiveDir = path.join(__dirname, '..', 'ipip-site', 'dist', 'archive');

console.log('🧹 Cleaning injected styles from dist archive HTML files...\n');

const htmlFiles = findHtmlFiles(distArchiveDir);
let cleanedCount = 0;

htmlFiles.forEach(htmlFile => {
  if (removeInjectedStyles(htmlFile)) {
    cleanedCount++;
  }
});

console.log(`✨ Done! Cleaned ${cleanedCount} of ${htmlFiles.length} HTML files.`);
