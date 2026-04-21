#!/usr/bin/env node
/**
 * Sanity Auto-Setup — Synkroniser secrets til Vercel
 *
 * Bruk:
 *   VERCEL_TOKEN=<token> PROJECT_ID=<id> node scripts/sanity-auto-setup.mjs
 */

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = process.env.PROJECT_ID;

const SANITY_READ = process.env.SANITY_READ;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!VERCEL_TOKEN || !PROJECT_ID) {
  console.error('Mangler VERCEL_TOKEN eller PROJECT_ID');
  process.exit(1);
}

const secrets = [
  { key: 'NEXT_PUBLIC_SANITY_PROJECT_ID', value: '63qn23si', target: ['production', 'preview', 'development'] },
  { key: 'NEXT_PUBLIC_SANITY_DATASET', value: 'production', target: ['production', 'preview', 'development'] },
  { key: 'NEXT_PUBLIC_SANITY_API_VERSION', value: '2024-04-07', target: ['production', 'preview', 'development'] },
  { key: 'SANITY_API_READ_TOKEN', value: SANITY_READ, target: ['production', 'preview'] },
  { key: 'SANITY_WEBHOOK_SECRET', value: WEBHOOK_SECRET, target: ['production', 'preview'] },
];

async function listEnvs() {
  const r = await fetch(`https://api.vercel.com/v10/projects/${PROJECT_ID}/env?decrypt=false`, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
  });
  if (!r.ok) {
    console.error(`Kunne ikke liste envs: ${r.status}`);
    return [];
  }
  const data = await r.json();
  return data.envs || [];
}

async function deleteEnv(id) {
  const r = await fetch(`https://api.vercel.com/v10/projects/${PROJECT_ID}/env/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
  });
  return r.ok;
}

async function createEnv(s) {
  const r = await fetch(`https://api.vercel.com/v10/projects/${PROJECT_ID}/env`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key: s.key,
      value: s.value,
      type: 'encrypted',
      target: s.target,
    }),
  });
  return r.ok;
}

async function main() {
  console.log(`Henter eksisterende envs for ${PROJECT_ID}...`);
  const existing = await listEnvs();
  console.log(`Fant ${existing.length} eksisterende envs\n`);

  for (const s of secrets) {
    // Slett alle eksisterende entries for denne key
    const toDelete = existing.filter(e => e.key === s.key);
    for (const e of toDelete) {
      const ok = await deleteEnv(e.id);
      if (ok) {
        console.log(`   🗑️  Slettet ${s.key} (${e.target?.join?.(',') || e.target})`);
      }
    }

    // Opprett på nytt
    const ok = await createEnv(s);
    if (ok) {
      console.log(`✅ ${s.key} opprettet (${s.target.join(',')})`);
    } else {
      console.error(`❌ ${s.key} feilet ved opprettelse`);
    }
  }

  console.log('\nFerdig.');
}

main();
