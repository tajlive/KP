#!/usr/bin/env node

require('dotenv').config();
const https = require('https');

const WEBFLOW_TOKEN = process.env.WEBFLOW_API_TOKEN;
const SITE_ID = process.env.WEBFLOW_SITE_ID;

function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.webflow.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${WEBFLOW_TOKEN}`,
        'Accept-Version': '1.0.0',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('\n🔍 Fetching uploaded assets from Webflow...\n');

  const response = await makeRequest('GET', `/v2/sites/${SITE_ID}/assets`);

  if (response.status !== 200) {
    console.error('❌ Failed to fetch assets:', response.status);
    process.exit(1);
  }

  const assets = response.data.assets || [];

  if (assets.length === 0) {
    console.log('❌ No assets found. Upload files to Webflow Assets first.\n');
    process.exit(1);
  }

  console.log(`Found ${assets.length} total assets\n`);

  const urls = {};
  const targets = ['auth.js', 'login.js', 'app-with-auth.js', 'dashboard-roles.js', 'realtime.js'];

  // Try to match assets
  for (const asset of assets) {
    const name = (asset.name || '').toLowerCase();
    for (const target of targets) {
      const key = target.replace('.js', '').toLowerCase();
      if (name.includes(key)) {
        urls[target] = asset.url;
        console.log(`✅ ${target}`);
        console.log(`   ${asset.url}\n`);
      }
    }
  }

  // Check for missing
  const missing = targets.filter(t => !urls[t]);

  if (missing.length > 0) {
    console.log('❌ Missing these files:');
    missing.forEach(m => console.log(`   • ${m}`));
    console.log('\nMake sure all 5 critical files are uploaded to Webflow Assets.\n');
    process.exit(1);
  }

  console.log('========================================');
  console.log('✨ All 5 files found!\n');

  // Run deploy
  const { spawn } = require('child_process');

  const args = [
    'scripts/deploy-and-publish.js',
    urls['auth.js'],
    urls['login.js'],
    urls['app-with-auth.js'],
    urls['dashboard-roles.js'],
    urls['realtime.js']
  ];

  console.log('🚀 Starting deployment...\n');

  const proc = spawn('node', args, { stdio: 'inherit' });

  proc.on('exit', code => {
    process.exit(code);
  });
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
