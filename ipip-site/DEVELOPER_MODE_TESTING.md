# Developer Mode Testing Guide

## Feature Overview
A "Developer Mode" button has been added to all questionnaire pages that displays scoring information for each question, showing:
- Which scales each question belongs to
- Whether the question uses positive (+) or negative (-) keying
- How responses are scored (direct 1→1 vs reversed 1→5)

## Manual Testing Instructions

### 1. Test Emotional Intelligence Questionnaire

1. Open your browser and navigate to:
   ```
   http://localhost:4321/tests/emotionalintelligence
   ```

2. Look for the "Developer Mode" button in the top-right corner of the question area (purple/gray button)

3. Click the button to activate Developer Mode
   - Button should turn purple and show "🔍 Dev Mode: ON"
   - Each question should now display a purple info box below it

4. Verify the scoring information shows:
   - Scale ID (e.g., "emotionalintelligence-empathy")
   - Keying type: "+ Positive Keying" (green) or "- Negative Keying (Reversed)" (red)
   - Score mapping: (1→1, 2→2, 3→3, 4→4, 5→5) or (1→5, 2→4, 3→3, 4→2, 5→1)
   - Item ID(s)

5. Click through multiple pages to verify Developer Mode persists

6. Click the button again to turn off Developer Mode
   - Button should return to gray
   - Scoring information should disappear

### 2. Test Big Five Broad Questionnaire

1. Navigate to:
   ```
   http://localhost:4321/tests/bigfive5broad
   ```

2. Repeat steps 2-6 from above

3. **Important**: Verify that the results page shows all 5 dimensions:
   - Extraversion
   - Agreeableness
   - Conscientiousness
   - Neuroticism (or Emotional Stability)
   - Openness to Experience

4. Complete the questionnaire with varied responses:
   - Use different response values (1-5) across questions
   - Ensure you answer all questions
   - Submit and check the results

5. Verify the results display:
   - All 5 scale names
   - Raw scores for each scale
   - Mean scores for each scale
   - Clear visual presentation (cards/sections for each dimension)

### 3. Additional Tests

Test these questionnaires as well:
- http://localhost:4321/tests/neodomains
- http://localhost:4321/tests/16pf
- http://localhost:4321/tests/mpq

For each:
1. Verify Developer Mode button appears
2. Verify scoring information displays correctly
3. Complete the questionnaire
4. Verify results show all expected scales

## Expected Behavior

### Developer Mode ON:
- Purple button with "🔍 Dev Mode: ON" text
- Purple info boxes below each question
- Scoring information clearly visible
- Green text for positive keying
- Red text for negative keying

### Developer Mode OFF:
- Gray button with "👨‍💻 Developer Mode" text
- No scoring information visible
- Normal questionnaire appearance

## Troubleshooting

If Developer Mode button doesn't appear:
1. Check browser console for errors (F12 → Console)
2. Verify the dev server is running
3. Hard refresh the page (Cmd+Shift+R or Ctrl+Shift+F5)

If scoring information doesn't show:
1. Check that the items have keying data in the scales
2. Verify the data is being passed correctly from [testId].astro
3. Check browser console for React errors

## Screenshots

Take screenshots of:
1. Developer Mode button (OFF state)
2. Developer Mode button (ON state)
3. Question with positive keying info displayed
4. Question with negative keying info displayed
5. Big Five results page showing all 5 dimensions

## Automated Testing (When Playwright is working)

Run the automated test script:
```bash
cd ipip-site
node test-questionnaires.cjs
```

This will:
- Test both emotionalintelligence and bigfive5broad
- Activate Developer Mode
- Take screenshots
- Fill out all questions
- Verify results display
- Save screenshots to the current directory
