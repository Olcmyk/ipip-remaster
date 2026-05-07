const { chromium } = require('playwright');

async function testQuestionnaire(testId, testName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${testName} (${testId})`);
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to test
    await page.goto(`http://localhost:4321/tests/${testId}`);
    await page.waitForLoadState('networkidle');

    console.log('✓ Page loaded');

    // Check if developer mode button exists
    const devButton = await page.locator('button:has-text("Developer Mode")');
    if (await devButton.count() > 0) {
      console.log('✓ Developer Mode button found');

      // Click developer mode
      await devButton.click();
      await page.waitForTimeout(500);
      console.log('✓ Developer Mode activated');

      // Take screenshot with dev mode
      await page.screenshot({ path: `${testId}-devmode.png`, fullPage: true });
      console.log(`✓ Screenshot saved: ${testId}-devmode.png`);
    }

    // Count total questions
    const questionElements = await page.locator('[class*="border-b border-gray-200"]').count();
    console.log(`✓ Found ${questionElements} questions on first page`);

    // Fill out all questions with varied responses
    let pageNum = 1;
    let totalAnswered = 0;

    while (true) {
      console.log(`\nPage ${pageNum}:`);

      // Get all questions on current page
      const questions = await page.locator('[class*="border-b border-gray-200"]').all();

      for (let i = 0; i < questions.length; i++) {
        // Alternate between different responses (1-5)
        const responseValue = (totalAnswered % 5) + 1;

        // Find radio buttons within this question
        const radioButtons = await questions[i].locator('input[type="radio"]').all();

        if (radioButtons.length > 0) {
          // Click the radio button corresponding to our response value
          await radioButtons[responseValue - 1].click();
          totalAnswered++;
        }
      }

      console.log(`  Answered ${questions.length} questions (total: ${totalAnswered})`);

      // Check if there's a Next button or Submit button
      const nextButton = await page.locator('button:has-text("Next")');
      const submitButton = await page.locator('button:has-text("Submit Test")');

      if (await submitButton.count() > 0) {
        console.log('  Found Submit button - this is the last page');
        await submitButton.click();
        await page.waitForTimeout(1000);
        break;
      } else if (await nextButton.count() > 0) {
        await nextButton.click();
        await page.waitForTimeout(500);
        pageNum++;
      } else {
        console.log('  No navigation buttons found');
        break;
      }
    }

    console.log(`\n✓ Completed all ${totalAnswered} questions`);

    // Wait for results to load
    await page.waitForTimeout(2000);

    // Check for results
    const resultsHeading = await page.locator('h2, h3').filter({ hasText: /results|scores/i });
    if (await resultsHeading.count() > 0) {
      console.log('✓ Results page loaded');
    }

    // Get all scale scores
    const scaleElements = await page.locator('[class*="border"], [class*="card"]').all();
    console.log(`\n📊 Results Summary:`);
    console.log('-'.repeat(60));

    // Try to extract scale names and scores
    const textContent = await page.textContent('body');

    // Look for scale patterns
    const scaleMatches = textContent.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:Raw Score|Score):\s*(\d+(?:\.\d+)?)/gi);

    if (scaleMatches) {
      scaleMatches.forEach(match => {
        console.log(`  ${match}`);
      });
    } else {
      // Fallback: just show some of the results text
      const resultsText = textContent.substring(textContent.indexOf('Results'), textContent.indexOf('Results') + 500);
      console.log(resultsText);
    }

    // Take screenshot of results
    await page.screenshot({ path: `${testId}-results.png`, fullPage: true });
    console.log(`\n✓ Results screenshot saved: ${testId}-results.png`);

    // Export results as JSON if available
    const exportButton = await page.locator('button:has-text("Export")');
    if (await exportButton.count() > 0) {
      console.log('✓ Export functionality available');
    }

  } catch (error) {
    console.error(`❌ Error testing ${testId}:`, error.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  const tests = [
    { id: 'emotionalintelligence', name: 'Emotional Intelligence' },
    { id: 'bigfive5broad', name: 'Big Five Broad' }
  ];

  for (const test of tests) {
    await testQuestionnaire(test.id, test.name);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('All tests completed!');
  console.log('='.repeat(60));
}

main().catch(console.error);
