#!/usr/bin/env node
/**
 * Vercel Post-DNS Configuration Script
 * 
 * Sjekker Vercel-konfigurasjon og oppretter Linear-oppgaver
 */

const LINEAR_API_KEY = 'lin_api_frbEcEyNxC8m5XhNaEn2bmn82AZtSEcG1vyTPb8W';
const VERCEL_TOKEN = 'vcp_1YJ1ukq0yRb4472X7pqIntErOUJE7OuoCaOr2Qmh4okCjJSoAT1ltdRp';

async function linearGraphQL(query, variables = {}) {
  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Authorization': LINEAR_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  return response.json();
}

async function vercelAPI(endpoint) {
  const response = await fetch(`https://api.vercel.com/v9${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
    },
  });
  return response.json();
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  VERCEL POST-DNS KONFIGURASJON                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // 1. Sjekk Vercel prosjekt
  console.log('📋 1. Sjekker Vercel prosjektkonfigurasjon...\n');
  
  const projects = await vercelAPI('/projects?limit=10');
  const project = projects.projects?.find(p => p.name === 'klarpakke');
  
  if (!project) {
    console.log('❌ Fant ikke klarpakke-prosjektet');
    return;
  }
  
  console.log(`✅ Prosjekt funnet: ${project.name}`);
  console.log(`   ID: ${project.id}`);
  console.log(`   Framework: ${project.framework || 'Next.js'}`);
  
  // Hent domene-konfigurasjon
  const domains = await vercelAPI(`/projects/${project.id}/domains`);
  console.log(`\n🌐 Konfigurerte domener:`);
  
  if (!domains.domains || domains.domains.length === 0) {
    console.log('   ⚠️  Ingen custom domener konfigurert ennå!');
  } else {
    for (const domain of domains.domains) {
      const verified = domain.verified ? '✅' : '❌';
      console.log(`   ${verified} ${domain.name}`);
      console.log(`      Verified: ${domain.verified}`);
      console.log(`      Git Branch: ${domain.gitBranch || 'production'}`);
    }
  }
  
  // 2. Sjekk production deployment
  console.log('\n📋 2. Sjekker siste production deployment...\n');
  
  const deployments = await vercelAPI(`/projects/${project.id}/deployments?limit=5`);
  const prodDeploy = deployments.deployments?.find(d => d.target === 'production');
  
  if (prodDeploy) {
    console.log(`✅ Siste production deploy:`);
    console.log(`   URL: ${prodDeploy.url}`);
    console.log(`   State: ${prodDeploy.state}`);
    console.log(`   Created: ${new Date(prodDeploy.createdAt).toLocaleString()}`);
  }
  
  // 3. Opprett Linear-oppgaver
  console.log('\n📋 3. Oppretter Linear-oppgaver...\n');
  
  const teamsResult = await linearGraphQL(`query Teams { teams { nodes { id name key } } }`);
  const team = teamsResult.data?.teams?.nodes[0];
  
  if (!team) {
    console.log('❌ Fant ikke Linear-team');
    return;
  }
  
  const issues = [
    {
      title: 'Vercel: Konfigurer custom domain (klarpakke.no + www)',
      description: `## Oppgave
Konfigurer custom domain i Vercel Dashboard.

## Nåværende status
${domains.domains?.length > 0 
  ? '✅ Domener er allerede konfigurert' 
  : '⚠️  Ingen custom domener konfigurert'}

## Sjekkliste
- [ ] Gå til https://vercel.com/dashboard → klarpakke → Settings → Domains
- [ ] Legg til \