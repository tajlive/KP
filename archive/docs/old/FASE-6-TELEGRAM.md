# FASE 6: TELEGRAM BOT

**Estimert tid:** 6 timer  
**Mål:** Telegram bot @klarpakke_bot med LaunchPass integrasjon

---

## Task 6.1: Bot Setup

### Opprett Telegram Bot

1. Åpne Telegram og søk etter @BotFather
2. Start chat og send `/newbot`
3. Følg instruksjonene:
   - Navn: `Klarpakke Bot`
   - Username: `klarpakke_bot` (må ende på 'bot')
4. Motta token: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

### Hent Chat IDs

1. Legg til @getidsbot i din gruppesamtale
2. Få Chat ID for:
   - #alerts kanal
   - #premium gruppe
   - #vip ekstrem gruppe

### Environment Variables

```bash
# Legg til i .env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_ALERTS_CHAT_ID=-1001234567890
TELEGRAM_PREMIUM_CHAT_ID=-1001234567891
TELEGRAM_VIP_CHAT_ID=-1001234567892
```

---

## Task 6.2: Edge Function: telegram-webhook

**Fil:** `supabase/functions/telegram-webhook/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  const update = await req.json();
  
  // Handle different update types
  if (update.message) {
    await handleMessage(update.message);
  } else if (update.callback_query) {
    await handleCallback(update.callback_query);
  }
  
  return new Response('OK', { status: 200 });
};

async function handleMessage(message: any) {
  const chatId = message.chat.id;
  const text = message.text || '';
  const username = message.from?.username;
  
  // Start command
  if (text === '/start') {
    await sendMessage(chatId, 
      `👋 Velkommen til Klarpakke!\n\n` +
      `Jeg er din trading-assistent. Her er kommandoene:\n\n` +
      `/konto - Se din konto-info\n` +
      `/signaler - Se siste signaler\n` +
      `/paper - Se paper trading status\n` +
      `/hjelp - Vis denne hjelpen\n\n` +
      `🔗 Koble konto: /link`
    );
    return;
  }
  
  // Account info
  if (text === '/konto') {
    await handleAccountCommand(chatId, username);
    return;
  }
  
  // Signals
  if (text === '/signaler') {
    await handleSignalsCommand(chatId, username);
    return;
  }
  
  // Paper trading
  if (text === '/paper') {
    await handlePaperCommand(chatId, username);
    return;
  }
  
  // Link account
  if (text.startsWith('/link')) {
    await handleLinkCommand(chatId, username, text);
    return;
  }
  
  // Default
  await sendMessage(chatId, 
    `Ukjent kommando. Send /hjelp for å se tilgjengelige kommandoer.`
  );
}

async function handleAccountCommand(chatId: number, username: string | undefined) {
  if (!username) {
    await sendMessage(chatId, 'Du må ha et Telegram username for å bruke denne funksjonen.');
    return;
  }
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // Find user by telegram username
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('telegram_username', username)
    .single();
  
  if (!profile) {
    await sendMessage(chatId, 
      `❌ Ingen konto funnet for @${username}\n\n` +
      `Koble kontoen din med: /link DINEPOST@EMAIL.COM`
    );
    return;
  }
  
  const tierEmoji = {
    'free': '⚪',
    'standard': '🟢',
    'pro': '🔵',
    'premium': '🟡',
    'elite': '👑'
  };
  
  const daysRemaining = profile.trial_ends_at 
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  
  await sendMessage(chatId,
    `${tierEmoji[profile.subscription_tier as keyof typeof tierEmoji]} *Din Klarpakke Konto*\n\n` +
    `Tier: ${profile.subscription_tier.toUpperCase()}\n` +
    `Status: ${profile.subscription_status}\n` +
    `Prøveperiode: ${daysRemaining} dager igjen\n` +
    `Discord: ${profile.discord_connected ? '✅ Koblet' : '❌ Ikke koblet'}`
  );
}

async function handleSignalsCommand(chatId: number, username: string | undefined) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // Get latest signals
  const { data: signals } = await supabase
    .from('trading_signals')
    .select('*')
    .eq('status', 'active')
    .order('published_at', { ascending: false })
    .limit(5);
  
  if (!signals || signals.length === 0) {
    await sendMessage(chatId, '📭 Ingen aktive signaler for øyeblikket.');
    return;
  }
  
  let message = '*Siste Trading Signaler*\n\n';
  
  for (const s of signals) {
    const emoji = s.direction === 'buy' || s.direction === 'long' ? '🟢' : '🔴';
    const type = s.signal_type === 'futures' ? 'FUTURES' : 'SPOT';
    message += `${emoji} *${type}* ${s.ticker} ${s.direction.toUpperCase()}\n`;
    message += `   Entry: $${s.entry_price} | SL: $${s.stop_loss}\n\n`;
  }
  
  message += 'Se full analyse: https://klarpakke.no/app/signals';
  
  await sendMessage(chatId, message);
}

async function handlePaperCommand(chatId: number, username: string | undefined) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // Find user
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('telegram_username', username)
    .single();
  
  if (!profile) {
    await sendMessage(chatId, '❌ Koble kontoen din først: /link');
    return;
  }
  
  // Get paper account
  const { data: account } = await supabase
    .from('paper_accounts')
    .select('*')
    .eq('user_id', profile.user_id)
    .single();
  
  // Get open positions
  const { data: positions } = await supabase
    .from('paper_positions')
    .select('*')
    .eq('user_id', profile.user_id)
    .eq('status', 'open');
  
  const openPnl = positions?.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0) || 0;
  
  await sendMessage(chatId,
    `📊 *Paper Trading Konto*\n\n` +
    `Balance: $${account?.current_balance?.toLocaleString() || '100,000'}\n` +
    `Realisert P/L: $${account?.total_realized_pnl?.toLocaleString() || '0'}\n` +
    `Åpen P/L: $${openPnl.toLocaleString()}\n` +
    `Åpne posisjoner: ${positions?.length || 0}\n\n` +
    `Se detaljer: https://klarpakke.no/app/dashboard`
  );
}

async function handleLinkCommand(chatId: number, username: string | undefined, text: string) {
  if (!username) {
    await sendMessage(chatId, 'Du må ha et Telegram username for å koble kontoen.');
    return;
  }
  
  const parts = text.split(' ');
  if (parts.length < 2) {
    await sendMessage(chatId, 
      `📧 Bruk: /link DINEPOST@EMAIL.COM\n\n` +
      `Vi sender deg en koblingslenke på e-post.`
    );
    return;
  }
  
  const email = parts[1];
  
  // Store pending link
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  await supabase
    .from('telegram_pending_links')
    .upsert({
      telegram_username: username,
      email: email,
      chat_id: chatId,
      created_at: new Date().toISOString()
    });
  
  // Send email with verification link (via edge function)
  await supabase.functions.invoke('send-telegram-link-email', {
    body: { email, telegram_username: username }
  });
  
  await sendMessage(chatId, 
    `✅ Koblingsforespørsel sendt!\n\n` +
    `Sjekk e-posten din (${email}) for å bekrefte koblingen.`
  );
}

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    })
  });
}

async function handleCallback(query: any) {
  // Handle inline button callbacks
  const data = query.data;
  // Implementation for callbacks
}
```

### Sett Webhook

```bash
# Deploy function first
supabase functions deploy telegram-webhook

# Set webhook URL
WEBHOOK_URL="https://your-project.functions.supabase.co/telegram-webhook"

curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${WEBHOOK_URL}\"}"

# Verify webhook
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

---

## Task 6.3: LaunchPass Integration

### LaunchPass Setup

1. Gå til [launchpass.com](https://launchpass.com)
2. Koble til din Stripe-konto
3. Sett opp 3 nivåer:
   - PREMIUM: 1000 kr/mnd → #premium gruppe
   - ELITE: 1500 kr/mnd → #vip ekstrem gruppe

### LaunchPass Webhook Handler

**Fil:** `supabase/functions/launchpass-webhook/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  // Verify LaunchPass signature (if provided)
  const signature = req.headers.get('x-launchpass-signature');
  // TODO: Implement signature verification
  
  const payload = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  switch (payload.event) {
    case 'member.added': {
      // User subscribed and joined Telegram
      const { user_id, tier, telegram_username } = payload;
      
      // Update profile
      await supabase
        .from('profiles')
        .update({
          subscription_tier: tier === 'elite' ? 'vip_ekstrem' : tier,
          telegram_username: telegram_username,
          telegram_connected: true
        })
        .eq('user_id', user_id);
      
      // Send welcome message
      await sendTelegramWelcome(telegram_username, tier);
      break;
    }
    
    case 'member.removed': {
      // User cancelled or failed payment
      const { user_id, telegram_username } = payload;
      
      await supabase
        .from('profiles')
        .update({
          subscription_tier: 'free',
          telegram_connected: false
        })
        .eq('user_id', user_id);
      
      break;
    }
  }
  
  return new Response(JSON.stringify({ received: true }), { status: 200 });
};

async function sendTelegramWelcome(username: string, tier: string) {
  const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  
  const tierEmoji = {
    'premium': '🌟',
    'elite': '👑'
  };
  
  // Get user chat ID
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const { data: link } = await supabase
    .from('telegram_pending_links')
    .select('chat_id')
    .eq('telegram_username', username)
    .single();
  
  if (link?.chat_id) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: link.chat_id,
        text: `${tierEmoji[tier as keyof typeof tierEmoji]} *Velkommen til Klarpakke ${tier.toUpperCase()}!*\n\n` +
              `Du har nå tilgang til alle ${tier}-funksjonene.\n\n` +
              `Kommandoer:\n` +
              `/signaler - Se trading signaler\n` +
              `/paper - Sjekk paper trading\n` +
              `/konto - Din konto-info`,
        parse_mode: 'Markdown'
      })
    });
  }
}
```

---

## Task 6.4: Telegram Notifications

### Signal Alert Template

```typescript
// Add to publish-signal edge function

async function sendSignalToTelegram(signal: any) {
  const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  
  const emoji = signal.direction === 'buy' || signal.direction === 'long' ? '🟢' : '🔴';
  const type = signal.signal_type === 'futures' ? 'FUTURES' : 'SPOT';
  
  const message = `${emoji} *${type} SIGNAL: ${signal.ticker}*\n\n` +
    `📊 *${signal.direction.toUpperCase()}* @ $${signal.entry_price}\n\n` +
    `🎯 Target: $${signal.target_price}\n` +
    `🛑 Stop Loss: $${signal.stop_loss}\n` +
    `⚡ Leverage: ${signal.leverage_suggestion || 1}x\n` +
    `📈 Confidence: ${signal.confidence?.toUpperCase()}\n\n` +
    `${signal.analysis?.substring(0, 300)}...\n\n` +
    `⏰ Publisert: ${new Date(signal.published_at).toLocaleString('nb-NO')}`;
  
  // Send to #alerts channel
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: Deno.env.get('TELEGRAM_ALERTS_CHAT_ID'),
      text: message,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '📊 Se Analyse', url: `https://klarpakke.no/app/signals/${signal.id}` },
          { text: '📝 Paper Trade', url: `https://klarpakke.no/app/dashboard?newTrade=${signal.id}` }
        ]]
      }
    })
  });
  
  // Send to #premium if futures
  if (signal.signal_type === 'futures') {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: Deno.env.get('TELEGRAM_PREMIUM_CHAT_ID'),
        text: message,
        parse_mode: 'Markdown'
      })
    });
  }
}
```

---

## VERIFIKASJON

### Test bot

```bash
# 1. Send test message
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "YOUR_CHAT_ID",
    "text": "🧪 Test melding fra Klarpakke"
  }'

# 2. Test webhook
curl -X POST "${SUPABASE_URL}/functions/v1/telegram-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "chat": {"id": 123456},
      "text": "/start",
      "from": {"username": "testuser"}
    }
  }'
```

---

## LEVERANSE

Etter FASE 6 skal du ha:

- [ ] @klarpakke_bot opprettet og konfigurert
- [ ] telegram-webhook edge function
- [ ] launchpass-webhook edge function
- [ ] Kommandoer: /start, /konto, /signaler, /paper, /link
- [ ] Signal alerts til Telegram
- [ ] LaunchPass integrasjon for VIP grupper

---

## NESTE STEG

Gå til **FASE 7: Referral System** → `docs/FASE-7-REFERRAL.md`

---

*Sist oppdatert: 31. januar 2026*  
*Blyt AS - Org.nr. 929003292*
