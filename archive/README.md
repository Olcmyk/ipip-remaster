# IPIP Archive Styling

This directory contains the archived HTML files from the original IPIP website with unified modern styling.

## What Was Done

All 170 HTML files in the archive have been updated with a consistent stylesheet (`archive-styles.css`) that matches the main website's design aesthetic.

## Design Features

- **Modern Typography**: Clean, readable fonts matching the main site
- **Color Scheme**: Gray/blue palette consistent with the Astro site
  - Background: `#f9fafb` (light gray)
  - Text: `#111827` (dark gray)
  - Links: `#2563eb` (blue)
  - Accents: Various shades of gray and blue
- **Responsive Design**: Mobile-friendly layouts
- **Enhanced Tables**: Clean borders, hover effects, proper spacing
- **Improved Readability**: Better line height, spacing, and contrast

## Files

- `archive-styles.css` - The unified stylesheet
- `ipip-mirror/ipip.ori.org/*.html` - All styled HTML files

## Maintenance

To re-apply styles to new HTML files or update existing ones:

```bash
node ../scripts/inject-styles.js
```

This script will:
1. Find all HTML files in the archive directory
2. Inject the stylesheet link if not already present
3. Calculate correct relative paths automatically

## Style Overrides

The CSS includes `!important` rules to override legacy inline styles while preserving the original HTML structure.
