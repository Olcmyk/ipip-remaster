#!/usr/bin/env node

const http = require('http');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, html: data }));
    }).on('error', reject);
  });
}

async function verifyDeveloperMode() {
  console.log('🔍 Verifying Developer Mode Implementation\n');
  console.log('='.repeat(70));

  const tests = [
    { id: 'emotionalintelligence', name: 'Emotional Intelligence' },
    { id: 'bigfive5broad', name: 'Big Five (5 Broad Factors)' },
    { id: 'neodomains', name: 'NEO Domains' }
  ];

  for (const test of tests) {
    const url = `http://localhost:4321/tests/${test.id}`;
    console.log(`\n📋 Testing: ${test.name}`);
    console.log(`   URL: ${url}`);

    try {
      const { status, html } = await fetchPage(url);

      // Check 1: Page loads
      const pageLoads = status === 200;
      console.log(`   ✓ Page loads: ${pageLoads ? 'YES' : 'NO'} (${status})`);

      if (!pageLoads) continue;

      // Check 2: Developer Mode button exists
      const hasDevButton = html.includes('Developer Mode') || html.includes('Dev Mode');
      console.log(`   ${hasDevButton ? '✓' : '✗'} Developer Mode button: ${hasDevButton ? 'FOUND' : 'NOT FOUND'}`);

      // Check 3: React component loaded
      const hasReact = html.includes('TestInterface') || html.includes('client:load');
      console.log(`   ${hasReact ? '✓' : '✗'} React component: ${hasReact ? 'LOADED' : 'NOT LOADED'}`);

      // Check 4: Items data present
      const hasItems = html.includes('"ids"') && html.includes('"text"');
      console.log(`   ${hasItems ? '✓' : '✗'} Items data: ${hasItems ? 'PRESENT' : 'MISSING'}`);

      // Check 5: Keying data present
      const hasKeying = html.includes('"keying"');
      console.log(`   ${hasKeying ? '✓' : '✗'} Keying data: ${hasKeying ? 'PRESENT' : 'MISSING'}`);

      // Check 6: Scales data present
      const hasScales = html.includes('"scales"');
      console.log(`   ${hasScales ? '✓' : '✗'} Scales data: ${hasScales ? 'PRESENT' : 'MISSING'}`);

    } catch (error) {
      console.log(`   ✗ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📝 Next Steps:');
  console.log('   1. Open http://localhost:4321/tests/emotionalintelligence in your browser');
  console.log('   2. Look for the "Developer Mode" button (top-right of questions)');
  console.log('   3. Click it to see scoring information (+/- keying)');
  console.log('   4. Complete a questionnaire and verify results display correctly');
  console.log('\n   See DEVELOPER_MODE_TESTING.md for detailed testing instructions');
  console.log('='.repeat(70));
}

verifyDeveloperMode().catch(console.error);
