const https = require('https');
const http = require('http');

async function testEndpoint(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Testing questionnaire pages...\n');

  const tests = [
    'http://localhost:4321/tests/emotionalintelligence',
    'http://localhost:4321/tests/bigfivebroad'
  ];

  for (const url of tests) {
    console.log(`Testing: ${url}`);
    try {
      const result = await testEndpoint(url);

      // Check if developer mode button is in the HTML
      const hasDevButton = result.data.includes('Developer Mode') || result.data.includes('Dev Mode');

      console.log(`  Status: ${result.status}`);
      console.log(`  Developer Mode Button: ${hasDevButton ? '✓ Found' : '✗ Not found'}`);

      // Check for React hydration
      const hasReact = result.data.includes('react') || result.data.includes('React');
      console.log(`  React: ${hasReact ? '✓ Present' : '✗ Not found'}`);

      console.log('');
    } catch (error) {
      console.error(`  Error: ${error.message}\n`);
    }
  }

  console.log('\n📝 Manual Testing Instructions:');
  console.log('1. Open http://localhost:4321/tests/emotionalintelligence in your browser');
  console.log('2. Look for the "Developer Mode" button in the top-right of the question area');
  console.log('3. Click it to see scoring information (+/- keying) for each question');
  console.log('4. Test with http://localhost:4321/tests/bigfivebroad as well');
  console.log('\nThe developer mode will show:');
  console.log('  - Which scales each question belongs to');
  console.log('  - Whether it\'s positive (+) or negative (-) keying');
  console.log('  - How responses are scored (1→1 vs 1→5 for reversed items)');
}

main().catch(console.error);
