/**
 * Token Management Tools - KLT token operations
 */

import { getSupabase } from '../clients/supabase.ts';
import type { ToolOutput } from '../types.ts';

export async function awardKLTTokens(args: {
  user_id: string;
  amount: number;
  reason: string;
}): Promise<ToolOutput> {
  const supabase = getSupabase();
  
  try {
    // Validate amount
    if (args.amount <= 0 || args.amount > 1000000) {
      return {
        content: [{ type: 'text', text: '❌ Amount must be between 1 and 1,000,000 KLT' }],
        isError: true,
      };
    }
    
    // Get user info
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', args.user_id)
      .single();
    
    if (userError || !user) {
      return {
        content: [{ type: 'text', text: `❌ User not found: ${args.user_id}` }],
        isError: true,
      };
    }
    
    // Get current balance
    const { data: balanceData } = await supabase
      .from('klt_balances')
      .select('balance')
      .eq('user_id', args.user_id)
      .single();
    
    const currentBalance = balanceData?.balance || 0;
    const newBalance = currentBalance + args.amount;
    
    // Update balance
    const { error: balanceError } = await supabase
      .from('klt_balances')
      .upsert({
        user_id: args.user_id,
        balance: newBalance,
        updated_at: new Date().toISOString(),
      });
    
    if (balanceError) throw balanceError;
    
    // Log transaction
    const { error: txError } = await supabase
      .from('klt_transactions')
      .insert([{
        user_id: args.user_id,
        amount: args.amount,
        type: 'award',
        reason: args.reason,
        created_at: new Date().toISOString(),
      }]);
    
    if (txError) throw txError;
    
    return {
      content: [{
        type: 'text',
        text: `🪙 KLT Tokens Awarded!

User: ${user.full_name || user.email}
Amount: +${args.amount.toLocaleString()} KLT
Reason: ${args.reason}

Previous Balance: ${currentBalance.toLocaleString()} KLT
New Balance: ${newBalance.toLocaleString()} KLT`,
      }],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `❌ Error: ${error}` }],
      isError: true,
    };
  }
}

export async function getKLTLeaderboard(): Promise<ToolOutput> {
  const supabase = getSupabase();
  
  try {
    const { data, error } = await supabase
      .from('klt_balances')
      .select('user_id, balance, profiles(email, full_name)')
      .order('balance', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return {
        content: [{ type: 'text', text: '🪙 No KLT holders found.' }],
      };
    }
    
    const leaderboard = (data as any[]).map((h, idx) => {
      const rank = idx + 1;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '  ';
      const name = h.profiles?.full_name || h.profiles?.email?.split('@')[0] || 'Unknown';
      return `${medal} #${rank} ${name.padEnd(20)} ${h.balance.toLocaleString().padStart(10)} KLT`;
    }).join('\n');
    
    // Calculate total supply
    const { data: totalData } = await supabase
      .from('klt_balances')
      .select('balance');
    
    const totalSupply = (totalData || []).reduce((sum, h) => sum + (h.balance || 0), 0);
    
    return {
      content: [{
        type: 'text',
        text: `🏆 KLT Token Leaderboard

${leaderboard}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Supply: ${totalSupply.toLocaleString()} KLT
Holders: ${(totalData || []).length}`,
      }],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `❌ Error: ${error}` }],
      isError: true,
    };
  }
}

export async function createTokenAirdrop(args: {
  audience: string;
  amount_per_user: number;
}): Promise<ToolOutput> {
  const supabase = getSupabase();
  
  try {
    // Validate
    if (args.amount_per_user <= 0 || args.amount_per_user > 10000) {
      return {
        content: [{ type: 'text', text: '❌ Amount per user must be between 1 and 10,000 KLT' }],
        isError: true,
      };
    }
    
    // Build audience query
    let query = supabase.from('profiles').select('id, email');
    
    switch (args.audience) {
      case 'all':
        break;
      case 'founders':
        query = query.eq('role', 'founder');
        break;
      case 'active':
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('last_active', weekAgo.toISOString());
        break;
      default:
        return {
          content: [{ type: 'text', text: `❌ Unknown audience: ${args.audience}. Use: all, founders, active` }],
          isError: true,
        };
    }
    
    const { data: recipients, error } = await query;
    
    if (error) throw error;
    
    const recipientCount = recipients?.length || 0;
    const totalAmount = recipientCount * args.amount_per_user;
    
    // Confirmation required
    return {
      content: [{
        type: 'text',
        text: `⚠️ Token Airdrop Confirmation

Audience: ${args.audience}
Recipients: ${recipientCount}
Amount per user: ${args.amount_per_user} KLT
Total to distribute: ${totalAmount.toLocaleString()} KLT

To confirm airdrop, call again with confirm: true`,
      }],
    };
    
    /* Uncomment to execute:
    // Process airdrop
    let success = 0;
    let failed = 0;
    
    for (const user of recipients || []) {
      try {
        // Get current balance
        const { data: balance } = await supabase
          .from('klt_balances')
          .select('balance')
          .eq('user_id', user.id)
          .single();
        
        const newBalance = (balance?.balance || 0) + args.amount_per_user;
        
        // Update balance
        await supabase
          .from('klt_balances')
          .upsert({
            user_id: user.id,
            balance: newBalance,
            updated_at: new Date().toISOString(),
          });
        
        // Log transaction
        await supabase.from('klt_transactions').insert([{
          user_id: user.id,
          amount: args.amount_per_user,
          type: 'airdrop',
          reason: `Airdrop to ${args.audience}`,
          created_at: new Date().toISOString(),
        }]);
        
        success++;
      } catch (e) {
        failed++;
      }
    }
    
    return {
      content: [{
        type: 'text',
        text: `🪙 Airdrop Complete!

Distributed: ${success * args.amount_per_user} KLT
Recipients: ${success}
Failed: ${failed}`,
      }],
    };
    */
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `❌ Error: ${error}` }],
      isError: true,
    };
  }
}

export async function getUserTokenBalance(args: { user_id: string }): Promise<ToolOutput> {
  const supabase = getSupabase();
  
  try {
    const { data: user } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', args.user_id)
      .single();
    
    const { data: balance } = await supabase
      .from('klt_balances')
      .select('balance')
      .eq('user_id', args.user_id)
      .single();
    
    const { data: transactions } = await supabase
      .from('klt_transactions')
      .select('*')
      .eq('user_id', args.user_id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    return {
      content: [{
        type: 'text',
        text: `🪙 KLT Balance for ${user?.full_name || user?.email}

Current Balance: ${balance?.balance || 0} KLT

Recent Transactions:
${(transactions || []).map((tx: any) => 
  `  ${tx.type === 'award' ? '+' : '-'}${tx.amount} - ${tx.reason} (${new Date(tx.created_at).toLocaleDateString()})`
).join('\n') || 'No transactions'}`,
      }],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `❌ Error: ${error}` }],
      isError: true,
    };
  }
}
