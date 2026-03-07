#!/usr/bin/env node
/**
 * DNS + Linear Fix Script
 * 
 * Bruker Cloudflare API for å aktivere proxy på DNS-poster
 * og Linear API for å opprette oppgaver
 * 
 * Kjør: node scripts/fix-dns-and-linear.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// ═══════════════════════════════════════════════════════════════════════════
// KONFIGURASJON
// ═══════════════════════════════════════════════════════════════════════════

const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || 'din-zone-id';
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const LINEAR_API_KEY = process.env.LINEAR_API_KEY || 'lin_api_frbEcEyNxC8m5XhNaEn2bmn82AZtSEcG1vyTPb8W';

// DNS Record IDs fra Cloudflare (må oppdateres med faktiske verdier)
const DNS_RECORDS = {
  rootA: {
    id: 'record-id-for-root-a',  // Oppdater med faktisk ID
    name: 'klarpakke.no',
    type: 'A',
    content: '76.76.21.21',
  },
  wwwCNAME: {
    id: 'record-id-for-www-cname',  // Oppdater med faktisk ID
    name: 'www',
    type: 'CNAME',
    content: 'cname.vercel-dns.com',
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CLOUDFLARE API FUNKSJONER
// ═══════════════════════════════════════════════════════════════════════════

async function enableCloudflareProxy(recordId, recordName) {
  console.log(`🔄 Aktiverer Cloudflare proxy for ${recordName}...`);
  
  if (!CLOUDFLARE_API_TOKEN) {
    console.error('❌ CLOUDFLARE_API_TOKEN ikke satt');
    return { success: false, error: 'Mangler API token' };
  }
  
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${recordId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proxied: true,
        }),
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Proxy aktivert for ${recordName}`);
      return { success: true, data: data.result };
    } else {
      console.error(`❌ Feil ved aktivering av proxy for ${recordName}:`, data.errors);
      return { success: false, errors: data.errors };
    }
  } catch (error) {
    console.error(`❌ Exception ved aktivering av proxy for ${recordName}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function listDNSRecords() {
  console.log('📋 Henter DNS-poster fra Cloudflare...');
  
  if (!CLOUDFLARE_API_TOKEN) {
    console.error('❌ CLOUDFLARE_API_TOKEN ikke satt');
    return null;
  }
  
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records`,
      {
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        },
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Funnet ${data.result.length} DNS-poster`);
      return data.result;
    } else {
      console.error('❌ Feil ved henting av DNS-poster:', data.errors);
      return null;
    }
  } catch (error) {
    console.error('❌ Exception ved henting av DNS-poster:', error.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LINEAR API FUNKSJONER
// ═══════════════════════════════════════════════════════════════════════════

async function createLinearIssue({ title, description, teamId, labelIds = [] }) {
  console.log(`📝 Oppretter Linear-issue: ${title}...`);
  
  try {
    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': LINEAR_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation IssueCreate($input: IssueCreateInput!) {
            issueCreate(input: $input) {
              success
              issue {
                id
                identifier
                title
                url
              }
            }
          }
        `,
        variables: {
          input: {
            title,
            description,
            teamId,
            labelIds,
          },
        },
      }),
    });
    
    const data = await response.json();
    
    if (data.data?.issueCreate?.success) {
      const issue = data.data.issueCreate.issue;
      console.log(`✅ Issue opprettet: ${issue.identifier} - ${issue.url}`);
      return { success: true, issue };
    } else {
      console.error('❌ Feil ved opprettelse av issue:', data.errors);
      return { success: false, errors: data.errors };
    }
  } catch (error) {
    console.error('❌ Exception ved opprettelse av issue:', error.message);
    return { success: false, error: error.message };
  }
}

async function getLinearTeams() {
  console.log('📋 Henter Linear-team...');
  
  try {
    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': LINEAR_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query Teams {
            teams {
              nodes {
                id
                name
                key
              }
            }
          }
        `,
      }),
    });
    
    const data = await response.json();
    
    if (data.data?.teams?.nodes) {
      console.log(`✅ Funnet ${data.data.teams.nodes.length} team(s)`);
      return data.data.teams.nodes;
    } else {
      console.error('❌ Feil ved henting av teams:', data.errors);
      return null;
    }
  } catch (error) {
    console.error('❌ Exception ved henting av teams:', error.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HOVEDFUNKSJON
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  DNS + Linear Fix Script - Klarpakke Lansering                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log();
  
  // Sjekk miljøvariabler
  const missingVars = [];
  if (!CLOUDFLARE_API_TOKEN) missingVars.push('CLOUDFLARE_API_TOKEN');
  if (!CLOUDFLARE_ZONE_ID || CLOUDFLARE_ZONE_ID === 'din-zone-id') missingVars.push('CLOUDFLARE_ZONE_ID');
  
  if (missingVars.length > 0) {
    console.log('⚠️  Manglende miljøvariabler:');
    missingVars.forEach(v => console.log(`   - ${v}`));
    console.log();
    console.log('📝 MANUELL FREMGANGSMÅTE:');
    console.log('═══════════════════════════════════════════════════════════════════');
    printManualInstructions();
    return;
  }
  
  // 1. Hent DNS-poster for å finne riktige IDs
  console.log('STEP 1: Henter DNS-poster...');
  const dnsRecords = await listDNSRecords();
  
  if (!dnsRecords) {
    console.log('❌ Kunne ikke hente DNS-poster. Avbryter.');
    return;
  }
  
  // Finn A-record for root og CNAME for www
  const rootARecord = dnsRecords.find(r => r.type === 'A' && r.name === 'klarpakke.no');
  const wwwCnameRecord = dnsRecords.find(r => r.type === 'CNAME' && r.name === 'www.klarpakke.no');
  
  if (!rootARecord || !wwwCnameRecord) {
    console.log('❌ Kunne ikke finne nødvendige DNS-poster:');
    console.log(`   Root A: ${rootARecord ? 'Funnet' : 'Mangler'}`);
    console.log(`   WWW CNAME: ${wwwCnameRecord ? 'Funnet' : 'Mangler'}`);
    return;
  }
  
  console.log(`✅ Funnet DNS-poster:`);
  console.log(`   Root A: ${rootARecord.id}`);
  console.log(`   WWW CNAME: ${wwwCnameRecord.id}`);
  console.log();
  
  // 2. Aktiver proxy på DNS-poster
  console.log('STEP 2: Aktiverer Cloudflare proxy...');
  const rootResult = await enableCloudflareProxy(rootARecord.id, 'klarpakke.no (A)');
  const wwwResult = await enableCloudflareProxy(wwwCnameRecord.id, 'www.klarpakke.no (CNAME)');
  console.log();
  
  // 3. Hent Linear-team
  console.log('STEP 3: Oppretter Linear-oppgaver...');
  const teams = await getLinearTeams();
  
  if (!teams || teams.length === 0) {
    console.log('❌ Kunne ikke finne Linear-team. Avbryter opprettelse av oppgaver.');
    return;
  }
  
  const team = teams[0]; // Bruk første team
  console.log(`✅ Bruker team: ${team.name} (${team.key})`);
  console.log();
  
  // 4. Opprett Linear-oppgaver
  const issuesToCreate = [
    {
      title: 'DNS: Aktiver Cloudflare proxy for root domain (klarpakke.no)',
      description: `## Oppgave
Aktiver Cloudflare proxy (oransje sky) for A-record på rot-domenet.

## Nåværende status
- Type: A
- Navn: klarpakke.no
- Verdi: 76.76.21.21
- Proxy: ${rootResult.success ? '✅ Aktivert' : '❌ Deaktivert'}

## Hvorfor
- DDoS-beskyttelse
- Global CDN/caching
- SSL/TLS terminering
- Bedre ytelse

## Referanser
- Cloudflare Dashboard: https://dash.cloudflare.com
- Vercel Docs: https://vercel.com/docs/concepts/edge-network/dns
`,
    },
    {
      title: 'DNS: Aktiver Cloudflare proxy for www subdomain',
      description: `## Oppgave
Aktiver Cloudflare proxy (oransje sky) for CNAME-record på www-subdomenet.

## Nåværende status
- Type: CNAME
- Navn: www
- Verdi: cname.vercel-dns.com
- Proxy: ${wwwResult.success ? '✅ Aktivert' : '❌ Deaktivert'}

## Hvorfor
- DDoS-beskyttelse
- Global CDN/caching
- SSL/TLS terminering
- Bedre ytelse

## Referanser
- Cloudflare Dashboard: https://dash.cloudflare.com
`,
    },
    {
      title: 'Verifiser DNS-oppdateringer etter lansering',
      description: `## Sjekkliste
Etter at Cloudflare proxy er aktivert, verifiser følgende:

### DNS-sjekk
- [ ] \`dig klarpakke.no\` returnerer Cloudflare IPs (ikke 76.76.21.21)
- [ ] \`dig www.klarpakke.no\` returnerer Cloudflare CNAME
- [ ] HTTPS fungerer på https://klarpakke.no
- [ ] HTTPS fungerer på https://www.klarpakke.no
- [ ] www redirecter til non-www (eller omvendt, etter preferanse)

### Vercel-sjekk
- [ ] Domene vises som "Valid" i Vercel Dashboard
- [ ] SSL-sertifikat er utstedt
- [ ] Ingen DNS-feil i Vercel

### Ytelse/sikkerhet
- [ ] Cloudflare Analytics viser trafikk
- [ ] Response headers inkluderer \`cf-ray\`
- [ ] Sjekk at caching fungerer (Cache-Control headers)
`,
    },
  ];
  
  for (const issueData of issuesToCreate) {
    await createLinearIssue({
      ...issueData,
      teamId: team.id,
    });
    console.log();
  }
  
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  Ferdig!                                                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
}

function printManualInstructions() {
  console.log(`
1. CLOUDFLARE DNS-KONFIGURASJON
═══════════════════════════════════════════════════════════════════

   a) Gå til https://dash.cloudflare.com
   b) Velg zone: klarpakke.no
   c) Gå til "DNS" → "Records"
   
   d) Finn A-record:
      - Name: klarpakke.no
      - IPv4: 76.76.21.21
      - Klikk på "Edit"
      - Skru PÅ "Proxy status" (oransje sky)
      - Lagre
   
   e) Finn CNAME-record:
      - Name: www
      - Target: cname.vercel-dns.com
      - Klikk på "Edit"
      - Skru PÅ "Proxy status" (oransje sky)
      - Lagre

2. LINEAR-OPPGAVES
═══════════════════════════════════════════════════════════════════

   Opprett følgende issues i team KLA:
   
   Issue 1:
   - Tittel: "DNS: Aktiver Cloudflare proxy for root domain"
   - Beskrivelse: Aktiver proxy (oransje sky) for A-record klarpakke.no
   
   Issue 2:
   - Tittel: "DNS: Aktiver Cloudflare proxy for www subdomain"
   - Beskrivelse: Aktiver proxy (oransje sky) for CNAME www
   
   Issue 3:
   - Tittel: "Verifiser DNS-oppdateringer etter lansering"
   - Beskrivelse: Sjekkliste for å verifisere at alt fungerer

3. VERIFISERING
═══════════════════════════════════════════════════════════════════

   Etter endringer, kjør:
   
   # Sjekk at DNS peker til Cloudflare
   dig klarpakke.no
   
   # Forventet resultat: IP-adresser som starter med 104. eller 172.
   # (Ikke 76.76.21.21 lenger)
   
   # Sjekk headers
   curl -I https://klarpakke.no
   
   # Se etter: cf-ray header (indikerer Cloudflare)
`);
}

// Kjør hovedfunksjonen
main().catch(console.error);
