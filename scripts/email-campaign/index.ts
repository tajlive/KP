/**
 * E-POST KAMPANJE - 100 STUDENTER PÅ 24 TIMER
 * 
 * Bruk:
 * 1. Eksporter LinkedIn-nettverk til CSV
 * 2. Kjør: node scripts/email-campaign/index.ts --import linkedin.csv
 * 3. Kjør: node scripts/email-campaign/index.ts --send
 * 4. Kjør: node scripts/email-campaign/index.ts --followup
 */

import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { createHash } from 'crypto';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY mangler i .env');
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

// Konfigurasjon
const CAMPAIGN_CONFIG = {
  from: 'Tom Jensen <tom@klarpakke.no>',
  replyTo: 'tom@klarpakke.no',
  batchSize: 50,        // E-poster per batch (Resend limit)
  batchDelay: 60000,    // 1 minutt mellom batches
  dailyLimit: 100,      // Maks per dag (warmup)
};

interface Contact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  position?: string;
  source: 'linkedin' | 'manual';
  status: 'pending' | 'sent' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed';
  sentAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  tags: string[];
}

interface CampaignStats {
  total: number;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  conversionRate: number;
}

// ==================== CSV IMPORT ====================

function importLinkedInCSV(filePath: string): Contact[] {
  console.log(`📁 Importerer ${filePath}...`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
  });

  const contacts: Contact[] = records
    .filter((r: any) => r.Email && r.Email.includes('@'))
    .map((r: any) => ({
      id: createHash('md5').update(r.Email).digest('hex').substring(0, 12),
      email: r.Email.toLowerCase().trim(),
      firstName: r['First Name'] || r.FirstName || '',
      lastName: r['Last Name'] || r.LastName || '',
      company: r.Company || r.Organization || '',
      position: r.Position || r.Title || '',
      source: 'linkedin',
      status: 'pending',
      tags: ['linkedin-network', 'founder-campaign'],
    }));

  // Fjern duplikater
  const unique = new Map<string, Contact>();
  contacts.forEach(c => unique.set(c.email, c));
  
  console.log(`✅ Importert ${unique.size} unike kontakter`);
  return Array.from(unique.values());
}

// ==================== E-POST TEMPLATES ====================

function getEmailTemplate(contact: Contact, sequence: number = 1): { subject: string; html: string; text: string } {
  const firstName = contact.firstName || 'hei';
  
  const templates: Record<number, { subject: string; html: string; text: string }> = {
    // E-POST 1: Introduksjon
    1: {
      subject: `${firstName}, jeg trenger din hjelp (100 grunnleggere)`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Klarpakke Universitet</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  
  <p>Hei ${firstName},</p>
  
  <p>Jeg skriver til deg fordi ${contact.position ? `jeg ser du jobber med ${contact.position.toLowerCase()}` : 'vi er i samme nettverk'}.</p>
  
  <p><strong>Om 30 dager lanserer jeg Norges første krypto-universitet.</strong></p>
  
  <p>Etter å ha tapt 65 000 kr på krypto i 2021, brukte jeg 2 år på å bygge et sted der NORDMENN kan lære trading <em>uten</em> å risikere sparepengene.</p>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #1a73e8;">🎓 De første 100 blir "grunnleggere":</h3>
    <ul style="padding-left: 20px;">
      <li>✅ <strong>10 000 KLT tokens</strong> (kan bli verdt noe)</li>
      <li>✅ <strong>1 000 000 kr</strong> i øvingspenger</li>
      <li>✅ <strong>Lifetime support</strong> fra meg personlig</li>
      <li>✅ <strong>VIP-status</strong> for alltid</li>
    </ul>
  </div>
  
  <p style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; border-radius: 4px;">
    ⚠️ <strong>Kun 47 plasser igjen.</strong> 53 har allerede meldt seg.
  </p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://www.klarpakke.no/no/auth/signup?ref=email-campaign&utm_source=email&utm_medium=linkedin-network&utm_campaign=founder-100" 
       style="background: #1a73e8; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
      Reserver min plass nå →
    </a>
  </div>
  
  <p>Ingen forpliktelser. Ingen betalingsinfo nødvendig. Bare en plass blant de første 100.</p>
  
  <p>Spørsmål? Bare svar på denne e-posten.</p>
  
  <p>Beste hilsen,<br>
  <strong>Tom Jensen</strong><br>
  Grunnlegger, Klarpakke Universitet<br>
  📧 tom@klarpakke.no</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="font-size: 12px; color: #666;">
    Du mottar denne fordi vi er kontakter på LinkedIn. 
    <a href="{{unsubscribe_url}}">Meld meg av</a>
  </p>
  
  <img src="https://www.klarpakke.no/api/track/open?id=${contact.id}&seq=1" width="1" height="1" alt="">
</body>
</html>`,
      text: `Hei ${firstName},

Jeg skriver til deg fordi ${contact.position ? `jeg ser du jobber med ${contact.position.toLowerCase()}` : 'vi er i samme nettverk'}.

Om 30 dager lanserer jeg Norges første krypto-universitet.

Etter å ha tapt 65 000 kr på krypto i 2021, brukte jeg 2 år på å bygge et sted der NORDMENN kan lære trading uten å risikere sparepengene.

🎓 DE FØRSTE 100 BLIR "GRUNNLEGGERE":

✅ 10 000 KLT tokens (kan bli verdt noe)
✅ 1 000 000 kr i øvingspenger  
✅ Lifetime support fra meg personlig
✅ VIP-status for alltid

⚠️ KUN 47 PLASSER IGJEN. 53 har allerede meldt seg.

Reserver din plass: https://www.klarpakke.no/no/auth/signup?ref=email-campaign

Ingen forpliktelser. Ingen betalingsinfo nødvendig.

Spørsmål? Bare svar på denne e-posten.

Beste hilsen,
Tom Jensen
Grunnlegger, Klarpakke Universitet
📧 tom@klarpakke.no

---
Du mottar denne fordi vi er kontakter på LinkedIn.
Meld av: {{unsubscribe_url}}`
    },
    
    // E-POST 2: Påminnelse (sendes etter 48 timer)
    2: {
      subject: `Fortsatt interessert, ${firstName}? (37 plasser igjen)`,
      html: `// ... påminnelse template`,
      text: `// ... påminnelse text`
    },
    
    // E-POST 3: Siste sjanse (sendes etter 5 dager)
    3: {
      subject: `Siste sjanse, ${firstName} - 12 plasser igjen`,
      html: `// ... siste sjanse template`,
      text: `// ... siste sjanse text`
    },
  };

  return templates[sequence] || templates[1];
}

// ==================== SENDE FUNKSJONER ====================

async function sendBatch(contacts: Contact[], sequence: number = 1): Promise<void> {
  console.log(`\n📤 Sender batch på ${contacts.length} e-poster (sekvens ${sequence})...`);
  
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const template = getEmailTemplate(contact, sequence);
    
    try {
      const { data, error } = await resend.emails.send({
        from: CAMPAIGN_CONFIG.from,
        to: contact.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        replyTo: CAMPAIGN_CONFIG.replyTo,
        tags: [
          { name: 'campaign', value: 'founder-100' },
          { name: 'sequence', value: String(sequence) },
          { name: 'source', value: contact.source },
        ],
      });

      if (error) {
        console.error(`❌ Feil ved sending til ${contact.email}:`, error);
        contact.status = 'bounced';
      } else {
        console.log(`✅ Sendt til ${contact.email} (${i + 1}/${contacts.length})`);
        contact.status = 'sent';
        contact.sentAt = new Date();
      }

      // Rate limiting - 100ms mellom hver e-post
      await sleep(100);
      
    } catch (err) {
      console.error(`❌ Exception ved sending til ${contact.email}:`, err);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== DATABASE / STORAGE ====================

const DB_PATH = path.join(__dirname, 'campaign-data.json');

function loadContacts(): Contact[] {
  if (!fs.existsSync(DB_PATH)) return [];
  const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  return data.contacts || [];
}

function saveContacts(contacts: Contact[]): void {
  fs.writeFileSync(DB_PATH, JSON.stringify({ 
    contacts,
    updatedAt: new Date().toISOString()
  }, null, 2));
  console.log(`💾 Lagret ${contacts.length} kontakter`);
}

function getStats(contacts: Contact[]): CampaignStats {
  const total = contacts.length;
  const sent = contacts.filter(c => c.status === 'sent').length;
  const opened = contacts.filter(c => c.openedAt).length;
  const clicked = contacts.filter(c => c.clickedAt).length;
  const bounced = contacts.filter(c => c.status === 'bounced').length;
  const unsubscribed = contacts.filter(c => c.status === 'unsubscribed').length;
  
  return {
    total,
    sent,
    opened,
    clicked,
    bounced,
    unsubscribed,
    conversionRate: total > 0 ? (clicked / total) * 100 : 0,
  };
}

// ==================== KOMMANDOER ====================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case '--import':
      const csvPath = args[1];
      if (!csvPath) {
        console.error('❌ Bruk: --import <sti/til/linkedin.csv>');
        process.exit(1);
      }
      const newContacts = importLinkedInCSV(csvPath);
      const existing = loadContacts();
      const merged = [...existing, ...newContacts];
      saveContacts(merged);
      console.log(`📊 Totalt: ${merged.length} kontakter i databasen`);
      break;

    case '--send':
      const contacts = loadContacts().filter(c => c.status === 'pending');
      if (contacts.length === 0) {
        console.log('✅ Ingen ventende kontakter å sende til');
        break;
      }
      console.log(`🚀 Klar til å sende til ${contacts.length} kontakter`);
      
      // Send i batcher
      for (let i = 0; i < contacts.length; i += CAMPAIGN_CONFIG.batchSize) {
        const batch = contacts.slice(i, i + CAMPAIGN_CONFIG.batchSize);
        await sendBatch(batch, 1);
        saveContacts(loadContacts()); // Lagre progress
        
        if (i + CAMPAIGN_CONFIG.batchSize < contacts.length) {
          console.log(`⏳ Venter ${CAMPAIGN_CONFIG.batchDelay / 1000}s før neste batch...`);
          await sleep(CAMPAIGN_CONFIG.batchDelay);
        }
      }
      break;

    case '--stats':
      const stats = getStats(loadContacts());
      console.log('\n📊 KAMPANJE-STATISTIKK');
      console.log('====================');
      console.log(`Totalt kontakter: ${stats.total}`);
      console.log(`Sendt: ${stats.sent}`);
      console.log(`Åpnet: ${stats.opened} (${((stats.opened / stats.sent) * 100 || 0).toFixed(1)}%)`);
      console.log(`Klikket: ${stats.clicked} (${((stats.clicked / stats.sent) * 100 || 0).toFixed(1)}%)`);
      console.log(`Bounced: ${stats.bounced}`);
      console.log(`Avmeldt: ${stats.unsubscribed}`);
      console.log(`Konvertering: ${stats.conversionRate.toFixed(2)}%`);
      break;

    case '--reset':
      if (fs.existsSync(DB_PATH)) {
        fs.unlinkSync(DB_PATH);
        console.log('🗑️ Kampanjedata slettet');
      }
      break;

    default:
      console.log(`
🚀 E-POST KAMPANJE - 100 STUDENTER PÅ 24 TIMER

Bruk:
  --import <csv>     Importer LinkedIn CSV
  --send             Send e-poster til ventende kontakter
  --stats            Vis statistikk
  --reset            Slett all kampanjedata

Eksempel:
  node scripts/email-campaign/index.ts --import ~/Downloads/linkedin.csv
  node scripts/email-campaign/index.ts --send
  node scripts/email-campaign/index.ts --stats
      `);
  }
}

main().catch(console.error);
