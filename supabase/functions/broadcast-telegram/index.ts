/**
 * Telegram Broadcast Edge Function
 * Broadcasts trading signals to Telegram channels
 * 
 * Features:
 * - Post signals to free channel (with delay)
 * - Post signals instantly to VIP channels
 * - Format signal messages with emojis
 * - Track broadcast history
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Format signal message
function formatSignalMessage(signal: any, isVip: boolean = false): string {
  const directionEmoji = signal.direction === 'long' ? '🟢' : '🔴';
  const directionText = signal.direction === 'long' ? 'LONG' : 'SHORT';
  const vipBadge = isVip ? '⭐ VIP ' : '';
  
  let message = `${vipBadge}${directionEmoji} <b>SIGNAL: ${signal.symbol} ${directionText}</b> ${directionEmoji}\n\n`;
  
  // Entry
  message += `📍 <b>Entry:</b> ${signal.entry_price}\n`;
  
  // Stop Loss
  if (signal.stop_loss) {
    message += `🛑 <b>Stop Loss:</b> ${signal.stop_loss}\n`;
  }
  
  // Take Profit
  if (signal.take_profit) {
    message += `🎯 <b>Take Profit:</b> ${signal.take_profit}\n`;
  }
  
  // Confidence
  if (signal.confidence) {
    const confidenceEmoji = signal.confidence >= 80 ? '🔥' : signal.confidence >= 60 ? '⚡' : '⚠️';
    message += `\n${confidenceEmoji} <b>Confidence:</b> ${signal.confidence}%\n`;
  }
  
  // Analysis
  if (signal.analysis) {
    message += `\n📝 <b>Analysis:</b>\n${signal.analysis.substring(0, 200)}${signal.analysis.length > 200 ? '...' : ''}\n`;
  }
  
  // Risk warning for free users
  if (!isVip) {
    message += `\n⚠️ <i>Trading involves risk. This is not financial advice.</i>\n`;
  }
  
  // CTA
  message += `\n👉 <a href="https://klarpakke.no/app/signals">Følg i app</a>`;
  
  if (!isVip) {
    message += `\n💎 <a href="https://klarpakke.no/pricing">Oppgrader til VIP for real-time signals</a>`;
  }
  
  return message;
}

// Send message to Telegram
async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<any> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Telegram API error: ${error.description || response.statusText}`);
  }
  
  return response.json();
}

// Record broadcast in database
async function recordBroadcast(
  supabase: any,
  signalId: string,
  channelType: string,
  telegramMessageId: string,
  delayMinutes: number = 0
): Promise<void> {
  await supabase
    .from('signal_broadcasts')
    .insert({
      signal_id: signalId,
      channel_type: channelType,
      telegram_message_id: telegramMessageId,
      delay_minutes: delayMinutes,
      broadcast_at: new Date().toISOString(),
    });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    // Get channel IDs from environment
    const channels = {
      free: Deno.env.get('TELEGRAM_FREE_CHANNEL') || '@klarpakke_free',
      vip: Deno.env.get('TELEGRAM_VIP_CHANNEL') || '@klarpakke_vip',
    };

    const body = await req.json();
    const { signal_id, signal: signalData, immediate = false } = body;

    if (!signal_id && !signalData) {
      return new Response(
        JSON.stringify({ error: 'Missing signal_id or signal data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch signal if only ID provided
    let signal = signalData;
    if (!signal && signal_id) {
      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .eq('id', signal_id)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Signal not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      signal = data;
    }

    // Check if already broadcasted
    const { data: existingBroadcasts } = await supabase
      .from('signal_broadcasts')
      .select('*')
      .eq('signal_id', signal.id);

    const hasFreeBroadcast = existingBroadcasts?.some((b: any) => b.channel_type === 'free');
    const hasVipBroadcast = existingBroadcasts?.some((b: any) => b.channel_type === 'vip');

    const results = {
      free: null as any,
      vip: null as any,
    };

    // Broadcast to VIP channel (instant)
    if (!hasVipBroadcast) {
      const vipMessage = formatSignalMessage(signal, true);
      const vipResult = await sendTelegramMessage(botToken, channels.vip, vipMessage);
      results.vip = vipResult;
      
      await recordBroadcast(
        supabase,
        signal.id,
        'vip',
        vipResult.result.message_id.toString(),
        0
      );
    }

    // Broadcast to free channel (with delay unless immediate)
    if (!hasFreeBroadcast) {
      const freeMessage = formatSignalMessage(signal, false);
      
      if (immediate) {
        // Send immediately (for testing)
        const freeResult = await sendTelegramMessage(botToken, channels.free, freeMessage);
        results.free = freeResult;
        
        await recordBroadcast(
          supabase,
          signal.id,
          'free',
          freeResult.result.message_id.toString(),
          0
        );
      } else {
        // Schedule delayed broadcast (30 minutes)
        // In production, you'd use a job queue like Inngest or QStash
        // For now, we'll store the scheduled broadcast
        const scheduledTime = new Date(Date.now() + 30 * 60 * 1000);
        
        await supabase
          .from('scheduled_broadcasts')
          .insert({
            signal_id: signal.id,
            channel_type: 'free',
            scheduled_for: scheduledTime.toISOString(),
            message: freeMessage,
          });

        results.free = { scheduled: true, scheduled_for: scheduledTime.toISOString() };
      }
    }

    // Update signal as broadcasted
    await supabase
      .from('signals')
      .update({
        broadcasted_at: new Date().toISOString(),
        broadcasted: true,
      })
      .eq('id', signal.id);

    return new Response(
      JSON.stringify({
        success: true,
        signal_id: signal.id,
        broadcasts: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Telegram broadcast error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
