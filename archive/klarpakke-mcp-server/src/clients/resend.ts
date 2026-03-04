/**
 * Enhanced Resend Integration - Email Campaigns, Templates, and Analytics
 */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'post@klarpakke.no';
const REPLY_TO_EMAIL = Deno.env.get('REPLY_TO_EMAIL') || 'support@klarpakke.no';

if (!RESEND_API_KEY) {
  console.warn('RESEND_API_KEY not set - email tools will be disabled');
}

const RESEND_API = 'https://api.resend.com';

interface EmailRecipient {
  email: string;
  first_name?: string;
  last_name?: string;
  unsubscribe_token?: string;
  [key: string]: any;
}

async function resendFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!RESEND_API_KEY) {
    throw new Error('Resend not configured');
  }

  const url = `${RESEND_API}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// ==================== EMAIL SENDING ====================

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: string; // base64
  }>;
  tags?: Array<{ name: string; value: string }>;
}

export interface EmailResponse {
  id: string;
}

export async function sendEmail(options: EmailOptions): Promise<EmailResponse> {
  const body: any = {
    from: options.from || `Klarpakke <${FROM_EMAIL}>`,
    to: Array.isArray(options.to) ? options.to : [options.to],
    subject: options.subject,
    html: options.html,
  };

  if (options.text) body.text = options.text;
  if (options.replyTo) body.reply_to = options.replyTo;
  if (options.cc) body.cc = Array.isArray(options.cc) ? options.cc : [options.cc];
  if (options.bcc) body.bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
  if (options.attachments) body.attachments = options.attachments;
  if (options.tags) body.tags = options.tags;

  return resendFetch('/emails', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function sendBatchEmails(
  recipients: EmailRecipient[],
  template: (data: EmailRecipient) => { subject: string; html: string; text?: string },
  batchSize: number = 100,
  delayMs: number = 1000
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map(async (recipient) => {
        const { subject, html, text } = template(recipient);
        return sendEmail({
          to: recipient.email,
          subject,
          html,
          text,
          tags: [{ name: 'campaign', value: 'batch' }],
        });
      })
    );

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        sent++;
      } else {
        failed++;
        errors.push(`${batch[idx].email}: ${result.reason}`);
      }
    });

    // Rate limiting delay between batches
    if (i + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { sent, failed, errors };
}

// ==================== TEMPLATES ====================

const TEMPLATES: Record<string, (data: EmailRecipient & Record<string, any>) => { subject: string; html: string; text: string }> = {
  welcome: (data) => ({
    subject: 'Velkommen til Klarpakke Universitet! 🎓',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Velkommen til Klarpakke</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { background: #fff; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 14px 28px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .tokens { background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .tokens strong { color: #667eea; font-size: 24px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 Velkommen til Klarpakke!</h1>
    </div>
    <div class="content">
      <p>Hei ${data.first_name || 'der'}!</p>
      <p>Takk for at du ble med som en av de første 100 grunnleggerne ved Klarpakke Universitet!</p>
      
      <div class="tokens">
        <p>🎁 Din velkomstbonus:</p>
        <strong>10,000 KLT tokens</strong>
        <p>Verdt ~1,000 NOK</p>
      </div>
      
      <p>Som grunnlegger får du:</p>
      <ul>
        <li>✅ Lifetime prioritert support</li>
        <li>✅ Early access til nye kurs</li>
        <li>✅ Gratis paper trading for alltid</li>
        <li>✅ Beta-tilgang til auto-trading</li>
      </ul>
      
      <a href="https://www.klarpakke.no/no/dashboard" class="button">Gå til Dashboard</a>
      
      <p>Har du spørsmål? Svar på denne e-posten eller kontakt oss på post@klarpakke.no</p>
      
      <p>Vi gleder oss til å se deg i klassen!<br>Teamet bak Klarpakke</p>
    </div>
    <div class="footer">
      <p>Klarpakke AS • post@klarpakke.no</p>
      <p><a href="https://www.klarpakke.no/no/personvern">Personvern</a> • 
         <a href="{{unsubscribe_url}}">Avmelding</a></p>
    </div>
  </div>
</body>
</html>`,
    text: `Hei ${data.first_name || 'der'}!

Takk for at du ble med som en av de første 100 grunnleggerne ved Klarpakke Universitet!

Din velkomstbonus: 10,000 KLT tokens (verdt ~1,000 NOK)

Som grunnlegger får du:
- Lifetime prioritert support
- Early access til nye kurs
- Gratis paper trading for alltid
- Beta-tilgang til auto-trading

Gå til din profil: https://www.klarpakke.no/no/dashboard

Har du spørsmål? Kontakt oss på post@klarpakke.no

Vi gleder oss til å se deg i klassen!
Teamet bak Klarpakke`,
  }),

  reminder: (data) => ({
    subject: 'Fortsett din krypto-reise med Klarpakke',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; }
    .button { display: inline-block; padding: 14px 28px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; }
    .highlight { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>Hei ${data.first_name || 'der'}! 👋</h1>
  <p>Vi savner deg på Klarpakke Universitet!</p>
  
  <div class="highlight">
    <strong>Det er fortsatt ${data.spots_left || '100'} grunnlegger-plasser igjen.</strong>
    Sikre deg din plass nå!
  </div>
  
  <p>Hva venter du på?</p>
  <a href="https://www.klarpakke.no/no/opptak" class="button">Fullfør Påmeldingen</a>
  
  <p>Spørsmål? Svar på denne e-posten.</p>
</body>
</html>`,
    text: `Hei ${data.first_name || 'der'}!

Vi savner deg på Klarpakke Universitet!

Det er fortsatt ${data.spots_left || '100'} grunnlegger-plasser igjen. Sikre deg din plass nå!

Fullfør påmeldingen: https://www.klarpakke.no/no/opptak

Spørsmål? Svar på denne e-posten.`,
  }),

  feedback: (data) => ({
    subject: 'Hvordan går det med din trading?',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 14px 28px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; }
  </style>
</head>
<body>
  <h1>Hei ${data.first_name || 'Student'}! 📊</h1>
  <p>Vi vil gjerne høre om din erfaring med Klarpakke så langt.</p>
  
  <p>Hvilke kurs har du prøvd? Hva synes du om paper trading?</p>
  
  <a href="https://www.klarpakke.no/no/feedback" class="button">Del Din Tilbakemelding</a>
  
  <p>Din mening hjelper oss å bli bedre!</p>
</body>
</html>`,
    text: `Hei ${data.first_name || 'Student'}!

Vi vil gjerne høre om din erfaring med Klarpakke så langt.

Hvilke kurs har du prøvd? Hva synes du om paper trading?

Del din tilbakemelding: https://www.klarpakke.no/no/feedback

Din mening hjelper oss å bli bedre!`,
  }),

  announcement: (data) => ({
    subject: data.subject || 'Nyheter fra Klarpakke',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { line-height: 1.6; }
    .button { display: inline-block; padding: 14px 28px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="content">
    ${data.content || data.html || '<p>Ny oppdatering fra Klarpakke!</p>'}
  </div>
</body>
</html>`,
    text: data.text || data.content || 'Ny oppdatering fra Klarpakke!',
  }),
};

export function getTemplate(name: string): typeof TEMPLATES[string] | undefined {
  return TEMPLATES[name];
}

export function getAvailableTemplates(): string[] {
  return Object.keys(TEMPLATES);
}

export function renderTemplate(
  templateName: string,
  data: EmailRecipient & Record<string, any>
): { subject: string; html: string; text: string } {
  const template = TEMPLATES[templateName];
  if (!template) {
    throw new Error(`Unknown template: ${templateName}`);
  }
  return template(data);
}

// ==================== AUDIENCES (Beta) ====================

export interface Audience {
  id: string;
  name: string;
  created_at: string;
}

export async function listAudiences(): Promise<Audience[]> {
  return resendFetch('/audiences');
}

export async function createAudience(name: string): Promise<Audience> {
  return resendFetch('/audiences', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

// ==================== CONTACTS (Beta) ====================

export interface Contact {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  unsubscribed: boolean;
  created_at: string;
}

export async function listContacts(audienceId: string): Promise<Contact[]> {
  const result = await resendFetch<{ data: Contact[] }>(`/audiences/${audienceId}/contacts`);
  return result.data;
}

export async function addContact(audienceId: string, contact: Partial<Contact>): Promise<Contact> {
  return resendFetch(`/audiences/${audienceId}/contacts`, {
    method: 'POST',
    body: JSON.stringify(contact),
  });
}

export async function removeContact(audienceId: string, contactId: string): Promise<void> {
  await resendFetch(`/audiences/${audienceId}/contacts/${contactId}`, {
    method: 'DELETE',
  });
}

// ==================== ANALYTICS ====================

export interface EmailAnalytics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
}

export async function getEmailAnalytics(emailId: string): Promise<EmailAnalytics> {
  return resendFetch(`/emails/${emailId}/analytics`);
}

export async function getDomainStats(): Promise<{
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
}> {
  // Resend doesn't have a direct domain stats endpoint
  // You would typically aggregate from your own database
  // This is a placeholder for future Resend API updates
  return {
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    complained: 0,
  };
}

// ==================== DOMAINS ====================

export interface Domain {
  id: string;
  name: string;
  status: 'pending' | 'verified' | 'failed';
  created_at: string;
  region?: string;
}

export async function listDomains(): Promise<Domain[]> {
  const result = await resendFetch<{ data: Domain[] }>('/domains');
  return result.data;
}

export async function addDomain(name: string, region: string = 'eu-central-1'): Promise<Domain> {
  return resendFetch('/domains', {
    method: 'POST',
    body: JSON.stringify({ name, region }),
  });
}

export async function verifyDomain(domainId: string): Promise<Domain> {
  return resendFetch(`/domains/${domainId}/verify`, {
    method: 'POST',
  });
}

export async function getDomainVerification(domainId: string): Promise<any> {
  return resendFetch(`/domains/${domainId}`);
}

// ==================== API KEYS ====================

export async function getApiKeys(): Promise<Array<{ id: string; name: string; created_at: string }>> {
  const result = await resendFetch<{ data: any[] }>('/api-keys');
  return result.data;
}

// ==================== CAMPAIGN MANAGEMENT ====================

export interface Campaign {
  id: string;
  name: string;
  audience: 'all' | 'founders' | 'inactive' | 'custom';
  template: string;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  created_at: string;
  sent_at?: string;
}

// Store campaigns in your database
import { getSupabase } from './supabase.ts';

export async function saveCampaign(campaign: Omit<Campaign, 'id'>): Promise<Campaign> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('email_campaigns')
    .insert([campaign])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateCampaignStats(
  campaignId: string,
  stats: Partial<Campaign>
): Promise<void> {
  const supabase = getSupabase();
  await supabase
    .from('email_campaigns')
    .update(stats)
    .eq('id', campaignId);
}

// ==================== BROADCASTS (Beta) ====================

export interface Broadcast {
  id: string;
  audience_id: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  status: 'draft' | 'queued' | 'sent';
  sent_at?: string;
  created_at: string;
}

export async function createBroadcast(broadcast: Omit<Broadcast, 'id' | 'status' | 'created_at'>): Promise<Broadcast> {
  return resendFetch('/broadcasts', {
    method: 'POST',
    body: JSON.stringify(broadcast),
  });
}

export async function sendBroadcast(broadcastId: string): Promise<void> {
  await resendFetch(`/broadcasts/${broadcastId}/send`, {
    method: 'POST',
  });
}
