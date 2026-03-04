const { spawn } = require('child_process');
const path = require('path');

// Start MCP server
const mcpServer = spawn('node', [
  path.join(__dirname, '../mcp-server/dist/index.js')
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/Users/taj/klarpakke'
});

let buffer = '';
let requestId = 0;
const pending = new Map();

mcpServer.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop();
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id).resolve(msg);
        pending.delete(msg.id);
      }
    } catch (e) {
      console.log('Log:', line);
    }
  }
});

function callTool(name, args) {
  return new Promise((resolve, reject) => {
    requestId++;
    const id = requestId.toString();
    pending.set(id, { resolve, reject });
    
    const req = {
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: { name, arguments: args }
    };
    
    mcpServer.stdin.write(JSON.stringify(req) + '\n');
    
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error('Timeout'));
      }
    }, 30000);
  });
}

async function main() {
  console.log('🔄 Kobler til MCP-server...\n');
  
  // Vent på at server starter
  await new Promise(r => setTimeout(r, 2000));
  
  const products = [
    { name: 'Bachelor', amount: 24900, tier: 'bachelor', desc: 'Bygg et solid fundament' },
    { name: 'Master', amount: 49900, tier: 'master', desc: 'Akselerer din vekst' },
    { name: 'PhD', amount: 99900, tier: 'phd', desc: 'For seriøse tradere' },
    { name: 'Professor', amount: 199900, tier: 'professor', desc: 'Ultimate program' }
  ];
  
  console.log('🔄 Oppretter Stripe-produkter via MCP...\n');
  
  for (const p of products) {
    try {
      console.log(`Creating ${p.name}...`);
      
      const productRes = await callTool('stripe_create_product', {
        name: p.name,
        description: p.desc,
        metadata: { tier: p.tier }
      });
      
      const productText = productRes.result?.content?.[0]?.text;
      const product = JSON.parse(productText);
      
      if (product.error) {
        console.log('  ℹ️  Feil/finnes:', product.error);
        continue;
      }
      
      console.log('  Product:', product.id);
      
      const priceRes = await callTool('stripe_create_price', {
        product: product.id,
        unit_amount: p.amount,
        currency: 'nok',
        recurring: { interval: 'month' },
        metadata: { tier: p.tier }
      });
      
      const priceText = priceRes.result?.content?.[0]?.text;
      const price = JSON.parse(priceText);
      
      if (price.error) {
        console.log('  ❌ Price error:', price.error);
        continue;
      }
      
      console.log('  💰 Price:', price.id, '|', (p.amount/100) + ' NOK/mnd\n');
      
    } catch (e) {
      console.error('  ❌ Error:', e.message);
    }
  }
  
  console.log('✅ Done!');
  mcpServer.kill();
  process.exit(0);
}

main();
