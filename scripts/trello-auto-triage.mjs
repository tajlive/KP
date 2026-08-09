#!/usr/bin/env node
/**
 * Auto-triagem — Daglig klassifisering av Trello-kort
 * 
 * Flytter kort automatisk basert på regler:
 *   - «KRAV» eller «P0» → 🚨 Varsler
 *   - «deploy» eller «prod» → 🔄 Under arbeid
 *   - «plan» eller «design» → 📋 Backlog
 *   - Ingen aktivitet 7 dager → 📋 Backlog
 * 
 * Kjøres daglig kl. 06:00 via pg_cron.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Last .env.local
const envPath = resolve(process.cwd(), '.env.local');
readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && !key.startsWith('#') && vals.length) {
    process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const TRELLO_KEY = process.env.TRELLO_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const BOARD = '6a77a7ac73020977260a3931';

const LISTS = {
  INBOX: '6a77a7b7eeadaec0e034ea35',      // 📋 Funnet automatisk
  WIP: '6a77a7b7aeab4978fca6ced4',         // 🔄 Under arbeid
  ALERT: '6a77a7b720d121385c010083',      // 🚨 Varsler
  DONE: '6a77a7b8b35d65c4915efa39',      // ✅ Verifisert
  BACKLOG: '6a77a7b8b35d65c4915efa39',   // Gjenbruker DONE som backlog (ingen egen liste)
};

const RULES = [
  { pattern: /KRAV|P0|kritisk|critical/i, target: LISTS.ALERT, reason: 'Inneholder KRAV/P0' },
  { pattern: /deploy|prod|produksjon/i, target: LISTS.WIP, reason: 'Relatert til deploy/prod' },
  { pattern: /plan|design|arkitektur|masterplan/i, target: LISTS.BACKLOG, reason: 'Plan/design — backlog' },
];

async function getCards() {
  const res = await fetch(
    `https://api.trello.com/1/boards/${BOARD}/cards?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}&fields=name,desc,idList,dateLastActivity`
  );
  return res.json();
}

async function moveCard(cardId, listId, reason) {
  const res = await fetch(
    `https://api.trello.com/1/cards/${cardId}?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idList: listId })
    }
  );
  
  if (res.ok) {
    // Legg til kommentar
    await fetch(
      `https://api.trello.com/1/cards/${cardId}/actions/comments?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `Auto-triagem: ${reason}` })
      }
    );
    return true;
  }
  return false;
}

async function main() {
  const cards = await getCards();
  const inboxCards = cards.filter(c => c.idList === LISTS.INBOX);
  
  console.log(`Auto-triagem: ${inboxCards.length} kort i «Funnet automatisk»`);
  
  let moved = 0;
  for (const card of inboxCards) {
    const text = `${card.name} ${card.desc || ''}`;
    
    // Sjekk regler
    for (const rule of RULES) {
      if (rule.pattern.test(text)) {
        const success = await moveCard(card.id, rule.target, rule.reason);
        if (success) {
          console.log(`  → ${card.name.slice(0, 50)}... → ${rule.reason}`);
          moved++;
        }
        break;
      }
    }
    
    // Sjekk inaktivitet (7 dager)
    const lastActivity = new Date(card.dateLastActivity);
    const daysSince = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 7) {
      const success = await moveCard(card.id, LISTS.BACKLOG, `Ingen aktivitet på ${Math.round(daysSince)} dager`);
      if (success) {
        console.log(`  → ${card.name.slice(0, 50)}... → Inaktiv (${Math.round(daysSince)}d)`);
        moved++;
      }
    }
  }
  
  console.log(`Auto-triagem fullført: ${moved} kort flyttet`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
